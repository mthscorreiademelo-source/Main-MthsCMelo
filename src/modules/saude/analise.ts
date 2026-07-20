import type { Registro } from '../humor/types'
import type {
  Atividade,
  Consulta,
  DoacaoSangue,
  Exame,
  Medida,
  Refeicao,
  SaudeDia,
  Vacina,
} from './types'

/* ----------------------- Recuperação & energia (derivadas) --------------- */

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

/**
 * Recuperação do corpo (0–100), derivada de sono, FC de repouso e exercício —
 * heurística leve, não é diagnóstico. Boa noite de sono e FC baixa elevam;
 * excesso sem sono reduz.
 */
export function recuperacao(dia: SaudeDia | undefined, mediaFc: number): number {
  if (!dia) return 0
  const sono = dia.sonoMin ?? 0
  const sonoScore = clamp((sono / 480) * 100) // 8h = 100
  const fc = dia.fcRepouso
  const fcScore = fc && mediaFc ? clamp(100 - (fc - mediaFc) * 4) : 70
  return clamp(sonoScore * 0.65 + fcScore * 0.35)
}

/** Nível de energia (0–100): sono recente + atividade + hidratação. */
export function energia(dia: SaudeDia | undefined, metaAgua = 2000): number {
  if (!dia) return 0
  const sono = clamp(((dia.sonoMin ?? 0) / 480) * 100)
  const passos = clamp(((dia.passos ?? 0) / 8000) * 100)
  const agua = clamp(((dia.aguaMl ?? 0) / metaAgua) * 100)
  return clamp(sono * 0.5 + passos * 0.3 + agua * 0.2)
}

export function rotuloNivel(v: number): string {
  if (v >= 80) return 'Ótima'
  if (v >= 65) return 'Boa'
  if (v >= 45) return 'Moderada'
  return 'Baixa'
}

/* ------------------------------ Média & séries ---------------------------- */

export function mediaMetrica(dias: SaudeDia[], chave: keyof SaudeDia): number {
  const vals = dias.map((d) => d[chave]).filter((v): v is number => typeof v === 'number')
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
}

/** Últimos N dias (ISO) terminando hoje. */
export function ultimosDias(hoje: string, n: number): string[] {
  const out: string[] = []
  const base = new Date(`${hoje}T00:00:00`)
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(d.getDate() - i)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }
  return out
}

export interface PontoSerie {
  data: string
  valor: number | null
}

/** Série de uma métrica nos últimos N dias (null onde faltar dado). */
export function serie(dias: SaudeDia[], chave: keyof SaudeDia, datas: string[]): PontoSerie[] {
  const mapa = new Map(dias.map((d) => [d.data, d[chave]]))
  return datas.map((data) => {
    const v = mapa.get(data)
    return { data, valor: typeof v === 'number' ? v : null }
  })
}

/* ------------------------------- Alimentação ------------------------------ */

export interface ResumoNutricional {
  calorias: number
  proteinaG: number
  carboidratoG: number
  gorduraG: number
  refeicoes: number
}

export function nutricaoDoDia(refeicoes: Refeicao[], data: string): ResumoNutricional {
  const dia = refeicoes.filter((r) => r.data === data)
  return {
    calorias: dia.reduce((s, r) => s + (r.calorias ?? 0), 0),
    proteinaG: dia.reduce((s, r) => s + (r.proteinaG ?? 0), 0),
    carboidratoG: dia.reduce((s, r) => s + (r.carboidratoG ?? 0), 0),
    gorduraG: dia.reduce((s, r) => s + (r.gorduraG ?? 0), 0),
    refeicoes: dia.length,
  }
}

/* --------------------------------- Insights ------------------------------- */

export interface InsightSaude {
  id: string
  tom: 'positivo' | 'atencao' | 'info'
  icone: string
  texto: string
  /** metadados: período analisado e confiança (nunca causalidade). */
  meta?: string
}

/** Correlação de Pearson entre pares (x,y). */
function correlacao(pares: [number, number][]): number {
  const n = pares.length
  if (n < 4) return 0
  const mx = pares.reduce((s, [x]) => s + x, 0) / n
  const my = pares.reduce((s, [, y]) => s + y, 0) / n
  let num = 0
  let dx = 0
  let dy = 0
  for (const [x, y] of pares) {
    num += (x - mx) * (y - my)
    dx += (x - mx) ** 2
    dy += (y - my) ** 2
  }
  const den = Math.sqrt(dx * dy)
  return den ? num / den : 0
}

/**
 * Insights heurísticos da Saúde. Sempre correlação e período/confiança — nunca
 * causalidade nem diagnóstico. Cruza com o Humor quando há dados.
 */
