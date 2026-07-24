export type StatusLeitura = 'quero_ler' | 'lendo' | 'lido' | 'abandonado'
export type TipoObra = 'livro' | 'quadrinho' | 'manga'
export type FormatoArquivo = 'epub' | 'pdf' | 'cbz' | 'mobi'

/**
 * Um item da biblioteca. Os metadados (inclusive a capa-miniatura) sincronizam
 * como os outros módulos; o arquivo em si (os bytes) fica só no aparelho, na
 * tabela local `arquivosLivros`.
 */
export interface Livro {
  id: string
  titulo: string
  autor?: string
  tipo: TipoObra
  status: StatusLeitura
  /** Nome da coleção/série (ex.: "Harry Potter"). */
  colecao?: string
  /** Número do volume dentro da coleção (1, 2, 3…). */
  numero?: number
  /**
   * Capa: pode ser uma miniatura embutida (data URL) OU um link da web.
   * Sincroniza junto (o link é levíssimo; a imagem em si é cacheada por
   * aparelho pelo service worker, então aparece offline).
   */
  capa?: string
  /** Nota de 0 a 5 (0 = sem nota). */
  nota?: number
  resenha?: string
  generos?: string[]
  /** Ano de publicação (para ordenar por ano). */
  ano?: number
  paginasTotais?: number
  /** Progresso de leitura em % (0–100). */
  progresso?: number
  /** Localização no leitor (epubcfi / índice de página) — usado na Fase 2. */
  localizacao?: string

  /** Este item é um COMPILADO (série de quadrinho/mangá) que agrupa volumes. */
  ehCompilado?: boolean
  /** Volume que pertence a um compilado (id do compilado-pai). */
  compiladoId?: string

  // Arquivo local (opcional)
  temArquivo?: boolean
  formato?: FormatoArquivo
  arquivoNome?: string
  arquivoTamanho?: number

  adicionadoEm: number
  iniciadoEm?: number
  concluidoEm?: number
  atualizadoEm?: number
}

/** Nota de leitura vinculada a um livro (e opcionalmente a um trecho). */
export interface NotaLivro {
  id: string
  livroId: string
  /** Texto da nota/resumo. */
  resumo: string
  /** Trecho citado ao qual a nota se refere. */
  trecho?: string
  capitulo?: string
  tags?: string[]
  /** Localização no EPUB (epubcfi) para reabrir exatamente ali. */
  cfi?: string
  pagina?: number
  favorito?: boolean
  criadoEm: number
  atualizadoEm?: number
}

/** Destaque (trecho grifado) de um livro. */
export interface Destaque {
  id: string
  livroId: string
  trecho: string
  capitulo?: string
  cfi?: string
  pagina?: number
  cor?: string
  favorito?: boolean
  criadoEm: number
  atualizadoEm?: number
}

/** Conteúdo binário local de um livro (não sincroniza). */
export interface ArquivoLivro {
  id: string
  blob: Blob
  formato: FormatoArquivo
  nome: string
  tamanho: number
  criadoEm: number
}
