import type { ReactNode } from 'react'
import type { Tamanho } from '../CartaoHoje'
import type { DadosHoje } from '../dados'

/** Props que todo card do Hoje recebe. */
export interface PropsCard {
  dados: DadosHoje
  /** Respiro interno (o herói do modo vem como 'hero'). */
  tamanho?: Tamanho
}

/** Entrada do registry: como desenhar o card e se ele tem dado para aparecer. */
export interface EntradaCard {
  Componente: (p: PropsCard) => ReactNode
  /** Um card só entra na grade se isto for verdadeiro (senão os vizinhos preenchem). */
  disponivel: (d: DadosHoje) => boolean
}

/** Nome do projeto por id (para rótulos de tarefas/foco). */
export function nomeProjeto(dados: DadosHoje, id: string | undefined): string | undefined {
  if (!id) return undefined
  return dados.projetos.find((p) => p.id === id)?.nome
}
