/**
 * Modelos (templates) de nota — estruturas iniciais editáveis. Só sugerem
 * blocos; nada trava o conteúdo depois.
 */
import { db } from '../../core/db/db'
import { criarPagina, novoBloco } from './db'
import type { TipoBloco } from './types'

export interface TemplateNota {
  id: string
  nome: string
  emoji: string
  titulo?: string
  blocos: { tipo: TipoBloco; texto: string }[]
}

export const TEMPLATES_NOTA: TemplateNota[] = [
  {
    id: 'reuniao', nome: 'Reunião', emoji: '👥', titulo: 'Reunião',
    blocos: [
      { tipo: 'titulo', texto: 'Pauta' },
      { tipo: 'lista', texto: '' },
      { tipo: 'titulo', texto: 'Decisões' },
      { tipo: 'lista', texto: '' },
      { tipo: 'titulo', texto: 'Ações' },
      { tipo: 'todo', texto: '' },
    ],
  },
  {
    id: 'diario', nome: 'Diário', emoji: '📔', titulo: '',
    blocos: [
      { tipo: 'titulo', texto: 'Como foi o dia' },
      { tipo: 'paragrafo', texto: '' },
      { tipo: 'titulo', texto: 'Grato por' },
      { tipo: 'lista', texto: '' },
    ],
  },
  {
    id: 'estudo', nome: 'Estudo', emoji: '📚', titulo: '',
    blocos: [
      { tipo: 'titulo', texto: 'Conceitos-chave' },
      { tipo: 'lista', texto: '' },
      { tipo: 'titulo', texto: 'Resumo' },
      { tipo: 'paragrafo', texto: '' },
      { tipo: 'titulo', texto: 'Dúvidas' },
      { tipo: 'todo', texto: '' },
    ],
  },
  {
    id: 'decisao', nome: 'Decisão', emoji: '⚖️', titulo: '',
    blocos: [
      { tipo: 'titulo', texto: 'Contexto' },
      { tipo: 'paragrafo', texto: '' },
      { tipo: 'titulo', texto: 'Opções' },
      { tipo: 'lista', texto: '' },
      { tipo: 'titulo', texto: 'Decisão' },
      { tipo: 'paragrafo', texto: '' },
    ],
  },
  {
    id: 'leitura', nome: 'Leitura', emoji: '📖', titulo: '',
    blocos: [
      { tipo: 'titulo', texto: 'Citações' },
      { tipo: 'lista', texto: '' },
      { tipo: 'titulo', texto: 'Ideias' },
      { tipo: 'paragrafo', texto: '' },
    ],
  },
  {
    id: 'planejamento', nome: 'Planejamento', emoji: '🗓️', titulo: '',
    blocos: [
      { tipo: 'titulo', texto: 'Objetivo' },
      { tipo: 'paragrafo', texto: '' },
      { tipo: 'titulo', texto: 'Passos' },
      { tipo: 'todo', texto: '' },
    ],
  },
]

export async function criarPaginaDeTemplate(tpl: TemplateNota, grupoId?: string): Promise<string> {
  const id = await criarPagina(grupoId, 'texto')
  await db.paginas.update(id, {
    titulo: tpl.titulo ?? '',
    blocos: tpl.blocos.map((b) => novoBloco(b.tipo, b.texto)),
    atualizadaEm: Date.now(),
  })
  return id
}
