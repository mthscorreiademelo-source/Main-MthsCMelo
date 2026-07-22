import type { Evento } from '../agenda/types'
import type {
  Conta,
  FinancasConfig,
  Movimento,
  Objetivo,
  OrcamentoLinha,
  PatrimonioSnapshot,
  Recorrente,
} from './types'

/* ------------------------------- utilitários ------------------------------ */

export function mesDe(iso: string): string {
  return iso.slice(0, 7)
}

export function diasNoMes(ano: number, mes1a12: number): number {
  return new Date(ano, mes1a12, 0).getDate()
}

/* ------------------------------- patrimônio ------------------------------- */

/** Patrimônio líquido = soma das contas (dívidas subtraem). */
export function patrimonioLiquido(contas: Conta[]): number {
  let total = 0
  for (const c of contas) total += c.tipo === 'divida' ? -c.saldoCentavos : c.saldoCentavos
  return total
}

/** Tipos de conta considerados "dinheiro para gastar agora" (líquido). */
export const TIPOS_LIQUIDOS = ['corrente', 'carteira'] as const

/** Saldo disponível de verdade: soma das contas líquidas (corrente + carteira). */
export function saldoDisponivel(contas: Conta[]): number {
  return contas
    .filter((c) => (TIPOS_LIQUIDOS as readonly string[]).includes(c.tipo))
    .reduce((s, c) => s + c.saldoCentavos, 0)
}

/** Série do gráfico de evolução: snapshots ordenados + o valor atual no mês corrente. */
export function serieEvolucao(
  snapshots: PatrimonioSnapshot[],
  mesAtual: string,
  valorAtual: number,
  meses = 6,
): { mes: string; valor: number }[] {
  const mapa = new Map(snapshots.map((s) => [s.mes, s.valorCentavos]))
  mapa.set(mesAtual, valorAtual)
  const chaves = [...mapa.keys()].sort()
  const ult = chaves.slice(-meses)
  return ult.map((m) => ({ mes: m, valor: mapa.get(m)! }))
}

/** Série mensal de entradas × saídas dos últimos N meses (gráfico de barras). */
export function serieMensal(
  movimentos: Movimento[],
  mesAtual: string,
  meses = 6,
): { mes: string; entradas: number; saidas: number }[] {
  const out: { mes: string; entradas: number; saidas: number }[] = []
  for (let i = meses - 1; i >= 0; i--) {
    const m = mesDeslocado(mesAtual, -i)
    const doMes = movimentos.filter((mv) => mv.data.startsWith(m))
    out.push({ mes: m, entradas: somaEntradas(doMes), saidas: somaSaidas(doMes) })
  }
  return out
}

/* -------------------------- orçamento inteligente ------------------------- */

export interface OrcamentoInteligente {
  rendaMensal: number
  /** Saldo líquido de verdade: soma das contas corrente + carteira. */
  saldoLiquido: number
  gastoMes: number
  gastoHoje: number
  entradasMes: number
  recorrentesReservados: number
  eventosReservados: number
  aportesReservados: number
  investimentoReservado: number
  /** Soma de tudo que ainda vai sair/guardar no mês (bills + eventos + aportes). */
  comprometido: number
  /** disponível de verdade = saldo líquido − comprometido (pode ficar negativo). */
  disponivelMes: number
  diasRestantes: number
  /** recomendação diária inteligente. */
  orcamentoDiario: number
  /** o que ainda pode ser gasto HOJE (pode ficar negativo se estourar). */
  disponivelHoje: number
  /** média diária de gasto até agora no mês. */
  mediaDiaria: number
  /** projeção de sobra no fim do mês, mantendo o ritmo atual. */
  economiaProjetada: number
}

function somaSaidas(movs: Movimento[]): number {
  return movs.reduce((s, m) => (m.tipo === 'saida' ? s + m.valorCentavos : s), 0)
}
function somaEntradas(movs: Movimento[]): number {
  return movs.reduce((s, m) => (m.tipo === 'entrada' ? s + m.valorCentavos : s), 0)
}

/**
 * Coração do módulo: "quanto posso gastar hoje sem comprometer meus objetivos?".
 * Reserva, antes de dividir pelos dias restantes: despesas recorrentes ainda não
 * debitadas, custos de eventos futuros do mês, aportes dos objetivos e a
 * poupança/investimento mensal planejado.
 */
