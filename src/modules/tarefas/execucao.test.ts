// Testes do Motor de Planejamento — `sugerirBlocos` (Itens 4, 9, 11, 12).
// Função pura: sem Dexie/IndexedDB, tudo via parâmetros (`agora` incluso).
import { describe, expect, it } from 'vitest'
import type { Contexto, Evento } from '../agenda/types'
import { sugerirBlocos } from './execucao'
import type { BlocoTarefa, Task } from './types'

/** Estreita o retorno de `sugerirBlocos` pra `BlocoTarefa[]`, falhando o teste se vier `null`/`'sem-horario-possivel'`. */
function comoBlocos(r: ReturnType<typeof sugerirBlocos>): BlocoTarefa[] {
  if (r === null || r === 'sem-horario-possivel') throw new Error(`esperava uma lista de blocos, recebi: ${r}`)
  return r
}

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

function contexto(over: Partial<Contexto> & { id: string; nome: string; inicioMin: number; fimMin: number }): Contexto {
  return { cor: '#4073ff', ordem: 0, criadoEm: 0, ...over }
}

const SEM_EVENTOS: Evento[] = []

describe('sugerirBlocos — gatilho', () => {
  it('null quando a tarefa não tem duracaoMin', () => {
    const t = tarefa({ data: '2026-07-28' })
    expect(sugerirBlocos(t, { tarefas: [t], eventos: SEM_EVENTOS, contextos: [], agora: new Date('2026-07-28T08:00:00') })).toBeNull()
  })

  it('null quando não há nenhuma indicação de quando fazer (blocos existem, mas nenhum é "semente")', () => {
    const t = tarefa({ duracaoMin: 60, blocos: [{ id: 'x', duracaoMin: 10, fixado: false }] })
    expect(sugerirBlocos(t, { tarefas: [t], eventos: SEM_EVENTOS, contextos: [], agora: new Date('2026-07-28T08:00:00') })).toBeNull()
  })

  it('null quando já está toda coberta por bloco(s) fixado(s) com hora marcada', () => {
    const t = tarefa({
      duracaoMin: 60,
      blocos: [{ id: 'a', data: '2026-08-01', inicio: '09:00', duracaoMin: 60, fixado: true }],
    })
    expect(sugerirBlocos(t, { tarefas: [t], eventos: SEM_EVENTOS, contextos: [], agora: new Date('2026-07-28T08:00:00') })).toBeNull()
  })

  it('null quando depende de outra tarefa ainda não concluída (Item 11)', () => {
    const dep = tarefa({ id: 'dep' })
    const t = tarefa({ id: 't1', duracaoMin: 30, dependeDe: ['dep'], data: '2026-08-05' })
    expect(
      sugerirBlocos(t, { tarefas: [t, dep], eventos: SEM_EVENTOS, contextos: [], agora: new Date('2026-07-28T08:00:00') }),
    ).toBeNull()
  })
})

describe('sugerirBlocos — nunca no passado (Item 12b)', () => {
  it('a sugestão nunca começa antes de `agora`', () => {
    const t = tarefa({ id: 't1', duracaoMin: 30, data: '2026-07-28' })
    const agora = new Date('2026-07-28T10:00:00')
    const r = sugerirBlocos(t, { tarefas: [t], eventos: SEM_EVENTOS, contextos: [], agora })
    expect(comoBlocos(r)[0]).toMatchObject({ data: '2026-07-28', inicio: '10:00', duracaoMin: 30, fixado: false })
  })
})

