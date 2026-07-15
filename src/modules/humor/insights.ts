import { impactoDeFator, mediaPorDiaSemana, tendencia, type Impacto } from '../../core/insights/engine'
import type { SerieDiaria } from '../../core/insights/tipos'
import type { Fator, Registro } from './types'

/** Série diária do humor: média dos registros de cada dia. */
export function serieHumorDiaria(registros: Registro[]): SerieDiaria {
  const soma = new Map<string, { s: number; n: number }>()
  for (const r of registros) {
    const a = soma.get(r.data) ?? { s: 0, n: 0 }
    a.s += r.nivel
    a.n += 1
    soma.set(r.data, a)
  }
  const serie: SerieDiaria = new Map()
  for (const [dia, a] of soma) serie.set(dia, a.s / a.n)
  return serie
}

/** Dias (ISO) em que um fator apareceu em pelo menos um registro. */
export function diasComFator(registros: Registro[], fatorId: string): Set<string> {
  const dias = new Set<string>()
  for (const r of registros) if (r.fatorIds.includes(fatorId)) dias.add(r.data)
  return dias
}

export interface ImpactoFator {
  fator: Fator
  impacto: Impacto
}

/**
 * Impacto de cada fator sobre o humor médio do dia, ordenado do mais positivo
 * ao mais negativo. Só considera fatores com amostra mínima em ambos os lados.
 */
export function impactoDosFatores(
  registros: Registro[],
  fatores: Fator[],
  minDias = 3,
): ImpactoFator[] {
  const serie = serieHumorDiaria(registros)
  const out: ImpactoFator[] = []
  for (const fator of fatores) {
    const dias = diasComFator(registros, fator.id)
    if (dias.size < minDias) continue
    const impacto = impactoDeFator(serie, dias)
    if (impacto && impacto.nSem >= 1) out.push({ fator, impacto })
  }
  return out.sort((a, b) => b.impacto.delta - a.impacto.delta)
}

/** Melhor e pior dia da semana pelo humor médio (0 = domingo). */
export function extremosDiaSemana(registros: Registro[]): {
  melhor: { dia: number; media: number } | null
  pior: { dia: number; media: number } | null
} {
  const medias = mediaPorDiaSemana(serieHumorDiaria(registros))
  let melhor: { dia: number; media: number } | null = null
  let pior: { dia: number; media: number } | null = null
  medias.forEach((m, dia) => {
    if (m.n === 0) return
    if (!melhor || m.media > melhor.media) melhor = { dia, media: m.media }
    if (!pior || m.media < pior.media) pior = { dia, media: m.media }
  })
  return { melhor, pior }
}

/** Média por dia da semana (para o gráfico de Estatísticas). */
export function humorPorDiaSemana(registros: Registro[]): { media: number; n: number }[] {
  return mediaPorDiaSemana(serieHumorDiaria(registros))
}

/** Tendência do humor no período (inclinação por dia). */
export function tendenciaHumor(registros: Registro[]): number {
  const serie = serieHumorDiaria(registros)
  const dias = [...serie.keys()].sort()
  return tendencia(dias.map((d) => serie.get(d)!))
}

/** Fatores mais usados, com contagem, do maior para o menor. */
export function fatoresMaisUsados(
  registros: Registro[],
  fatores: Map<string, Fator>,
  limite = 6,
): { fator: Fator; n: number }[] {
  const cont = new Map<string, number>()
  for (const r of registros) for (const id of r.fatorIds) cont.set(id, (cont.get(id) ?? 0) + 1)
  return [...cont.entries()]
    .map(([id, n]) => ({ fator: fatores.get(id), n }))
    .filter((x): x is { fator: Fator; n: number } => !!x.fator)
    .sort((a, b) => b.n - a.n)
    .slice(0, limite)
}
