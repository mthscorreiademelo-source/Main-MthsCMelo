import type { Task, Projeto } from '../tarefas/types'
import type { Evento } from '../agenda/types'
import { eventosDoDia } from '../agenda/db'
import { progressoProjeto } from '../projetos/db'

/**
 * Cálculos puros do Hoje (sem React, testáveis). Concentram a lógica que os
 * mockups pedem: o "Foco do dia" (projeto com mais tempo planejado), as
 * contagens da semana e o progresso dos projetos em andamento.
 */

/** Duração assumida quando a tarefa tem bloco mas não informou duração. */
export const DUR_PADRAO_MIN = 30

/** Minutos PLANEJADOS hoje por projeto (soma das durações dos blocos de hoje). */
export function minutosPorProjeto(tarefas: Task[], hoje: string): Map<string, number> {
  const mapa = new Map<string, number>()
  for (const t of tarefas) {
    if (t.blocoData === hoje && t.projetoId && !t.concluidaEm) {
      mapa.set(t.projetoId, (mapa.get(t.projetoId) ?? 0) + (t.duracaoMin ?? DUR_PADRAO_MIN))
    }
  }
  return mapa
}

export interface FocoDoDia {
  projeto: Projeto
  minutos: number
  totalMinutos: number
  /** 0..100 — quanto do tempo planejado de hoje é deste projeto. */
  pct: number
}

/**
 * O projeto que mais tempo planejado tem hoje (o "Foco do dia" do mockup). Só
 * retorna algo quando existe pelo menos um bloco de hoje ligado a um projeto.
 */
export function focoDoDia(tarefas: Task[], projetos: Projeto[], hoje: string): FocoDoDia | null {
  const mapa = minutosPorProjeto(tarefas, hoje)
  if (mapa.size === 0) return null
  const total = [...mapa.values()].reduce((s, m) => s + m, 0)
  let melhorId = ''
  let melhorMin = -1
  for (const [id, min] of mapa) {
    if (min > melhorMin) {
      melhorMin = min
      melhorId = id
    }
  }
  const projeto = projetos.find((p) => p.id === melhorId)
  if (!projeto || total <= 0) return null
  return { projeto, minutos: melhorMin, totalMinutos: total, pct: Math.round((melhorMin / total) * 100) }
}

export interface ProgressoProjeto {
  projeto: Projeto
  /** 0..1 */
  progresso: number
  restantes: number
  total: number
}

/**
 * Projetos em andamento com seu progresso (fração de tarefas concluídas),
 * ordenados por atividade recente. Só projetos com alguma tarefa entram.
 */
export function projetosEmAndamento(
  tarefas: Task[],
  projetos: Projeto[],
  limite = 3,
): ProgressoProjeto[] {
  const porProjeto = new Map<string, Task[]>()
  for (const t of tarefas) {
    if (!t.projetoId) continue
    const arr = porProjeto.get(t.projetoId)
    if (arr) arr.push(t)
    else porProjeto.set(t.projetoId, [t])
  }
  const ativos = projetos.filter((p) => !p.arquivado && (p.status ?? 'andamento') !== 'concluido')
  const out: ProgressoProjeto[] = []
  for (const p of ativos) {
    const doProjeto = (porProjeto.get(p.id) ?? []).filter((t) => !t.paiId)
    if (doProjeto.length === 0) continue
    const restantes = doProjeto.filter((t) => !t.concluidaEm).length
    out.push({
      projeto: p,
      progresso: progressoProjeto(porProjeto.get(p.id) ?? []),
      restantes,
      total: doProjeto.length,
    })
  }
  out.sort((a, b) => (b.projeto.ultimaAtividade ?? 0) - (a.projeto.ultimaAtividade ?? 0))
  return out.slice(0, limite)
}

/** Os 7 dias (ISO) da semana que contém `hoje`, de domingo a sábado. */
export function diasDaSemana(hoje: string): string[] {
  const base = new Date(`${hoje}T00:00:00`)
  const domingo = new Date(base)
  domingo.setDate(base.getDate() - base.getDay())
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(domingo)
    d.setDate(domingo.getDate() + i)
    return fmt(d)
  })
}

export interface ContagemSemana {
  feitos: number
  total: number
}

/** Tarefas da semana: total com data na semana e quantas foram concluídas. */
export function tarefasDaSemana(tarefas: Task[], dias: string[]): ContagemSemana {
  const set = new Set(dias)
  const naSemana = tarefas.filter((t) => !t.paiId && t.data && set.has(t.data))
  return { feitos: naSemana.filter((t) => !!t.concluidaEm).length, total: naSemana.length }
}

/** Eventos da semana: total de ocorrências e quantas já passaram (dias anteriores a hoje). */
export function eventosDaSemana(eventos: Evento[], dias: string[], hoje: string): ContagemSemana {
  let total = 0
  let feitos = 0
  for (const dia of dias) {
    const n = eventosDoDia(eventos, dia).length
    total += n
    if (dia < hoje) feitos += n
  }
  return { feitos, total }
}
