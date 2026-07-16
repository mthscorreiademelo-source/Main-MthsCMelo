import { salvarDia } from './db'
import type { SaudeDia } from './types'

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

type Campo = keyof Omit<SaudeDia, 'id' | 'criadoEm' | 'atualizadoEm'> | 'sonoHoras'

const ALIAS: Record<string, Campo> = {
  data: 'data',
  date: 'data',
  dia: 'data',
  day: 'data',
  sonomin: 'sonoMin',
  sono: 'sonoHoras',
  sonohoras: 'sonoHoras',
  sleep: 'sonoHoras',
  sleephours: 'sonoHoras',
  horasdesono: 'sonoHoras',
  passos: 'passos',
  steps: 'passos',
  calorias: 'caloriasAtivas',
  caloriasativas: 'caloriasAtivas',
  calories: 'caloriasAtivas',
  kcal: 'caloriasAtivas',
  fcrepouso: 'fcRepouso',
  repouso: 'fcRepouso',
  restinghr: 'fcRepouso',
  rhr: 'fcRepouso',
  exercicio: 'exercicioMin',
  exerciciomin: 'exercicioMin',
  treino: 'exercicioMin',
  workout: 'exercicioMin',
  exercise: 'exercicioMin',
}

function numero(s: string): number | undefined {
  let t = String(s).trim()
  if (!t) return undefined
  t = t.replace(/[.\s](?=\d{3}\b)/g, '').replace(',', '.')
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

function dataISO(s: string): string | null {
  const t = String(s).trim()
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = t.match(/^(\d{1,2})[/](\d{1,2})[/](\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return null
}

/** Aplica um campo reconhecido ao acumulador do dia. */
function aplicar(dia: Partial<SaudeDia>, campo: Campo, valor: number) {
  if (campo === 'sonoHoras') dia.sonoMin = Math.round(valor * 60)
  else if (campo !== 'data') dia[campo] = valor
}

function linhaParaDia(
  registro: Record<string, string>,
  mapa: Map<string, Campo>,
): { data: string; dados: Partial<SaudeDia> } | null {
  let data: string | null = null
  const dados: Partial<SaudeDia> = {}
  for (const [col, bruto] of Object.entries(registro)) {
    const campo = mapa.get(norm(col))
    if (!campo) continue
    if (campo === 'data') {
      data = dataISO(bruto)
    } else {
      const n = numero(bruto)
      if (n !== undefined) aplicar(dados, campo, n)
    }
  }
  return data ? { data, dados } : null
}

function separarCSV(linha: string, delim: string): string[] {
  return linha.split(delim).map((c) => c.replace(/^"|"$/g, '').trim())
}

/** Importa CSV ou JSON de dados de saúde e faz upsert por dia. */
export async function importarSaude(texto: string): Promise<ResultadoImport> {
  const t = texto.trim()
  let linhas: Record<string, string>[] = []

  if (t.startsWith('[') || t.startsWith('{')) {
    const json = JSON.parse(t)
    const arr = Array.isArray(json) ? json : [json]
    linhas = arr.map((o) => {
      const r: Record<string, string> = {}
      for (const [k, v] of Object.entries(o)) r[k] = String(v)
      return r
    })
  } else {
    const brutas = t.split(/\r?\n/).filter((l) => l.trim())
    if (!brutas.length) return { dias: 0, colunas: [], ignoradas: 0 }
    const delim = brutas[0].includes(';') && !brutas[0].includes(',') ? ';' : ','
    const cabecalho = separarCSV(brutas[0], delim)
    linhas = brutas.slice(1).map((l) => {
      const cels = separarCSV(l, delim)
      const r: Record<string, string> = {}
      cabecalho.forEach((c, i) => (r[c] = cels[i] ?? ''))
      return r
    })
  }

  // descobre o mapa coluna→campo a partir das chaves presentes
  const mapa = new Map<string, Campo>()
  const reconhecidas = new Set<string>()
  for (const chave of Object.keys(linhas[0] ?? {})) {
    const campo = ALIAS[norm(chave)]
    if (campo) {
      mapa.set(norm(chave), campo)
      reconhecidas.add(chave)
    }
  }

  let dias = 0
  let ignoradas = 0
  for (const reg of linhas) {
    const item = linhaParaDia(reg, mapa)
    if (!item || Object.keys(item.dados).length === 0) {
      ignoradas++
      continue
    }
    await salvarDia(item.data, item.dados)
    dias++
  }
  return { dias, colunas: [...reconhecidas], ignoradas }
}
