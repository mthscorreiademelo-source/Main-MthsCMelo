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
  /** Grupo (categoria) ao qual a nota pertence; ausente = nota solta */
  grupoId?: string
}

export interface Grupo {
  id: string
  nome: string
  /** Capa em dataURL JPEG, já recortada ao centro em 4:5 (~480×600) */
  capa?: string
  criadoEm: number
  ordem: number
}
