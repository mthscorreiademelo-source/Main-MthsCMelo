// Testes da regra de "duas datas" (Item 4) e da migração de contexto (Item 9).
// A migração roda sobre o Dexie real, em IndexedDB falso (Node) — mesmo padrão
// usado em core/nuvem/sync/dexieLocal.test.ts.
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../core/db/db'
import type { Contexto } from '../agenda/types'
import {
  concluidasNoDia,
  diaEfetivo,
  ehHoje,
  estaAtrasada,
  filtrarHoje,
  filtrarProximas,
  migrarContextosTarefas,
} from './db'
import type { Task } from './types'

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

describe('diaEfetivo', () => {
  it('usa blocoData (dia planejado) quando existir', () => {
    expect(diaEfetivo(tarefa({ blocoData: '2026-08-01', data: '2026-07-20' }))).toBe('2026-08-01')
  })
  it('cai pro prazo (data) quando não há blocoData', () => {
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

  it('conta como hoje quando o bloco planejado é hoje, mesmo com prazo diferente', () => {
    expect(ehHoje(tarefa({ blocoData: HOJE, data: '2026-08-05' }))).toBe(true)
  })

  it('conta como hoje quando não há bloco, mas o prazo é hoje', () => {
    expect(ehHoje(tarefa({ data: HOJE }))).toBe(true)
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

  it('usa blocoData quando existir, senão o prazo, pra ordenar/agrupar — e exclui hoje/atrasadas', () => {
    const comBloco = tarefa({ id: 'a', blocoData: '2026-08-01', data: '2026-08-10' })
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
