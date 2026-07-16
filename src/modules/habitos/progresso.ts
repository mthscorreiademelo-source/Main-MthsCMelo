import { format, parseISO, subDays } from 'date-fns'
import { hojeISO } from '../../core/dates'
import { ehMedido } from './db'
import { devidoNoDia } from './freq'
import type { Habito, HabitoRegistro } from './types'

/** Meta efetiva do hábito (medido = meta||1; checklist = nº de itens). */
export function metaHabito(h: Habito): number {
  if (h.tipo === 'checklist') return Math.max(1, h.itens?.length ?? 1)
  if (ehMedido(h.tipo)) return Math.max(1, h.meta ?? 1)
  return 1
}

/** Progresso atual (0..alvo) do hábito no dia, dado o registro. */
export function valorDoDia(h: Habito, reg: HabitoRegistro | undefined): number {
  if (!reg) return 0
  if (h.tipo === 'checklist') return reg.itens?.length ?? 0
  if (ehMedido(h.tipo)) return reg.valor ?? 0
  return reg.valor && reg.valor >= 1 ? 1 : 0
}

/** Fração de conclusão (0..1). */
export function fracao(h: Habito, reg: HabitoRegistro | undefined): number {
  const alvo = metaHabito(h)
  return Math.min(1, valorDoDia(h, reg) / alvo)
}

export function estaCompleto(h: Habito, reg: HabitoRegistro | undefined): boolean {
  return fracao(h, reg) >= 1
}

/** Mapa habitoId → registro do dia. */
export function registrosDoDia(
  registros: HabitoRegistro[],
  data: string,
): Map<string, HabitoRegistro> {
  const m = new Map<string, HabitoRegistro>()
  for (const r of registros) if (r.data === data) m.set(r.habitoId, r)
  return m
}

export interface ResumoDia {
  total: number
  feitos: number
  fracao: number
}

/** Resumo do dia considerando só os hábitos devidos naquele dia. */
export function resumoDoDia(
  habitos: Habito[],
  registros: HabitoRegistro[],
  data: string,
): ResumoDia {
  const doDia = registrosDoDia(registros, data)
  const devidos = habitos.filter((h) => !h.arquivado && devidoNoDia(h, data))
  const feitos = devidos.filter((h) => estaCompleto(h, doDia.get(h.id))).length
  const total = devidos.length
  return { total, feitos, fracao: total ? feitos / total : 0 }
}

/**
 * Sequência (streak) geral: dias consecutivos, terminando hoje (ou ontem se hoje
 * ainda não fechou), em que TODOS os hábitos devidos foram concluídos.
 */
export function streakGeral(habitos: Habito[], registros: HabitoRegistro[]): number {
  const ativos = habitos.filter((h) => !h.arquivado)
  if (ativos.length === 0) return 0
  const completo = (data: string) => {
    const r = resumoDoDia(ativos, registros, data)
    return r.total > 0 && r.feitos === r.total
  }
  let dia = parseISO(hojeISO())
  const hoje = hojeISO()
  // Se hoje ainda não fechou, a streak "viva" parte de ontem.
  if (!completo(hoje)) dia = subDays(dia, 1)
  let streak = 0
  // Limite de segurança de 730 dias.
  for (let i = 0; i < 730; i++) {
    const d = format(dia, 'yyyy-MM-dd')
    const r = resumoDoDia(ativos, registros, d)
    if (r.total === 0) {
      // Nenhum hábito devido nesse dia — não quebra a streak, só pula.
      dia = subDays(dia, 1)
      continue
    }
    if (r.feitos === r.total) {
      streak++
      dia = subDays(dia, 1)
    } else break
  }
  return streak
}
