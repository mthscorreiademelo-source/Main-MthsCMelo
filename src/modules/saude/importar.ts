import { salvarDia } from './db'
import type { MetricaSaude, SaudeDia } from './types'

export interface ResultadoImport {
  dias: number
  colunas: string[]
  ignoradas: number
}

/** Normaliza cabeçalho: minúsculo, sem acento, só letras/números. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

type Unidade = 'numero' | 'min' | 'horas' | 'auto'
type Agg = 'sum' | 'avg'

interface Medida {
  campo: MetricaSaude
  agg: Agg
  unidade: Unidade
  /** casa contra o cabeçalho normalizado (sem espaços/acentos). */
  casa: (h: string) => boolean
}

// Ordem = prioridade. O primeiro que casar reivindica a coluna; cada campo é
// preenchido por uma única coluna (evita contar "active" e "total" duas vezes).
const MEDIDAS: Medida[] = [
  { campo: 'sonoMin', agg: 'sum', unidade: 'min', casa: (h) => /sleep|sono/.test(h) && /min/.test(h) },
  { campo: 'sonoMin', agg: 'sum', unidade: 'horas', casa: (h) => /sleep|sono/.test(h) && /hour|hora|hr/.test(h) },
  { campo: 'sonoMin', agg: 'sum', unidade: 'auto', casa: (h) => /sleep|sono/.test(h) },
  { campo: 'fcRepouso', agg: 'avg', unidade: 'numero', casa: (h) => /resting/.test(h) && /heart|hr|bpm|pulse/.test(h) },
  { campo: 'fcRepouso', agg: 'avg', unidade: 'numero', casa: (h) => /(fc|freq).*repouso|repouso.*(fc|card)/.test(h) },
  { campo: 'caloriasAtivas', agg: 'sum', unidade: 'numero', casa: (h) => /activ/.test(h) && /calor|calorie|energy/.test(h) },
  { campo: 'caloriasAtivas', agg: 'sum', unidade: 'numero', casa: (h) => /calor|calorie|energy|kcal/.test(h) },
  { campo: 'passos', agg: 'sum', unidade: 'numero', casa: (h) => /steps|passos/.test(h) },
  { campo: 'exercicioMin', agg: 'sum', unidade: 'min', casa: (h) => /(exercise|workout|treino|exercicio)/.test(h) },
]

const DATA_PRIORIDADE = [
  'date',
  'data',
  'day',
  'dia',
  'startdate',
  'datetime',
  'starttime',
  'start',
  'timestamp',
  'endtime',
  'end',
  'time',
]

