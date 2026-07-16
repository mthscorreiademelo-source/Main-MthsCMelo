/** Um evento da agenda. Fase 1: eventos de um único dia. */
export interface Evento {
  id: string
  titulo: string
  /** Dia do evento no formato ISO yyyy-MM-dd. */
  data: string
  /** Início HH:mm (ignorado se diaInteiro). */
  inicio: string
  /** Fim HH:mm (ignorado se diaInteiro). */
  fim: string
  diaInteiro?: boolean
  cor?: string
  local?: string
  descricao?: string
  criadoEm: number
  atualizadoEm?: number
}
