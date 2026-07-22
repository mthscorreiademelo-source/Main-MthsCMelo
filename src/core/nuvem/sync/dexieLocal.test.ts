// Testes de integração do LocalStore da sync sobre o Dexie real, rodando em
// IndexedDB falso (Node). Travam a semântica de LWW, tombstones, preservação
// de blob no pull e o round-trip de backup — o miolo onde bugs de sync moram.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, exportarBackup, importarBackup } from '../../db/db'
import { localDexie } from './dexieLocal'
import { agendarReconciliacao } from './sujos'
import type { LinhaDoc } from './engine'
import type { Task } from '../../../modules/tarefas/types'

/** Zera o estado de "sujos" fazendo uma coleta completa (que limpa o set). */
async function limparEstadoSync() {
  agendarReconciliacao()
  await localDexie.coletarPendentes()
}

async function limparTudo() {
  await Promise.all(db.tables.map((t) => t.clear()))
}

/** Força uma varredura completa e coleta as pendências. */
async function coletar() {
  agendarReconciliacao()
  return localDexie.coletarPendentes()
}

function tarefa(id: string, atualizadoEm: number, extra: Record<string, unknown> = {}): Task {
  return { id, titulo: `t-${id}`, feito: false, atualizadoEm, ...extra } as unknown as Task
}

beforeEach(async () => {
  await limparTudo()
})

describe('aplicarRemoto (LWW)', () => {
  it('remoto mais novo vence: aplica o doc e atualiza o espelho', async () => {
    await db.tasks.add(tarefa('a', 100))
    const linha: LinhaDoc = { colecao: 'tasks', id: 'a', doc: tarefa('a', 200, { titulo: 'novo' }), atualizadoEm: 200, excluido: false }
    const n = await localDexie.aplicarRemoto([linha])
    expect(n).toBe(1)
    expect((await db.tasks.get('a'))?.titulo).toBe('novo')
    expect((await db.espelho.get('tasks:a'))?.atualizadoEm).toBe(200)
  })

  it('local mais novo vence: mantém o local e registra o valor do servidor no espelho (para reenviar)', async () => {
    await db.tasks.add(tarefa('a', 200, { titulo: 'meu' }))
    const linha: LinhaDoc = { colecao: 'tasks', id: 'a', doc: tarefa('a', 100, { titulo: 'antigo' }), atualizadoEm: 100, excluido: false }
    await localDexie.aplicarRemoto([linha])
    expect((await db.tasks.get('a'))?.titulo).toBe('meu') // não foi sobrescrito
    expect((await db.espelho.get('tasks:a'))?.atualizadoEm).toBe(100) // servidor anotado
    // e a nossa versão fica pendente de reenvio (at local 200 ≠ espelho 100)
    const pend = await coletar()
    expect(pend.upserts.find((u) => u.id === 'a')?.atualizadoEm).toBe(200)
  })

  it('exclusão remota mais nova vence: apaga o local e remove o espelho', async () => {
    await db.tasks.add(tarefa('a', 100))
    await db.espelho.put({ chave: 'tasks:a', atualizadoEm: 100 })
    const linha: LinhaDoc = { colecao: 'tasks', id: 'a', doc: { id: 'a' }, atualizadoEm: 200, excluido: true }
    await localDexie.aplicarRemoto([linha])
    expect(await db.tasks.get('a')).toBeUndefined()
    expect(await db.espelho.get('tasks:a')).toBeUndefined()
  })
})

describe('coletarPendentes', () => {
  it('linha local nova (sem espelho) vira upsert', async () => {
    await db.tasks.add(tarefa('a', 100))
    const pend = await coletar()
    expect(pend.upserts.map((u) => u.id)).toContain('a')
    expect(pend.remocoes).toHaveLength(0)
  })

  it('linha sumida do local (mas no espelho) vira tombstone com carimbo fresco', async () => {
    await db.espelho.put({ chave: 'tasks:a', atualizadoEm: 100 })
    const pend = await coletar()
    const t = pend.remocoes.find((r) => r.id === 'a')
    expect(t?.excluido).toBe(true)
    expect(t!.atualizadoEm).toBeGreaterThan(100) // vence cópia velha por LWW
    expect(pend.upserts.find((u) => u.id === 'a')).toBeUndefined()
  })

  it('sem mudança (espelho igual ao local) não gera pendência', async () => {
    await db.tasks.add(tarefa('a', 100))
    await db.espelho.put({ chave: 'tasks:a', atualizadoEm: 100 })
    const pend = await coletar()
    expect(pend.upserts.find((u) => u.id === 'a')).toBeUndefined()
    expect(pend.remocoes.find((r) => r.id === 'a')).toBeUndefined()
  })

  it('após confirmar o tombstone, ele não ressuscita', async () => {
    await db.espelho.put({ chave: 'tasks:a', atualizadoEm: 100 })
    const pend = await coletar()
    await localDexie.confirmarEnviados(pend)
    const pend2 = await coletar()
    expect(pend2.remocoes.find((r) => r.id === 'a')).toBeUndefined()
  })
})