function numero(s: string): number | undefined {
  let t = String(s).trim()
  if (!t) return undefined
  t = t.replace(/[.\s](?=\d{3}\b)/g, '').replace(',', '.')
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

/** Converte texto de duração para minutos. Aceita ISO (PT#H#M), H:MM, "7h 30m",
 *  ou número puro (interpretado pela unidade: min, horas, ou auto). */
function minutos(s: string, unidade: Unidade): number | undefined {
  const t = String(s).trim()
  if (!t) return undefined
  const iso = t.match(/^p?t?(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s)?$/i)
  if (/^pt/i.test(t) && iso) {
    return (Number(iso[1] || 0) * 60 + Number(iso[2] || 0) + Number(iso[3] || 0) / 60) || undefined
  }
  const relogio = t.match(/^(\d+):(\d{2})(?::(\d{2}))?$/)
  if (relogio) return Number(relogio[1]) * 60 + Number(relogio[2]) + Number(relogio[3] || 0) / 60
  const hm = t.match(/(\d+(?:\.\d+)?)\s*h(?:\s*(\d+)\s*m)?|(\d+)\s*m(?:in)?\b/i)
  if (hm && /[hm]/i.test(t.replace(/\d|\s|\./g, ''))) {
    if (hm[1] != null) return Number(hm[1]) * 60 + Number(hm[2] || 0)
    if (hm[3] != null) return Number(hm[3])
  }
  const n = numero(t)
  if (n === undefined) return undefined
  if (unidade === 'min') return n
  if (unidade === 'horas') return n * 60
  return n >= 20 ? n : n * 60 // auto: número grande = minutos, pequeno = horas
}

function dataISO(s: string): string | null {
  const t = String(s).trim()
  let m = t.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = t.match(/^(\d{1,2})[/](\d{1,2})[/](\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  const d = new Date(t)
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  return null
}

function separarCSV(linha: string, delim: string): string[] {
  return linha.split(delim).map((c) => c.replace(/^"|"$/g, '').trim())
}

/** Descobre a coluna de data e o mapa coluna→medida a partir dos cabeçalhos. */
function mapear(cabecalhos: string[]) {
  const normis = cabecalhos.map(norm)
  let colData: string | null = null
  for (const alvo of DATA_PRIORIDADE) {
    const i = normis.findIndex((h) => h === alvo || h.includes(alvo))
    if (i >= 0) {
      colData = cabecalhos[i]
      break
    }
  }
  const mapa = new Map<string, Medida>()
  const usadas = new Set<MetricaSaude>()
  for (const medida of MEDIDAS) {
    if (usadas.has(medida.campo)) continue
    const i = normis.findIndex((h, idx) => cabecalhos[idx] !== colData && medida.casa(h))
    if (i >= 0) {
      mapa.set(cabecalhos[i], medida)
      usadas.add(medida.campo)
    }
  }
  return { colData, mapa }
}

interface Acumulado {
  sum: number
  count: number
}

export async function importarSaude(texto: string): Promise<ResultadoImport> {
  const t = texto.trim()
  let cabecalhos: string[] = []
  let registros: Record<string, string>[] = []

  if (t.startsWith('[') || t.startsWith('{')) {
    const json = JSON.parse(t)
    const arr = Array.isArray(json) ? json : [json]
    registros = arr.map((o) => {
      const r: Record<string, string> = {}
      for (const [k, v] of Object.entries(o)) r[k] = v == null ? '' : String(v)
      return r
    })
    cabecalhos = Object.keys(registros[0] ?? {})
  } else {
    const linhas = t.split(/\r?\n/).filter((l) => l.trim())
    if (!linhas.length) return { dias: 0, colunas: [], ignoradas: 0 }
    const delim = linhas[0].includes(';') && !linhas[0].includes(',') ? ';' : ','
    cabecalhos = separarCSV(linhas[0], delim)
    registros = linhas.slice(1).map((l) => {
      const cels = separarCSV(l, delim)
      const r: Record<string, string> = {}
      cabecalhos.forEach((c, i) => (r[c] = cels[i] ?? ''))
      return r
    })
  }

  const { colData, mapa } = mapear(cabecalhos)
  if (!colData || mapa.size === 0) return { dias: 0, colunas: [], ignoradas: registros.length }

  // acumula por dia e por campo (soma ou média)
  const porDia = new Map<string, Map<MetricaSaude, Acumulado>>()
  let ignoradas = 0
  for (const reg of registros) {
    const data = dataISO(reg[colData] ?? '')
    if (!data) {
      ignoradas++
      continue
    }
    let algum = false
    for (const [col, medida] of mapa) {
      const bruto = reg[col]
      if (!bruto?.trim()) continue
      const v = medida.unidade === 'numero' ? numero(bruto) : minutos(bruto, medida.unidade)
      if (v === undefined) continue
      if (!porDia.has(data)) porDia.set(data, new Map())
      const campos = porDia.get(data)!
      const a = campos.get(medida.campo) ?? { sum: 0, count: 0 }
      a.sum += v
      a.count += 1
      campos.set(medida.campo, a)
      algum = true
    }
    if (!algum) ignoradas++
  }

  const aggPorCampo = new Map(MEDIDAS.map((m) => [m.campo, m.agg]))
  for (const [data, campos] of porDia) {
    const mudancas: Partial<SaudeDia> = {}
    for (const [campo, a] of campos) {
      mudancas[campo] = Math.round(aggPorCampo.get(campo) === 'avg' ? a.sum / a.count : a.sum)
    }
    await salvarDia(data, mudancas)
  }

  const colunas = [...mapa.keys()]
  return { dias: porDia.size, colunas, ignoradas }
}
