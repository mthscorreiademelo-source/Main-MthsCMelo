import type { Evento } from './types'

/**
 * Categorias de evento — a cor representa a categoria (nunca prioridade) e
 * aparece só em pequenos detalhes (ponto, barra lateral, ícone). Cada categoria
 * tem um ícone (emoji) exibido no bloco do evento.
 */
export interface CategoriaEvento {
  id: string
  nome: string
  cor: string
  icone: string
}

export const CATEGORIAS_EVENTO: CategoriaEvento[] = [
  { id: 'trabalho', nome: 'Trabalho', cor: '#299438', icone: '💼' },
  { id: 'pessoal', nome: 'Pessoal', cor: '#4073ff', icone: '🌿' },
  { id: 'estudos', nome: 'Estudos', cor: '#884dff', icone: '📚' },
  { id: 'saude', nome: 'Saúde', cor: '#eb8909', icone: '🩺' },
  { id: 'familia', nome: 'Família', cor: '#e0a80c', icone: '🏡' },
  { id: 'importante', nome: 'Importante', cor: '#d1453b', icone: '⭐' },
]

const POR_ID = new Map(CATEGORIAS_EVENTO.map((c) => [c.id, c]))

export function categoriaDe(e: Pick<Evento, 'categoria'>): CategoriaEvento | undefined {
  return e.categoria ? POR_ID.get(e.categoria) : undefined
}

/** Cor efetiva do evento: a da categoria, senão a cor livre, senão o padrão. */
export function corEfetiva(e: Pick<Evento, 'categoria' | 'cor'>): string {
  return categoriaDe(e)?.cor ?? e.cor ?? '#4073ff'
}

/** Ícone do evento (da categoria) ou um pino neutro. */
export function iconeEvento(e: Pick<Evento, 'categoria'>): string {
  return categoriaDe(e)?.icone ?? '📌'
}

/** Iniciais para o avatar de um participante (1–2 letras). */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}
