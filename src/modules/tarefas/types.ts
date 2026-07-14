export interface Task {
  id: string
  titulo: string
  nota?: string
  /** Data agendada no formato ISO yyyy-MM-dd (sem hora no MVP) */
  data?: string
  /** Timestamp de conclusão; ausente = pendente */
  concluidaEm?: number
  criadaEm: number
  /** Reservado para ordenação manual futura */
  ordem: number
}