describe('sugerirBlocos — contexto (Item 9)', () => {
  it('tarefa com contexto só pode ser sugerida dentro das janelas daquele contexto', () => {
    const trabalho = contexto({ id: 'ctx1', nome: 'Trabalho', inicioMin: 9 * 60, fimMin: 18 * 60 })
    const t = tarefa({ id: 't1', duracaoMin: 60, contextoId: 'ctx1', data: '2026-07-28' })
    const agora = new Date('2026-07-28T08:00:00') // antes do contexto abrir
    const r = sugerirBlocos(t, { tarefas: [t], eventos: SEM_EVENTOS, contextos: [trabalho], agora })
    expect(comoBlocos(r)[0]).toMatchObject({ data: '2026-07-28', inicio: '09:00' })
  })

  it('"Casa" (sem contexto) nunca cai dentro de um contexto criado — mesmo cruzando a meia-noite', () => {
    const sono = contexto({ id: 'ctx-sono', nome: 'Sono', inicioMin: 23 * 60, fimMin: 7 * 60 }) // 23h → 7h
    const t = tarefa({ id: 't1', duracaoMin: 60, data: '2026-07-28' }) // sem contextoId = Casa
    const agora = new Date('2026-07-28T06:30:00') // ainda dentro do horário de Sono
    const r = sugerirBlocos(t, { tarefas: [t], eventos: SEM_EVENTOS, contextos: [sono], agora })
    expect(comoBlocos(r)[0]).toMatchObject({ data: '2026-07-28', inicio: '07:00' })
  })
})

describe('sugerirBlocos — dependências (Item 11)', () => {
  it('quando a dependência está concluída com bloco fixado, a busca só começa depois do fim dele', () => {
    const dep = tarefa({
      id: 'dep',
      concluidaEm: Date.now(),
      blocos: [{ id: 'bd', data: '2026-07-28', inicio: '10:00', duracaoMin: 120, fixado: true }], // termina 12:00
    })
    const t = tarefa({ id: 't1', duracaoMin: 30, dependeDe: ['dep'], data: '2026-07-28' })
    const agora = new Date('2026-07-28T08:00:00') // antes do fim da dependência
    const r = sugerirBlocos(t, { tarefas: [t, dep], eventos: SEM_EVENTOS, contextos: [], agora })
    expect(comoBlocos(r)[0]).toMatchObject({ data: '2026-07-28', inicio: '12:00' })
  })
})

describe('sugerirBlocos — prazo e divisão em blocos (Item 12c)', () => {
  it('sem-horario-possivel quando não cabe inteira e o mínimo do pedaço não foi reduzido (padrão = não divide)', () => {
    const curto = contexto({ id: 'ctx-curto', nome: 'Curto', inicioMin: 9 * 60, fimMin: 16 * 60 }) // 420 min/dia
    const t = tarefa({ id: 't1', duracaoMin: 600, contextoId: 'ctx-curto', data: '2026-07-28' }) // prazo = hoje, sem margem
    const agora = new Date('2026-07-28T00:00:00')
    const r = sugerirBlocos(t, { tarefas: [t], eventos: SEM_EVENTOS, contextos: [curto], agora })
    expect(r).toBe('sem-horario-possivel')
  })

  it('divide em blocos ≥ duracaoMinBloco quando não cabe inteira, avançando dias até o prazo', () => {
    const curto = contexto({ id: 'ctx-curto', nome: 'Curto', inicioMin: 9 * 60, fimMin: 9 * 60 + 200 }) // 200 min/dia
    const t = tarefa({
      id: 't1',
      duracaoMin: 400,
      duracaoMinBloco: 200,
      contextoId: 'ctx-curto',
      data: '2026-07-29', // prazo dois dias depois de "hoje"
    })
    const agora = new Date('2026-07-28T00:00:00')
    const r = sugerirBlocos(t, { tarefas: [t], eventos: SEM_EVENTOS, contextos: [curto], agora })
    const blocos = comoBlocos(r)
    expect(blocos).toHaveLength(2)
    expect(blocos.every((b) => b.duracaoMin >= 200 && !b.fixado)).toBe(true)
    expect(blocos.reduce((s, b) => s + b.duracaoMin, 0)).toBe(400)
    expect(blocos.map((b) => b.data)).toEqual(['2026-07-28', '2026-07-29'])
  })
})
