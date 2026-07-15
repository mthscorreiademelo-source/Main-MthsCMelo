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
  /** Post-it ao qual o traço está colado (tinta sobre o papel adesivo) */
  postItId?: string
}

/** Papel adesivo colado no quadro; traços com postItId acompanham seus movimentos. */
export interface PostIt {
  id: string
  /** Centro em coordenadas de mundo */
  x: number
  y: number
  largura: number
  altura: number
  /** Rotação em radianos */
  rotacao?: number
  cor: string
}

/** Posição/zoom do quadro infinito (canto superior esquerdo em mundo + escala). */
export interface Camera {
  x: number
  y: number
  escala: number
}

/**
 * Item colocado no quadro. `imagem` = uma figura (galeria ou página única de
 * PDF). `pdf` = folheador com várias páginas navegáveis por setas.
 */
export interface ItemQuadro {
  id: string
  tipo: 'imagem' | 'pdf'
  /** Usado quando tipo = 'imagem' */
  dataUrl?: string
  /** Páginas (dataURLs) quando tipo = 'pdf' */
  paginas?: string[]
  /** Página exibida atualmente (tipo = 'pdf') */
  paginaAtual?: number
  /** Centro em coordenadas de mundo */
  x: number
  y: number
  largura: number
  altura: number
  /** Rotação em radianos */
  rotacao?: number
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
  /** Imagens/páginas de PDF colocadas no quadro */
  itens?: ItemQuadro[]
  /** Post-its colados no quadro */
  postIts?: PostIt[]
}

export interface Grupo {
  id: string
  nome: string
  /** Capa em dataURL JPEG, já recortada ao centro em 4:5 (~480×600) */
  capa?: string
  criadoEm: number
  ordem: number
}