export function orcamentoInteligente(args: {
  hoje: string
  movimentos: Movimento[]
  contas: Conta[]
  recorrentes: Recorrente[]
  objetivos: Objetivo[]
  eventos: Evento[]
  config: FinancasConfig | undefined
}): OrcamentoInteligente {
  const { hoje, movimentos, contas, recorrentes, objetivos, eventos, config } = args
  const mes = mesDe(hoje)
  const ano = Number(hoje.slice(0, 4))
  const mesNum = Number(hoje.slice(5, 7))
  const diaHoje = Number(hoje.slice(8, 10))
  const totalDias = diasNoMes(ano, mesNum)
  const diasRestantes = Math.max(1, totalDias - diaHoje + 1)

  const rendaMensal = config?.rendaMensalCentavos ?? 0
  const saldoLiquido = saldoDisponivel(contas)
  const movMes = movimentos.filter((m) => m.data.startsWith(mes))
  const gastoMes = somaSaidas(movMes)
  const entradasMes = somaEntradas(movMes)
  const gastoHoje = somaSaidas(movMes.filter((m) => m.data === hoje))

  // Recorrentes (despesas) ainda não debitadas: dia do débito >= hoje.
  const recorrentesReservados = recorrentes
    .filter((r) => r.ativo !== false && r.tipo === 'saida' && r.diaMes >= diaHoje)
    .reduce((s, r) => s + r.valorCentavos, 0)

  // Custos de eventos futuros dentro do mês (a partir de hoje).
  const eventosReservados = eventos
    .filter((e) => !!e.custoCentavos && e.data >= hoje && e.data.startsWith(mes))
    .reduce((s, e) => s + (e.custoCentavos ?? 0), 0)

  const aportesReservados = objetivos.reduce((s, o) => s + (o.aporteMensalCentavos ?? 0), 0)
  const investimentoReservado = config?.investimentoMensalCentavos ?? 0

  // Tudo que ainda vai sair (ou ser guardado) até o fim do mês.
  const comprometido =
    recorrentesReservados + eventosReservados + aportesReservados + investimentoReservado

  // Disponível de verdade: o que HÁ na conta menos os compromissos do mês.
  // (Não depende do salário — depende do dinheiro que você realmente tem.)
  const disponivelMes = saldoLiquido - comprometido

  // Orçamento diário: divide o que sobra pelos dias restantes, devolvendo o
  // gasto de hoje ao bolo para que "hoje" receba uma fatia cheia como os demais.
  const orcamentoDiario = Math.max(0, disponivelMes + gastoHoje) / diasRestantes
  const disponivelHoje = orcamentoDiario - gastoHoje

  const mediaDiaria = diaHoje > 0 ? gastoMes / diaHoje : 0
  // Projeção: se mantiver a média diária, quanto sobra do disponível no fim do mês.
  const gastoRestanteProjetado = mediaDiaria * (diasRestantes - 1)
  const economiaProjetada = disponivelMes - gastoRestanteProjetado

  return {
    rendaMensal,
    saldoLiquido,
    gastoMes,
    gastoHoje,
    entradasMes,
    recorrentesReservados,
    eventosReservados,
    aportesReservados,
    investimentoReservado,
    comprometido,
    disponivelMes,
    diasRestantes,
    orcamentoDiario,
    disponivelHoje,
    mediaDiaria,
    economiaProjetada,
  }
}

/* --------------------------- distribuição do orçamento -------------------- */

export interface DistribuicaoLinha {
  linha: OrcamentoLinha
  gastoCentavos: number
  pct: number
}

/** Gasto de cada linha do orçamento no mês (pela categoria dos movimentos). */
export function distribuicao(linhas: OrcamentoLinha[], movimentos: Movimento[], mes: string): DistribuicaoLinha[] {
  const movMes = movimentos.filter((m) => m.tipo === 'saida' && m.data.startsWith(mes))
  return [...linhas]
    .sort((a, b) => a.ordem - b.ordem)
    .map((linha) => {
      const set = new Set(linha.categorias)
      const gastoCentavos = movMes
        .filter((m) => (m.categoria ? set.has(m.categoria) : linha.categorias.length === 0))
        .reduce((s, m) => s + m.valorCentavos, 0)
      const pct = linha.limiteCentavos > 0 ? gastoCentavos / linha.limiteCentavos : 0
      return { linha, gastoCentavos, pct }
    })
}