describe('anexos (blob)', () => {
  it('coletarPendentes remove o blob dos metadados enviados', async () => {
    const blob = new Blob(['conteudo'], { type: 'text/plain' })
    await db.arquivos.add({ id: 'f1', nome: 'x', tipo: 'text/plain', tamanho: 8, criadoEm: 1, blob, atualizadoEm: 100 } as never)
    const pend = await coletar()
    const up = pend.upserts.find((u) => u.colecao === 'arquivos' && u.id === 'f1')
    expect(up).toBeTruthy()
    expect((up!.doc as Record<string, unknown>).blob).toBeUndefined()
    expect((up!.doc as Record<string, unknown>).nome).toBe('x')
  })

  it('pull preserva o blob local quando o remoto chega sem ele', async () => {
    const blob = new Blob(['bin'], { type: 'text/plain' })
    await db.arquivos.add({ id: 'f1', nome: 'x', tipo: 'text/plain', tamanho: 3, criadoEm: 1, blob, atualizadoEm: 100 } as never)
    const doc = { id: 'f1', nome: 'renomeado', tipo: 'text/plain', tamanho: 3, criadoEm: 1, atualizadoEm: 200 }
    await localDexie.aplicarRemoto([{ colecao: 'arquivos', id: 'f1', doc, atualizadoEm: 200, excluido: false }])
    const salvo = await db.arquivos.get('f1')
    expect(salvo?.nome).toBe('renomeado') // metadado atualizado
    expect(salvo?.blob).toBeInstanceOf(Blob) // binário preservado
  })
})

describe('modo parcial (set por-registro)', () => {
  it('empurra só as chaves sujas; a reconciliação completa pega o resto', async () => {
    // 'y' entra e é confirmado no espelho → fica "limpo".
    await db.tasks.add(tarefa('y', 5))
    await limparEstadoSync()
    const p1 = await (async () => { agendarReconciliacao(); return localDexie.coletarPendentes() })()
    await localDexie.confirmarEnviados(p1)

    // Drift: mexe no espelho de 'y' sem tocar na tabela nem marcar sujo.
    await db.espelho.put({ chave: 'tasks:y', atualizadoEm: 999 })
    // Escreve 'x' → só 'tasks:x' fica suja.
    await db.tasks.add(tarefa('x', 7))

    // Coleta PARCIAL: vê só 'x', ignora o drift de 'y'.
    const parcial = await localDexie.coletarPendentes()
    expect(parcial.upserts.map((u) => u.id)).toEqual(['x'])
    expect(parcial.remocoes).toEqual([])

    // Reconciliação completa: aí sim reprocessa 'y'.
    agendarReconciliacao()
    const completo = await localDexie.coletarPendentes()
    expect(completo.upserts.map((u) => u.id).sort()).toContain('y')
  })
})

describe('backup round-trip', () => {
  it('exporta, apaga tudo e restaura sem perder dados', async () => {
    await db.tasks.bulkAdd([tarefa('a', 1), tarefa('b', 2)])
    await db.paginas.add({ id: 'p1', titulo: 'nota', blocos: [], atualizadoEm: 3 } as never)
    const backup = await exportarBackup()

    await limparTudo()
    expect(await db.tasks.count()).toBe(0)

    const res = await importarBackup(backup)
    expect(res.tasks).toBe(2)
    expect(await db.tasks.count()).toBe(2)
    expect((await db.tasks.get('a'))?.titulo).toBe('t-a')
    expect(await db.paginas.get('p1')).toBeTruthy()
  })

  it('rejeita arquivo inválido e ignora registro malformado', async () => {
    await expect(importarBackup({ app: 'outro' })).rejects.toThrow()
    // registro sem id é descartado; o válido entra
    const res = await importarBackup({ app: 'vida', tasks: [tarefa('ok', 1), { titulo: 'sem id' } as unknown as Task] })
    expect(res.tasks).toBe(2) // conta o que veio no arquivo
    expect(await db.tasks.get('ok')).toBeTruthy()
    expect(await db.tasks.count()).toBe(1) // só o válido foi gravado
  })
})
