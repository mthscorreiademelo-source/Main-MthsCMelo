export type TipoBloco = 'paragrafo' | 'titulo' | 'lista' | 'todo'

export interface Bloco {
  id: string
  tipo: TipoBloco
  texto: string
  /** Somente para blocos do tipo 'todo' */
  feito?: boolean
}

export type TipoCaneta = 'lapis' | 'tinteiro' | 'marcador' | 'pincel'

/** Traço de desenho: pontos achatados [x, y, pressão, x, y, pressão, …] */
export interface Traco {
  cor: string
  espessura: number
  pontos: number[]
  /** Caneta usada; ausente = 'tinteiro' (traços antigos) */
  ferramenta?: TipoCaneta
  /** Assistência de caligrafia (0..1) usada ao desenhar; ausente = padrão da caneta */
  suavizacao?: number
}

/** Posição/zoom do quadro infinito (canto superior esquerdo em mundo + escala). */
export interface Camera {
  x: number
  y: number
  escala: number
}

export interface Pagina {
  id: string
  titulo: string
  blocos: Bloco[]
  criadaEm: number
  atualizadaEm: number
  /** Grupo (categoria) ao qual a nota pertence; ausente = nota solta */
  grupoId?: string
  /** Tipo da nota; ausente = 'texto' */
  tipo?: 'texto' | 'desenho'
  /** Traços do desenho (somente tipo 'desenho') */
  tracos?: Traco[]
  /** Miniatura JPEG (dataURL) para preview na lista */
  miniatura?: string
  /** Última posição/zoom do quadro infinito */
  camera?: Camera
}

export interface Grupo {
  id: string
  nome: string
  /** Capa em dataURL JPEG, já recortada ao centro em 4:5 (~480×600) */
  capa?: string
  criadoEm: number
  ordem: number
}