function mesDeslocado(mes: string, delta: number): string {
  const ano = Number(mes.slice(0, 4))
  const m = Number(mes.slice(5, 7))
  const d = new Date(ano, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Sugestão de limite para uma linha: média dos últimos N meses (antes do atual)
 * que TIVERAM gasto na linha. Meses zerados são ignorados — assim um mês sem
 * gasto não puxa a média para baixo artificialmente. 0 se nunca houve gasto.
 */
export function mediaLinha(
  categorias: string[],
  movimentos: Movimento[],
  mesRef: string,
  nMeses = 3,
): number {
  const set = new Set(categorias)
  const casa = (m: Movimento) => (m.categoria ? set.has(m.categoria) : categorias.length === 0)
  const comGasto: number[] = []
  for (let i = 1; i <= nMeses; i++) {
    const mes = mesDeslocado(mesRef, -i)
    const total = movimentos
      .filter((m) => m.tipo === 'saida' && m.data.startsWith(mes) && casa(m))
      .reduce((s, m) => s + m.valorCentavos, 0)
    if (total > 0) comGasto.push(total)
  }
  if (comGasto.length === 0) return 0
  return Math.round(comGasto.reduce((a, b) => a + b, 0) / comGasto.length)
}

/* -------------------------------- objetivos ------------------------------- */

/** Objetivo de reserva de emergência (o âncora), se existir. */
export function reservaDeEmergencia(objetivos: Objetivo[]): Objetivo | undefined {
  return objetivos.find((o) => o.tipo === 'reserva') ?? undefined
}

/* --------------------------------- insights ------------------------------- */

export interface Insight {
  id: string
  tom: 'positivo' | 'atencao' | 'info'
  texto: string
}

const NOME_MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function mesAnterior(mes: string): string {
  const ano = Number(mes.slice(0, 4))
  const m = Number(mes.slice(5, 7))
  const d = new Date(ano, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Insights heurísticos (sem IA de verdade): comparam o mês com o anterior e leem tendências. */
export function gerarInsights(args: {
  mes: string
  movimentos: Movimento[]
  linhas: OrcamentoLinha[]
  snapshots: PatrimonioSnapshot[]
  patrimonioAtual: number
  orc: OrcamentoInteligente
  formatar: (c: number) => string
}): Insight[] {
  const { mes, movimentos, snapshots, patrimonioAtual, orc, formatar } = args
  const out: Insight[] = []
  const anterior = mesAnterior(mes)

  // 1) Categoria com maior redução de gasto vs. mês anterior.
  const porCat = (mm: string) => {
    const mapa = new Map<string, number>()
    for (const m of movimentos) {
      if (m.tipo !== 'saida' || !m.data.startsWith(mm) || !m.categoria) continue
      mapa.set(m.categoria, (mapa.get(m.categoria) ?? 0) + m.valorCentavos)
    }
    return mapa
  }
  const catAtual = porCat(mes)
  const catAnt = porCat(anterior)
  let melhorQueda: { cat: string; delta: number } | undefined
  for (const [cat, valAnt] of catAnt) {
    const delta = valAnt - (catAtual.get(cat) ?? 0)
    if (delta > 0 && (!melhorQueda || delta > melhorQueda.delta)) melhorQueda = { cat, delta }
  }
  if (melhorQueda && melhorQueda.delta >= 1000) {
    out.push({ id: 'queda', tom: 'positivo', texto: `Você economizou ${formatar(melhorQueda.delta)} em ${melhorQueda.cat} este mês.` })
  }

  // 2) Sequência de crescimento do patrimônio (snapshots + atual).
  const serie = serieEvolucao(snapshots, mes, patrimonioAtual, 24)
  let seq = 0
  for (let i = serie.length - 1; i > 0; i--) {
    if (serie[i].valor > serie[i - 1].valor) seq++
    else break
  }
  if (seq >= 2) {
    out.push({ id: 'cresc', tom: 'positivo', texto: `Seu patrimônio cresce há ${seq} ${seq === 1 ? 'mês' : 'meses'}.` })
  }

  // 3) Projeção de economia no fim do mês.
  if (orc.economiaProjetada > 0) {
    out.push({ id: 'proj', tom: 'info', texto: `Mantendo esse ritmo, você termina o mês economizando ${formatar(Math.round(orc.economiaProjetada))}.` })
  } else if (orc.disponivelHoje < 0) {
    out.push({ id: 'atencao', tom: 'atencao', texto: `Você passou do orçamento de hoje em ${formatar(-Math.round(orc.disponivelHoje))}. Amanhã recomeça com folga.` })
  }

  // 4) Gasto total vs. mês anterior.
  const totalAtual = [...catAtual.values()].reduce((a, b) => a + b, 0)
  const totalAnt = [...catAnt.values()].reduce((a, b) => a + b, 0)
  if (totalAnt > 0 && totalAtual > 0 && out.length < 4) {
    const dif = Math.round(((totalAtual - totalAnt) / totalAnt) * 100)
    if (dif <= -5) out.push({ id: 'total', tom: 'positivo', texto: `Seus gastos caíram ${-dif}% em relação a ${NOME_MES[Number(anterior.slice(5, 7)) - 1]}.` })
    else if (dif >= 15) out.push({ id: 'total', tom: 'atencao', texto: `Seus gastos subiram ${dif}% em relação a ${NOME_MES[Number(anterior.slice(5, 7)) - 1]}.` })
  }

  return out.slice(0, 3)
}
