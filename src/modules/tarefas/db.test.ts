// Testes da regra de "duas datas" (Item 4), migração de contexto (Item 9) e
// migração de blocos (Item 12). A migração roda sobre o Dexie real, em
// IndexedDB falso (Node) — mesmo padrão usado em
// core/nuvem/sync/dexieLocal.test.ts.
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../core/db/db'
import type { Contexto } from '../agenda/types'
import {
  blocosFixados,
  concluidasNoDia,
  destravarBlocoTarefa,
  diaEfetivo,
  ehHoje,
  estaAtrasada,
  filtrarHoje,
  filtrarProximas,
  fixarBlocoTarefa,
  migrarBlocosTarefas,
  migrarContextosTarefas,
  moverBlocoFixado,
} from './db'
import type { BlocoTarefa, Task } from './types'

const HOJE = '2026-07-28'

let seq = 0
function tarefa(over: Partial<Task> = {}): Task {
  seq += 1
  return {
    id: over.id ?? `t${seq}`,
    titulo: over.titulo ?? 'tarefa',
    prioridade: over.prioridade ?? 4,
    criadaEm: over.criadaEm ?? 0,
    ordem: over.ordem ?? 0,
    ...over,
  }
}

function contexto(over: Partial<Contexto> & { id: string; nome: string }): Contexto {
  return {
    cor: '#4073ff',
    inicioMin: 0,
    fimMin: 0,
    ordem: 0,
    criadoEm: 0,
    ...over,
  }
}

describe('blocosFixados', () => {
  it('só inclui blocos com fixado:true e data definida', () => {
    const t = tarefa({
      blocos: [
        { id: 'a', data: '2026-08-01', duracaoMin: 30, fixado: true },
        { id: 'b', data: '2026-08-02', duracaoMin: 30, fixado: false },
        { id: 'c', duracaoMin: 30, fixado: true }, // sem data
      ],
    })
    expect(blocosFixados(t).map((b) => b.id)).toEqual(['a'])
  })
})

describe('diaEfetivo', () => {
  it('usa a data do bloco FIXADO mais cedo quando existir', () => {
    const t = tarefa({
      data: '2026-07-20',
      blocos: [
        { id: 'a', data: '2026-08-05', duracaoMin: 30, fixado: true },
        { id: 'b', data: '2026-08-01', duracaoMin: 30, fixado: true },
      ],
    })
    expect(diaEfetivo(t)).toBe('2026-08-01')
  })
  it('ignora blocos NÃO fixados (sugestão viva não conta)', () => {
    const t = tarefa({ data: '2026-07-20', blocos: [{ id: 'a', data: '2026-08-01', duracaoMin: 30, fixado: false }] })
    expect(diaEfetivo(t)).toBe('2026-07-20')
  })
  it('cai pro prazo (data) quando não há bloco fixado', () => {
    expect(diaEfetivo(tarefa({ data: '2026-07-20' }))).toBe('2026-07-20')
  })
  it('undefined quando a tarefa não tem nenhuma das duas datas', () => {
    expect(diaEfetivo(tarefa({}))).toBeUndefined()
  })
})

describe('ehHoje / filtrarHoje (regra de duas datas)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(`${HOJE}T10:00:00`))
  })
  afterEach(() => vi.useRealTimers())

  it('conta como hoje quando ALGUM bloco fixado é hoje, mesmo com outros blocos em outros dias', () => {
    const t = tarefa({
      data: '2026-08-05',
      blocos: [
        { id: 'a', data: '2026-08-10', duracaoMin: 30, fixado: true },
        { id: 'b', data: HOJE, duracaoMin: 30, fixado: true },
      ],
    })
    expect(ehHoje(t)).toBe(true)
  })

  it('conta como hoje quando não há bloco, mas o prazo é hoje', () => {
    expect(ehHoje(tarefa({ data: HOJE }))).toBe(true)
  })

  it('não conta como hoje um bloco NÃO fixado (sugestão viva) de hoje — só aparece na Agenda como fantasma', () => {
    const t = tarefa({ data: '2026-08-05', blocos: [{ id: 'a', data: HOJE, duracaoMin: 30, fixado: false }] })
    expect(ehHoje(t)).toBe(false)
  })

  it('nunca conta atrasada como hoje — atrasada é só pelo prazo', () => {
    const t = tarefa({ data: '2026-07-01' })
    expect(estaAtrasada(t)).toBe(true)
    expect(ehHoje(t)).toBe(false)
  })

  it('nunca conta concluída como hoje', () => {
    expect(ehHoje(tarefa({ data: HOJE, concluidaEm: Date.now() }))).toBe(false)
  })

  it('filtrarHoje exclui atrasadas (elas só aparecem em Atrasadas)', () => {
    const atrasada = tarefa({ id: 'a', data: '2026-07-01' })
    const hoje = tarefa({ id: 'b', data: HOJE })
    expect(filtrarHoje([atrasada, hoje]).map((t) => t.id)).toEqual(['b'])
  })
})

