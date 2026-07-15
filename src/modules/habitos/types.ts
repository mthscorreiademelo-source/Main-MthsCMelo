export interface Habito {
  id: string
  nome: string
  criadoEm: number
  ordem: number
}

/** Um registro por dia concluído; id = `${habitoId}:${data}`. */
export interface HabitoRegistro {
  id: string
  habitoId: string
  /** Dia concluído no formato ISO yyyy-MM-dd */
  data: string
}
