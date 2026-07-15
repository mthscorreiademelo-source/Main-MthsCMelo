export type TipoMovimento = 'entrada' | 'saida'

export interface Movimento {
  id: string
  tipo: TipoMovimento
  /** Valor em centavos (inteiro), sempre positivo; o sinal vem do tipo */
  valorCentavos: number
  descricao: string
  categoria?: string
  /** Dia do movimento no formato ISO yyyy-MM-dd */
  data: string
  criadoEm: number
}
