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
  /** Item (PDF folheador) ao qual o traço está colado */
  itemId?: string
  /** Página do folheador em que o traço foi feito (com itemId) */
  paginaItem?: number
  /** Pedaço resultante de corte pela borracha dura: pontas retas (sem afilar). */
  cortado?: boolean
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
  /** rotação da "folha" em radianos (2 dedos giram o quadro). */
  rot?: number
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

/** Metadados de um arquivo anexado (o conteúdo fica na tabela `arquivos`). */
export interface ArquivoRef {
  id: string
  nome: string
  /** Tipo MIME (ex.: image/png, video/mp4, application/pdf) */
  tipo: string
  /** Tamanho em bytes */
  tamanho: number
  criadoEm: number
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
  tipo?: 'texto' | 'desenho' | 'arquivos'
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
  /** Arquivos anexados (somente tipo 'arquivos') — metadados; blob na tabela */
  arquivos?: ArquivoRef[]
}

export interface Grupo {
  id: string
  nome: string
  /** Capa exibida no modo claro (e padrão). dataURL 4:5 (~480×600). */
  capa?: string
  /** Capa alternativa exibida no modo escuro (opcional). */
  capaDark?: string
  criadoEm: number
  ordem: number
}

/** Escolhe a capa conforme o tema: no escuro usa capaDark se houver. */
export function capaDoGrupo(grupo: Pick<Grupo, 'capa' | 'capaDark'>, tema: 'light' | 'dark'): string | undefined {
  return tema === 'dark' ? (grupo.capaDark ?? grupo.capa) : grupo.capa
}
