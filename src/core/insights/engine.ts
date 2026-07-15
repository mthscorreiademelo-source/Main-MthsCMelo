import { getDay, parseISO } from 'date-fns'
import type { SerieDiaria } from './tipos'

/** Correlação de Pearson entre dois vetores alinhados (−1..1). */
export function pearson(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length)
  if (n < 3) return null
  let sa = 0
  let sb = 0
  for (let i = 0; i < n; i++) {
    sa += a[i]
    sb += b[i]
  }
  const ma = sa / n
  const mb = sb / n
  let num = 0
  let da = 0
  let dbb = 0
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma
    const y = b[i] - mb
    num += x * y
    da += x * x
    dbb += y * y
  }
  if (da === 0 || dbb === 0) return null
  return num / Math.sqrt(da * dbb)
}

/** Correlação entre duas séries diárias, alinhando pelos dias em comum. */
export function correlacaoSeries(
  x: SerieDiaria,
  y: SerieDiaria,
): { r: number; n: number } | null {
  const a: number[] = []
  const b: number[] = []
  for (const [dia, vx] of x) {
    const vy = y.get(dia)
    if (vy !== undefined) {
      a.push(vx)
      b.push(vy)
    }
  }
  const r = pearson(a, b)
  return r === null ? null : { r, n: a.length }
}

export interface Impacto {
  com: number
  sem: number
  delta: number
  nCom: number
  nSem: number
}

/**
 * Impacto de um fator sobre um alvo: média do alvo nos dias em que o fator
 * esteve presente vs. ausente. Ex.: humor médio com exercício × sem exercício.
 */
export function impactoDeFator(alvo: SerieDiaria, diasPresenca: Set<string>): Impacto | null {
  let comSoma = 0
  let comN = 0
  let semSoma = 0
  let semN = 0
  for (const [dia, v] of alvo) {
    if (diasPresenca.has(dia)) {
      comSoma += v
      comN++
    } else {
      semSoma += v
      semN++
    }
  }
  if (comN === 0 || semN === 0) return null
  const com = comSoma / comN
  const sem = semSoma / semN
  return { com, sem, delta: com - sem, nCom: comN, nSem: semN }
}

/** Média do alvo por dia da semana (0 = domingo). */
export function mediaPorDiaSemana(alvo: SerieDiaria): { media: number; n: number }[] {
  const soma = Array(7).fill(0)
  const cont = Array(7).fill(0)
  for (const [dia, v] of alvo) {
    const d = getDay(parseISO(dia))
    soma[d] += v
    cont[d] += 1
  }
  return soma.map((s, i) => ({ media: cont[i] ? s / cont[i] : 0, n: cont[i] }))
}

/**
 * Tendência de uma série ao longo do tempo — inclinação da regressão linear
 * (valor por dia). Positiva = subindo, ~0 = estável, negativa = descendo.
 */
export function tendencia(serieOrdenada: number[]): number {
  const n = serieOrdenada.length
  if (n < 3) return 0
  const mx = (n - 1) / 2
  let my = 0
  for (const v of serieOrdenada) my += v
  my /= n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    const dx = i - mx
    num += dx * (serieOrdenada[i] - my)
    den += dx * dx
  }
  return den === 0 ? 0 : num / den
}
