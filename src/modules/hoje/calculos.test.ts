import { describe, expect, it } from 'vitest'
import { diasDaSemana, focoDoDia, minutosPorProjeto, tarefasDaSemana } from './calculos'
import type { Task, Projeto } from '../tarefas/types'

const tarefa = (t: Partial<Task>): Task => ({
  id: Math.random().toString(36).slice(2),
  titulo: 'x',
  prioridade: 4,
  criadaEm: 0,
  ordem: 0,
  ...t,
})

const projeto = (id: string, nome: string): Projeto => ({
  id,
  nome,
  ordem: 0,
  criadoEm: 0,
})

const HOJE = '2026-07-25'

describe('minutosPorProjeto', () => {
  it('soma as durações dos blocos de hoje por projeto (ignora concluídas e sem projeto)', () => {
    const tarefas = [
      tarefa({ projetoId: 'a', blocoData: HOJE, duracaoMin: 60 }),
      tarefa({ projetoId: 'a', blocoData: HOJE, duracaoMin: 30 }),
      tarefa({ projetoId: 'b', blocoData: HOJE, duracaoMin: 45 }),
      tarefa({ projetoId: 'a', blocoData: '2026-07-24', duracaoMin: 90 }), // outro dia
      tarefa({ projetoId: 'a', blocoData: HOJE, duracaoMin: 60, concluidaEm: 1 }), // concluída
      tarefa({ blocoData: HOJE, duracaoMin: 20 }), // sem projeto
    ]
    const m = minutosPorProjeto(tarefas, HOJE)
    expect(m.get('a')).toBe(90)
    expect(m.get('b')).toBe(45)
  })

  it('usa duração padrão quando o bloco não informa duração', () => {
    const m = minutosPorProjeto([tarefa({ projetoId: 'a', blocoData: HOJE })], HOJE)
    expect(m.get('a')).toBe(30)
  })
})

describe('focoDoDia', () => {
  it('escolhe o projeto com mais tempo planejado e calcula a %', () => {
    const tarefas = [
      tarefa({ projetoId: 'a', blocoData: HOJE, duracaoMin: 90 }),
      tarefa({ projetoId: 'b', blocoData: HOJE, duracaoMin: 30 }),
    ]
    const foco = focoDoDia(tarefas, [projeto('a', 'PropTank'), projeto('b', 'Outro')], HOJE)
    expect(foco?.projeto.nome).toBe('PropTank')
    expect(foco?.minutos).toBe(90)
    expect(foco?.totalMinutos).toBe(120)
    expect(foco?.pct).toBe(75)
  })

  it('retorna null quando não há bloco de hoje ligado a projeto', () => {
    expect(focoDoDia([tarefa({ data: HOJE })], [], HOJE)).toBeNull()
  })
})

describe('diasDaSemana', () => {
  it('devolve 7 dias, de domingo a sábado, contendo o dia dado', () => {
    // 2026-07-25 é um sábado.
    const dias = diasDaSemana('2026-07-25')
    expect(dias).toHaveLength(7)
    expect(dias[0]).toBe('2026-07-19') // domingo
    expect(dias[6]).toBe('2026-07-25') // sábado
    expect(dias).toContain('2026-07-25')
  })
})

describe('tarefasDaSemana', () => {
  it('conta total na semana e concluídas', () => {
    const dias = diasDaSemana(HOJE)
    const tarefas = [
      tarefa({ data: HOJE }),
      tarefa({ data: HOJE, concluidaEm: 1 }),
      tarefa({ data: '2026-07-19' }),
      tarefa({ data: '2026-08-01' }), // fora da semana
    ]
    const c = tarefasDaSemana(tarefas, dias)
    expect(c.total).toBe(3)
    expect(c.feitos).toBe(1)
  })
})
