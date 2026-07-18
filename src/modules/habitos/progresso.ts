import {
  addDays,
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

/** Nº de dias "feitos" (concluídos) na semana que contém `data`. */
export function contagemSemana(
  h: Habito,
  registros: HabitoRegistro[] | Map<string, HabitoRegistro>,
  data: string,
): number {
  const mapa =
    registros instanceof Map ? registros : mapaPorData(registros, h.id)
  const ini = startOfWeek(parseISO(data), { weekStartsOn: 0 })
  let n = 0
  for (let i = 0; i < 7; i++) {
    const d = format(addDays(ini, i), 'yyyy-MM-dd')
    if (estaCompleto(h, mapa.get(d))) n++
  }
  return n
}

/**
 * O hábito está "cumprido" nesse dia? Para frequência semanal (X vezes/semana),
 * conta como cumprido quando a meta da semana já foi atingida — assim ele para
 * de cobrar depois que você bate o alvo. Nos demais tipos, é a conclusão do dia.
 */
export function diaConcluido(
  h: Habito,
  registros: HabitoRegistro[] | Map<string, HabitoRegistro>,
  data: string,
): boolean {
  if (h.frequencia?.tipo === 'semanal') {
    const alvo = Math.max(1, h.frequencia.vezes ?? 1)
    return contagemSemana(h, registros, data) >= alvo
  }
  const mapa =
    registros instanceof Map ? registros : mapaPorData(registros, h.id)
  return estaCompleto(h, mapa.get(data))
}

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

/**
 * Fração de conclusão do hábito no dia (0..1). Conta parciais: um checklist
 * com 2 de 3 itens = 0.67; um medido com 5 de 8 = 0.625. Semanal usa a meta
 * da semana.
 */
export function fracaoDoDia(h: Habito, registros: HabitoRegistro[], data: string): number {
  if (h.frequencia?.tipo === 'semanal') {
    const alvo = Math.max(1, h.frequencia.vezes ?? 1)
    return Math.min(1, contagemSemana(h, registros, data) / alvo)
  }
  const mapa = mapaPorData(registros, h.id)
  return fracao(h, mapa.get(data))
}

/**
 * Resumo do dia (só hábitos devidos). O anel de progresso soma as frações
 * (parciais contam), enquanto `feitos` é a contagem dos concluídos por inteiro.
 */
export function resumoDoDia(
  habitos: Habito[],
  registros: HabitoRegistro[],
  data: string,
): ResumoDia {
  const devidos = habitos.filter((h) => !h.arquivado && devidoNoDia(h, data))
  let feitos = 0
  let soma = 0
  for (const h of devidos) {
    const f = fracaoDoDia(h, registros, data)
    soma += f
    if (f >= 1) feitos++
  }
  const total = devidos.length
  return { total, feitos, fracao: total ? soma / total : 0 }
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

// ---------- Estatísticas globais (aba de estatísticas) ----------

export interface DiaSerie {
  data: string
  feitos: number
  total: number
  fracao: number
}

/** Série diária (mais antigo → hoje) com o resumo de cada dia. */
export function serieUltimosDias(
  habitos: Habito[],
  registros: HabitoRegistro[],
  n: number,
): DiaSerie[] {
  const hoje = parseISO(hojeISO())
  const ativos = habitos.filter((h) => !h.arquivado)
  return Array.from({ length: n }, (_, i) => {
    const d = format(subDays(hoje, n - 1 - i), 'yyyy-MM-dd')
    const r = resumoDoDia(ativos, registros, d)
    return { data: d, feitos: r.feitos, total: r.total, fracao: r.fracao }
  })
}

/** Série para o mapa de calor global (estado por fração do dia). */
export function heatmapGlobal(
  habitos: Habito[],
  registros: HabitoRegistro[],
  dias: number,
): DiaHeatmap[] {
  return serieUltimosDias(habitos, registros, dias).map((s) => ({
    data: s.data,
    fracao: s.fracao,
    estado: s.total === 0 ? 'pendente' : s.fracao >= 1 ? 'feito' : s.fracao > 0 ? 'parcial' : 'pendente',
    devido: s.total > 0,
  }))
}

export interface EstatGlobais {
  ativos: number
  taxa: number
  diasPerfeitos: number
  melhorDia: number
  concluidosHoje: number
  totalHoje: number
  registrosTotais: number
}

/** Panorama geral considerando os últimos `janela` dias (padrão 30). */
export function estatGlobais(
  habitos: Habito[],
  registros: HabitoRegistro[],
  janela = 30,
): EstatGlobais {
  const ativos = habitos.filter((h) => !h.arquivado)
  const serie = serieUltimosDias(ativos, registros, janela)
  let somaFeitos = 0
  let somaDevidos = 0
  let diasPerfeitos = 0
  let melhorDia = 0
  for (const s of serie) {
    somaFeitos += s.feitos
    somaDevidos += s.total
    if (s.total > 0 && s.feitos === s.total) diasPerfeitos++
    melhorDia = Math.max(melhorDia, s.fracao)
  }
  const hoje = serie[serie.length - 1]
  return {
    ativos: ativos.length,
    taxa: somaDevidos > 0 ? somaFeitos / somaDevidos : 0,
    diasPerfeitos,
    melhorDia,
    concluidosHoje: hoje?.feitos ?? 0,
    totalHoje: hoje?.total ?? 0,
    registrosTotais: registros.length,
  }
}

export interface LinhaRanking {
  habito: Habito
  taxa: number
  feitos: number
  devidos: number
  streak: number
}

/** Ranking dos hábitos por taxa de conclusão nos últimos `janela` dias. */
export function rankingHabitos(
  habitos: Habito[],
  registros: HabitoRegistro[],
  janela = 30,
): LinhaRanking[] {
  const hoje = parseISO(hojeISO())
  return habitos
    .filter((h) => !h.arquivado)
    .map((h) => {
      const mapa = mapaPorData(registros, h.id)
      let feitos = 0
      let devidos = 0
      for (let i = 0; i < janela; i++) {
        const ds = format(subDays(hoje, i), 'yyyy-MM-dd')
        if (!devidoNoDia(h, ds)) continue
        devidos++
        if (estadoDia(h, mapa.get(ds)) === 'feito') feitos++
      }
      const st = estatisticasHabito(h, registros).streak
      return { habito: h, taxa: devidos > 0 ? feitos / devidos : 0, feitos, devidos, streak: st }
    })
    .sort((a, b) => b.taxa - a.taxa || b.streak - a.streak)
}
