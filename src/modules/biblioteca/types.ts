export type StatusLeitura = 'quero_ler' | 'lendo' | 'lido' | 'abandonado'
export type TipoObra = 'livro' | 'quadrinho' | 'manga'
export type FormatoArquivo = 'epub' | 'pdf' | 'cbz'

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
  /** Miniatura da capa (data URL pequeno) — sincroniza junto. */
  capa?: string
  /** Nota de 0 a 5 (0 = sem nota). */
  nota?: number
  resenha?: string
  generos?: string[]
  paginasTotais?: number
  /** Progresso de leitura em % (0–100). */
  progresso?: number
  /** Localização no leitor (epubcfi / índice de página) — usado na Fase 2. */
  localizacao?: string

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

/** Conteúdo binário local de um livro (não sincroniza). */
export interface ArquivoLivro {
  id: string
  blob: Blob
  formato: FormatoArquivo
  nome: string
  tamanho: number
  criadoEm: number
}
