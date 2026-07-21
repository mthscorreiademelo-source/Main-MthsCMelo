import { valorDoDia } from './progresso'
import type { Habito, HabitoRegistro } from './types'

/** Quantos ml um valor do hábito representa (copo≈250; unidade em ml conta 1:1). */
export function mlDoHabito(h: Habito, valor: number): number {
  const fator = h.mlPorUnidade ?? (h.unidade?.toLowerCase().includes('ml') ? 1 : 250)
  return valor * fator
}

/** Soma, em ml, a água registrada hoje pelos hábitos marcados como "conta como água". */
export function somaAguaHabitos(
  habitos: Habito[],
  registros: HabitoRegistro[],
  data: string,
): number {
  let ml = 0
  for (const h of habitos) {
    if (!h.vinculoAgua || h.arquivado) continue
    const reg = registros.find((r) => r.habitoId === h.id && r.data === data)
    ml += mlDoHabito(h, valorDoDia(h, reg))
  }
  return Math.round(ml)
}