describe('filtrarProximas (agrupa pelo dia efetivo)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(`${HOJE}T10:00:00`))
  })
  afterEach(() => vi.useRealTimers())

  it('usa o bloco fixado quando existir, senão o prazo, pra ordenar/agrupar — e exclui hoje/atrasadas', () => {
    const comBloco = tarefa({
      id: 'a',
      data: '2026-08-10', // prazo (bem depois) — só pra provar que o bloco fixado vence
      blocos: [{ id: 'ba', data: '2026-08-01', duracaoMin: 30, fixado: true }],
    })
    const soComPrazo = tarefa({ id: 'b', data: '2026-08-02' })
    const deHoje = tarefa({ id: 'c', data: HOJE })
    const atrasada = tarefa({ id: 'd', data: '2026-07-01' })
    const lista = filtrarProximas([comBloco, soComPrazo, deHoje, atrasada])
    expect(lista.map((t) => t.id)).toEqual(['a', 'b'])
  })
})

describe('concluidasNoDia', () => {
  it('só inclui conclusões dentro da janela do dia informado', () => {
    const inicioDoDia = new Date('2026-07-15T00:00:00').getTime()
    const meioDoDia = new Date('2026-07-15T12:00:00').getTime()
    const diaSeguinte = new Date('2026-07-16T00:00:00').getTime()
    const t1 = tarefa({ id: '1', concluidaEm: meioDoDia })
    const t2 = tarefa({ id: '2', concluidaEm: diaSeguinte })
    const t3 = tarefa({ id: '3', concluidaEm: inicioDoDia })
    const ids = concluidasNoDia([t1, t2, t3], '2026-07-15')
      .map((t) => t.id)
      .sort()
    expect(ids).toEqual(['1', '3'])
  })
})

describe('migrarContextosTarefas', () => {
  beforeEach(async () => {
    await db.tasks.clear()
  })

  it('casa o texto antigo (`contexto`) pelo nome de um Contexto real, sem acento/caixa', async () => {
    const trabalho = contexto({ id: 'ctx-trabalho', nome: 'Trabalho' })
    await db.tasks.add({ ...tarefa({ id: 't1' }), contexto: 'TRABALHO' } as unknown as Task)
    await db.tasks.add({ ...tarefa({ id: 't2' }), contexto: 'Não bate com nada' } as unknown as Task)
    await db.tasks.add(tarefa({ id: 't3' })) // nunca teve contexto legado

    await migrarContextosTarefas([trabalho])

    expect((await db.tasks.get('t1'))?.contextoId).toBe('ctx-trabalho')
    expect((await db.tasks.get('t2'))?.contextoId).toBeUndefined()
    expect((await db.tasks.get('t3'))?.contextoId).toBeUndefined()
  })

  it('casa ignorando acento (ex.: "Faculdade" com contexto "faculdade")', async () => {
    const faculdade = contexto({ id: 'ctx-fac', nome: 'Faculdade' })
    await db.tasks.add({ ...tarefa({ id: 't4' }), contexto: 'faculdade' } as unknown as Task)
    await migrarContextosTarefas([faculdade])
    expect((await db.tasks.get('t4'))?.contextoId).toBe('ctx-fac')
  })

  it('não sobrescreve um contextoId já definido', async () => {
    const trabalho = contexto({ id: 'ctx-trabalho', nome: 'Trabalho' })
    await db.tasks.add({
      ...tarefa({ id: 't5', contextoId: 'ja-definido' }),
      contexto: 'Trabalho',
    } as unknown as Task)
    await migrarContextosTarefas([trabalho])
    expect((await db.tasks.get('t5'))?.contextoId).toBe('ja-definido')
  })
})

