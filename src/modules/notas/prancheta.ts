import type { ConteudoCopiado } from './components/QuadroInfinito'

/**
 * Área de transferência interna do quadro (memória da sessão).
 * Permite copiar num desenho e colar em outro.
 */
let dados: ConteudoCopiado | null = null

export function guardarPrancheta(conteudo: ConteudoCopiado) {
  dados = conteudo
}

export function lerPrancheta(): ConteudoCopiado | null {
  return dados
}
