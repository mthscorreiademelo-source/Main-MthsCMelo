// Testes da camada de sugestão viva ("fantasma") do planner — Item 4 do plano.
// `sugestoesVivas`/`planoDoDia` são funções puras: sem Dexie/IndexedDB.
import { describe, expect, it } from 'vitest'
import type { Contexto } from './types'
import { planoDoDia, sugestoesVivas } from './planner'
import { expandirEventos } from './db'
import type { Task } from '../tarefas/types'

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

const SEM_CONTEXTOS: Contexto[] = []
const AGORA = new Date('2026-07-28T08:00:00')
const HOJE = '2026-07-28'

describe('sugestoesVivas', () => {
  it('sugere um bloco pra tarefa pendente elegível (tem blocoData + duracaoMin, sem hora ainda)', () => {
    const t = tarefa({ duracaoMin: 60, blocos: [{ id: 'b1', data: HOJE, duracaoMin: 60, fixado: false }] })
    const mapa = sugestoesVivas([t], [], SEM_CONTEXTOS, AGORA)
    expect(mapa.get(t.id)).toBeDefined()
    expect(mapa.get(t.id)![0].fixado).toBe(false)
  })

  it('não sugere nada pra tarefa já concluída', () => {
    const t = tarefa({ duracaoMin: 60, concluidaEm: Date.now(), blocos: [{ id: 'b1', data: HOJE, duracaoMin: 60, fixado: false }] })
    const mapa = sugestoesVivas([t], [], SEM_CONTEXTOS, AGORA)
    expect(mapa.has(t.id)).toBe(false)
  })

  it('não sugere nada pra tarefa sem gatilho (tem blocos, mas nenhum é "semente")', () => {
    const t = tarefa({ duracaoMin: 60, blocos: [{ id: 'x', duracaoMin: 10, fixado: false }] })
    const mapa = sugestoesVivas([t], [], SEM_CONTEXTOS, AGORA)
    expect(mapa.has(t.id)).toBe(false)
  })
})

describe('planoDoDia — sugestões fantasma', () => {
  it('renderiza a sugestão como item fantasma (fixado: false), separado dos itens fixados', () => {
    const t = tarefa({ titulo: 'Estudar', duracaoMin: 60, blocos: [{ id: 'b1', data: HOJE, duracaoMin: 60, fixado: false }] })
    const sugestoes = sugestoesVivas([t], [], SEM_CONTEXTOS, AGORA)
    const ocorrencias = expandirEventos([], [HOJE])
    const plano = planoDoDia(HOJE, ocorrencias, [t], { contextos: SEM_CONTEXTOS, sugestoes })

    const itensFantasma = plano.grupos.flatMap((g) => g.itens).filter((i) => i.fantasma)
    expect(itensFantasma).toHaveLength(1)
    expect(itensFantasma[0].titulo).toBe('Estudar')
    expect(itensFantasma[0].blocoId).toBeDefined()
  })

  it('sugestão fantasma NÃO conta na ocupação nem em nTarefas (não é compromisso real)', () => {
    const t = tarefa({ duracaoMin: 60, blocos: [{ id: 'b1', data: HOJE, duracaoMin: 60, fixado: false }] })
    const sugestoes = sugestoesVivas([t], [], SEM_CONTEXTOS, AGORA)
    const ocorrencias = expandirEventos([], [HOJE])
    const plano = planoDoDia(HOJE, ocorrencias, [t], { contextos: SEM_CONTEXTOS, sugestoes })

    expect(plano.ocupadoMin).toBe(0)
    expect(plano.nTarefas).toBe(0)
    expect(plano.gruposReais).toHaveLength(0)
  })

  it('bloco JÁ FIXADO continua aparecendo como antes (fantasma: false), sem sugestão extra pra cobrir o mesmo tempo', () => {
    const t = tarefa({
      duracaoMin: 60,
      blocos: [{ id: 'b1', data: HOJE, inicio: '09:00', duracaoMin: 60, fixado: true }],
    })
    const sugestoes = sugestoesVivas([t], [], SEM_CONTEXTOS, AGORA)
    const ocorrencias = expandirEventos([], [HOJE])
    const plano = planoDoDia(HOJE, ocorrencias, [t], { contextos: SEM_CONTEXTOS, sugestoes })

    const itens = plano.grupos.flatMap((g) => g.itens)
    expect(itens).toHaveLength(1)
    expect(itens[0].fantasma).toBe(false)
    expect(plano.ocupadoMin).toBe(60)
    expect(plano.nTarefas).toBe(1)
  })
})
