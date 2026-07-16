import {
  format,
  isSameMonth,
  parseISO,
  startOfWeek,
  subDays,
} from 'date-fns'
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

export type EstadoDia = 'feito' | 'falhou' | 'pendente' | 'parcial'

/** Estado do hábito num dia. Sim/Não pode ser "falhou"; medidos ficam "parcial". */
export function estadoDia(h: Habito, reg: HabitoRegistro | undefined): EstadoDia {
  if (!reg) return 'pendente'
  if (h.tipo === 'sim_nao') {
    if (reg.estado) return reg.estado
    return (reg.valor ?? 0) >= 1 ? 'feito' : 'pendente'
  }
  if (estaCompleto(h, reg)) return 'feito'
  return valorDoDia(h, reg) > 0 ? 'parcial' : 'pendente'
}

/** Progresso atual (0..alvo) do hábito no dia, dado o registro. */
export function valorDoDia(h: Habito, reg: HabitoRegistro | undefined): number {
  if (!reg) return 0
  if (h.tipo === 'checklist') return reg.itens?.length ?? 0
  if (ehMedido(h.tipo)) return reg.valor ?? 0
  // Sim/Não
  if (reg.estado === 'feito') return 1
  if (reg.estado === 'falhou') return 0
  return (reg.valor ?? 0) >= 1 ? 1 : 0
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

// ---------- Estatísticas por hábito (página de detalhe) ----------

/** Mapa data → registro de um hábito específico. */
export function mapaPorData(
  registros: HabitoRegistro[],
  habitoId: string,
): Map<string, HabitoRegistro> {
  const m = new Map<string, HabitoRegistro>()
  for (const r of registros) if (r.habitoId === habitoId) m.set(r.data, r)
  return m
}

export interface DiaHeatmap {
  data: string
  estado: EstadoDia
  fracao: number
  devido: boolean
}

/** Últimos `dias` dias (mais antigo → hoje) com estado/fração para o mapa de calor. */
export function diasParaHeatmap(
  h: Habito,
  map: Map<string, HabitoRegistro>,
  dias: number,
): DiaHeatmap[] {
  const hoje = parseISO(hojeISO())
  return Array.from({ length: dias }, (_, i) => {
    const d = format(subDays(hoje, dias - 1 - i), 'yyyy-MM-dd')
    const reg = map.get(d)
    return { data: d, estado: estadoDia(h, reg), fracao: fracao(h, reg), devido: devidoNoDia(h, d) }
  })
}

export interface EstatHabito {
  streak: number
  melhor: number
  taxa: number
  feitosSemana: number
  devidosSemana: number
  feitosMes: number
  media: number | null
}

/** Estatísticas completas de um hábito. */
export function estatisticasHabito(
  h: Habito,
  registros: HabitoRegistro[],
  hojeStr = hojeISO(),
): EstatHabito {
  const map = mapaPorData(registros, h.id)
  const hoje = parseISO(hojeStr)
  const inicioData = new Date(h.criadoEm)
  const inicio = parseISO(
    (isNaN(inicioData.getTime()) ? hoje : inicioData).toISOString().slice(0, 10),
  )

  // Sequência atual (dias devidos consecutivos com "feito", terminando hoje/ontem).
  let streak = 0
  {
    let dia = hoje
    if (estadoDia(h, map.get(format(dia, 'yyyy-MM-dd'))) !== 'feito') dia = subDays(dia, 1)
    for (let i = 0; i < 730; i++) {
      const ds = format(dia, 'yyyy-MM-dd')
      if (!devidoNoDia(h, ds)) {
        dia = subDays(dia, 1)
        continue
      }
      if (estadoDia(h, map.get(ds)) === 'feito') {
        streak++
        dia = subDays(dia, 1)
      } else break
    }
  }

  // Varre do início até hoje: melhor sequência, taxa (excluindo hoje).
  let melhor = 0
  let corrente = 0
  let devidos = 0
  let feitos = 0
  const inicioMs = inicio.getTime()
  const totalDias = Math.min(730, Math.round((hoje.getTime() - inicioMs) / 86400000) + 1)
  const semanaIni = startOfWeek(hoje, { weekStartsOn: 0 })
  let feitosSemana = 0
  let devidosSemana = 0
  let feitosMes = 0
  let somaValor = 0
  let nValor = 0
  for (let i = 0; i < totalDias; i++) {
    const d = subDays(hoje, totalDias - 1 - i)
    const ds = format(d, 'yyyy-MM-dd')
    const est = estadoDia(h, map.get(ds))
    const devido = devidoNoDia(h, ds)
    const ehHoje = ds === hojeStr
    if (devido) {
      if (est === 'feito') corrente++
      else corrente = 0
      melhor = Math.max(melhor, corrente)
      if (!ehHoje) {
        devidos++
        if (est === 'feito') feitos++
      }
      if (d >= semanaIni) {
        devidosSemana++
        if (est === 'feito') feitosSemana++
      }
      if (isSameMonth(d, hoje) && est === 'feito') feitosMes++
    }
    const reg = map.get(ds)
    if (ehMedido(h.tipo) && reg?.valor) {
      somaValor += reg.valor
      nValor++
    }
  }

  return {
    streak,
    melhor,
    taxa: devidos > 0 ? feitos / devidos : 0,
    feitosSemana,
    devidosSemana,
    feitosMes,
    media: nValor > 0 ? somaValor / nValor : null,
  }
}