describe('migrarBlocosTarefas', () => {
  // Ambiente de teste é 'node' (sem DOM) — a trava de idempotência usa
  // `localStorage`; stub em memória só pra este bloco, pra poder testar a
  // idempotência de verdade (mesma guarda `typeof localStorage !== 'undefined'`
  // usada em `db.ts`, que no browser real aponta pro localStorage de verdade).
  beforeEach(async () => {
    await db.tasks.clear()
    const mapa = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => mapa.get(k) ?? null,
      setItem: (k: string, v: string) => void mapa.set(k, v),
      removeItem: (k: string) => void mapa.delete(k),
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('transforma blocoData/blocoInicio antigos num único BlocoTarefa já fixado:true', async () => {
    await db.tasks.add({
      ...tarefa({ id: 't1', duracaoMin: 45 }),
      blocoData: '2026-08-01',
      blocoInicio: '14:00',
    } as unknown as Task)

    await migrarBlocosTarefas()

    const t1 = await db.tasks.get('t1')
    expect(t1?.blocos).toHaveLength(1)
    expect(t1?.blocos?.[0]).toMatchObject({ data: '2026-08-01', inicio: '14:00', duracaoMin: 45, fixado: true })
  })

  it('usa uma duração padrão quando a tarefa não tinha duracaoMin', async () => {
    await db.tasks.add({ ...tarefa({ id: 't2' }), blocoData: '2026-08-01', blocoInicio: '09:00' } as unknown as Task)
    await migrarBlocosTarefas()
    const t2 = await db.tasks.get('t2')
    expect(t2?.blocos?.[0].duracaoMin).toBeGreaterThan(0)
  })

  it('tarefa sem blocoData/blocoInicio antigos não ganha blocos', async () => {
    await db.tasks.add(tarefa({ id: 't3' }))
    await migrarBlocosTarefas()
    expect((await db.tasks.get('t3'))?.blocos).toBeUndefined()
  })

  it('não sobrescreve blocos já migrados/existentes', async () => {
    const existente: BlocoTarefa = { id: 'ja-existe', data: '2026-09-01', inicio: '08:00', duracaoMin: 60, fixado: false }
    await db.tasks.add({
      ...tarefa({ id: 't4', blocos: [existente] }),
      blocoData: '2026-08-01',
      blocoInicio: '10:00',
    } as unknown as Task)
    await migrarBlocosTarefas()
    const t4 = await db.tasks.get('t4')
    expect(t4?.blocos).toEqual([existente])
  })

  it('é idempotente: rodar de novo não duplica nem reprocessa', async () => {
    await db.tasks.add({ ...tarefa({ id: 't5' }), blocoData: '2026-08-01', blocoInicio: '10:00' } as unknown as Task)
    await migrarBlocosTarefas()
    const antes = (await db.tasks.get('t5'))?.blocos
    // Simula uma tarefa nova chegando depois da migração já ter "rodado" (trava setada).
    await db.tasks.add({ ...tarefa({ id: 't6' }), blocoData: '2026-09-01', blocoInicio: '11:00' } as unknown as Task)
    await migrarBlocosTarefas()
    expect((await db.tasks.get('t5'))?.blocos).toEqual(antes)
    // t6 não foi processada porque a trava já estava setada.
    expect((await db.tasks.get('t6'))?.blocos).toBeUndefined()
  })
})

describe('fixarBlocoTarefa / destravarBlocoTarefa', () => {
  beforeEach(async () => {
    await db.tasks.clear()
  })

  it('adiciona um bloco novo já fixado quando não passa id', async () => {
    await db.tasks.add(tarefa({ id: 't1' }))
    await fixarBlocoTarefa('t1', { data: '2026-08-01', inicio: '09:00', duracaoMin: 60 })
    const t1 = await db.tasks.get('t1')
    expect(t1?.blocos).toHaveLength(1)
    expect(t1?.blocos?.[0]).toMatchObject({ data: '2026-08-01', inicio: '09:00', duracaoMin: 60, fixado: true })
  })

  it('atualiza o bloco existente quando o id bate', async () => {
    await db.tasks.add(tarefa({ id: 't2', blocos: [{ id: 'b1', data: '2026-08-01', inicio: '09:00', duracaoMin: 30, fixado: false }] }))
    await fixarBlocoTarefa('t2', { id: 'b1', data: '2026-08-02', inicio: '10:00', duracaoMin: 45 })
    const t2 = await db.tasks.get('t2')
    expect(t2?.blocos).toHaveLength(1)
    expect(t2?.blocos?.[0]).toMatchObject({ id: 'b1', data: '2026-08-02', inicio: '10:00', duracaoMin: 45, fixado: true })
  })

  it('destravarBlocoTarefa só desmarca o bloco indicado', async () => {
    await db.tasks.add(
      tarefa({
        id: 't3',
        blocos: [
          { id: 'b1', data: '2026-08-01', inicio: '09:00', duracaoMin: 30, fixado: true },
          { id: 'b2', data: '2026-08-02', inicio: '09:00', duracaoMin: 30, fixado: true },
        ],
      }),
    )
    await destravarBlocoTarefa('t3', 'b1')
    const t3 = await db.tasks.get('t3')
    expect(t3?.blocos?.find((b) => b.id === 'b1')?.fixado).toBe(false)
    expect(t3?.blocos?.find((b) => b.id === 'b2')?.fixado).toBe(true)
  })
})

describe('moverBlocoFixado', () => {
  beforeEach(async () => {
    await db.tasks.clear()
  })

  it('rejeita sem gravar se a tarefa depende de outra ainda não concluída', async () => {
    const dep = tarefa({ id: 'dep', titulo: 'Dependência' })
    const t = tarefa({
      id: 't1',
      dependeDe: ['dep'],
      blocos: [{ id: 'b1', data: '2026-08-01', inicio: '09:00', duracaoMin: 30, fixado: true }],
    })
    await db.tasks.add(t)
    const r = await moverBlocoFixado('t1', 'b1', '2026-08-02', '10:00', { tarefas: [dep, t] })
    expect(r.ok).toBe(false)
    const t1 = await db.tasks.get('t1')
    expect(t1?.blocos?.[0]).toMatchObject({ data: '2026-08-01', inicio: '09:00' }) // não mudou
  })

  it('rejeita se o novo horário fica ANTES do fim do bloco fixado mais tardio da dependência concluída', async () => {
    const dep = tarefa({
      id: 'dep',
      concluidaEm: Date.now(),
      blocos: [{ id: 'bd', data: '2026-08-01', inicio: '14:00', duracaoMin: 60, fixado: true }], // termina 15:00
    })
    const t = tarefa({ id: 't1', dependeDe: ['dep'], blocos: [{ id: 'b1', data: '2026-08-02', inicio: '09:00', duracaoMin: 30, fixado: true }] })
    await db.tasks.add(t)
    // Tenta mover pro mesmo dia da dependência, mas antes dela terminar.
    const r = await moverBlocoFixado('t1', 'b1', '2026-08-01', '14:30', { tarefas: [dep, t] })
    expect(r.ok).toBe(false)
  })

  it('aceita e grava quando o novo horário é depois do fim do bloco da dependência', async () => {
    const dep = tarefa({
      id: 'dep',
      concluidaEm: Date.now(),
      blocos: [{ id: 'bd', data: '2026-08-01', inicio: '14:00', duracaoMin: 60, fixado: true }], // termina 15:00
    })
    const t = tarefa({ id: 't1', dependeDe: ['dep'], blocos: [{ id: 'b1', data: '2026-08-02', inicio: '09:00', duracaoMin: 30, fixado: true }] })
    await db.tasks.add(t)
    const r = await moverBlocoFixado('t1', 'b1', '2026-08-01', '15:30', { tarefas: [dep, t] })
    expect(r.ok).toBe(true)
    const t1 = await db.tasks.get('t1')
    expect(t1?.blocos?.[0]).toMatchObject({ data: '2026-08-01', inicio: '15:30' })
  })

  it('aceita sem restrição quando não há dependências', async () => {
    const t = tarefa({ id: 't1', blocos: [{ id: 'b1', data: '2026-08-02', inicio: '09:00', duracaoMin: 30, fixado: true }] })
    await db.tasks.add(t)
    const r = await moverBlocoFixado('t1', 'b1', '2026-08-05', '08:00', { tarefas: [t] })
    expect(r.ok).toBe(true)
  })
})