export function gerarInsightsSaude(args: {
  hoje: string
  dias: SaudeDia[]
  registrosHumor: Registro[]
  exames: Exame[]
}): InsightSaude[] {
  const { hoje, dias, registrosHumor, exames } = args
  const out: InsightSaude[] = []

  const ult28 = new Set(ultimosDias(hoje, 28))
  const ult14 = ultimosDias(hoje, 14)
  const ult7 = ultimosDias(hoje, 7)
  const doPeriodo = dias.filter((d) => ult28.has(d.data))

  // 1) Passos: últimas 2 semanas vs. 2 anteriores.
  const set14 = new Set(ult14)
  const mediaAtual = mediaMetrica(dias.filter((d) => set14.has(d.data)), 'passos')
  const anteriores = ultimosDias(hoje, 28).filter((d) => !set14.has(d))
  const setAnt = new Set(anteriores)
  const mediaAnt = mediaMetrica(dias.filter((d) => setAnt.has(d.data)), 'passos')
  if (mediaAnt > 0 && mediaAtual > 0) {
    const dif = Math.round(((mediaAtual - mediaAnt) / mediaAnt) * 100)
    if (dif >= 8) out.push({ id: 'passos', tom: 'positivo', icone: '📈', texto: `Sua média de passos aumentou ${dif}% nas últimas 4 semanas. Continue assim!`, meta: '28 dias · correlação' })
    else if (dif <= -12) out.push({ id: 'passos', tom: 'atencao', icone: '📉', texto: `Sua média de passos caiu ${-dif}% nas últimas semanas.`, meta: '28 dias' })
  }

  // 2) Sono × humor (correlação).
  const humorPorDia = new Map<string, number[]>()
  for (const r of registrosHumor) {
    if (!humorPorDia.has(r.data)) humorPorDia.set(r.data, [])
    humorPorDia.get(r.data)!.push(r.nivel)
  }
  const paresSonoHumor: [number, number][] = []
  for (const d of doPeriodo) {
    const hs = humorPorDia.get(d.data)
    if (d.sonoMin != null && hs?.length) paresSonoHumor.push([d.sonoMin, hs.reduce((a, b) => a + b, 0) / hs.length])
  }
  const rSonoHumor = correlacao(paresSonoHumor)
  if (rSonoHumor >= 0.4) {
    out.push({ id: 'sono-humor', tom: 'info', icone: '😴', texto: 'Seu humor tende a ser melhor após noites com mais sono.', meta: `${paresSonoHumor.length} dias · correlação ${rSonoHumor.toFixed(2)}` })
  }

  // 3) Sono da semana vs. média do mês.
  const mediaSono28 = mediaMetrica(doPeriodo, 'sonoMin')
  const mediaSono7 = mediaMetrica(dias.filter((d) => new Set(ult7).has(d.data)), 'sonoMin')
  if (mediaSono28 > 0 && mediaSono7 > 0) {
    const dif = Math.round(((mediaSono7 - mediaSono28) / mediaSono28) * 100)
    if (dif >= 6) out.push({ id: 'sono', tom: 'positivo', icone: '🌙', texto: `Você dormiu melhor nos últimos 7 dias — ${dif}% acima da sua média do mês.`, meta: '7 vs 28 dias' })
  }

  // 4) FC de repouso na melhor faixa.
  const fcs = doPeriodo.map((d) => d.fcRepouso).filter((v): v is number => v != null)
  if (fcs.length >= 5) {
    const min = Math.min(...fcs)
    const atualFc = dias.filter((d) => d.data === hoje)[0]?.fcRepouso
    if (atualFc != null && atualFc <= min + 2) {
      out.push({ id: 'fc', tom: 'positivo', icone: '❤️', texto: 'Sua frequência cardíaca em repouso está dentro da sua melhor faixa dos últimos meses.', meta: '28 dias' })
    }
  }

  // 5) Marcador de exame melhorando (ex.: colesterol).
  const porMarcador = new Map<string, Exame[]>()
  for (const e of exames) {
    if (e.valorNum == null) continue
    const k = e.marcador ?? e.nome
    if (!porMarcador.has(k)) porMarcador.set(k, [])
    porMarcador.get(k)!.push(e)
  }
  for (const [marc, lista] of porMarcador) {
    if (lista.length < 2) continue
    const ord = [...lista].sort((a, b) => (a.data < b.data ? -1 : 1))
    const primeiro = ord[0].valorNum!
    const ultimo = ord[ord.length - 1].valorNum!
    const refMax = ord[ord.length - 1].refMax
    if (refMax != null && primeiro > refMax && ultimo < primeiro) {
      const queda = Math.round(((primeiro - ultimo) / primeiro) * 100)
      if (queda >= 5) {
        out.push({ id: `exame-${marc}`, tom: 'positivo', icone: '🩸', texto: `Seu marcador de ${marc} melhorou ${queda}% desde o primeiro exame registrado.`, meta: `${ord.length} exames` })
        break
      }
    }
  }

  return out.slice(0, 4)
}

/* ---------------------------- Linha do tempo ------------------------------ */

export interface EventoProntuario {
  id: string
  data: string
  tipo: 'consulta' | 'exame' | 'vacina' | 'doacao' | 'medida' | 'atividade'
  icone: string
  titulo: string
  detalhe?: string
}

/** Agrega tudo cronologicamente (mais recente primeiro) — o prontuário. */
export function linhaDoTempo(args: {
  consultas: Consulta[]
  exames: Exame[]
  vacinas: Vacina[]
  doacoes: DoacaoSangue[]
  atividades: Atividade[]
  medidas: Medida[]
}): EventoProntuario[] {
  const { consultas, exames, vacinas, doacoes } = args
  const out: EventoProntuario[] = []
  for (const c of consultas) out.push({ id: `c:${c.id}`, data: c.data, tipo: 'consulta', icone: '🩺', titulo: c.titulo ?? c.especialidade ?? 'Consulta', detalhe: c.local })
  for (const e of exames) out.push({ id: `e:${e.id}`, data: e.data, tipo: 'exame', icone: '🧪', titulo: e.nome, detalhe: e.valorNum != null ? `${e.valorNum} ${e.unidade ?? ''}`.trim() : undefined })
  for (const v of vacinas) if (v.data) out.push({ id: `v:${v.id}`, data: v.data, tipo: 'vacina', icone: '💉', titulo: v.nome, detalhe: v.dose })
  for (const d of doacoes) out.push({ id: `d:${d.id}`, data: d.data, tipo: 'doacao', icone: '🩸', titulo: 'Doação de sangue', detalhe: d.local })
  return out.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0))
}
