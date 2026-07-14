export type TipoBloco = 'paragrafo' | 'titulo' | 'lista' | 'todo'

export interface Bloco {
  id: string
  tipo: TipoBloco
  texto: string
  /** Somente para blocos do tipo 'todo' */
  feito?: boolean
}

export interface Pagina {
  id: string
  titulo: string
  blocos: Bloco[]
  criadaEm: number
  atualizadaEm: number
}
