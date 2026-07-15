/** Nível de humor de 1 (péssimo) a 5 (ótimo), estilo Daylio. */
export type NivelHumor = 1 | 2 | 3 | 4 | 5

/** Um registro de humor por dia; id = a própria data ISO (yyyy-MM-dd). */
export interface HumorRegistro {
  id: string
  /** Dia no formato ISO yyyy-MM-dd */
  data: string
  nivel: NivelHumor
  nota?: string
  atualizadoEm: number
}
