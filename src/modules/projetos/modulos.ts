/**
 * Módulos disponíveis no Workspace de um projeto. Cada projeto ativa apenas os
 * que fazem sentido — nada é obrigatório. Alguns módulos são INTEGRADOS (leem
 * e escrevem nos dados reais do Lume: tarefas, agenda, finanças, notas); outros
 * são LOCAIS (guardados no projeto via projetoItens: ideias, links, etc.).
 */
export type TipoModulo = 'integrado' | 'local'

export interface DefModulo {
  id: string
  nome: string
  emoji: string
  tipo: TipoModulo
  descricao: string
}

export const MODULOS_PROJETO: DefModulo[] = [
  { id: 'tarefas', nome: 'Tarefas', emoji: '✅', tipo: 'integrado', descricao: 'Tarefas do projeto, sincronizadas com a aba Tarefas.' },
  { id: 'agenda', nome: 'Agenda', emoji: '📅', tipo: 'integrado', descricao: 'Eventos do projeto, sincronizados com a Agenda.' },
  { id: 'financeiro', nome: 'Financeiro', emoji: '💰', tipo: 'integrado', descricao: 'Receitas e despesas do projeto, em Finanças.' },
  { id: 'notas', nome: 'Notas', emoji: '📝', tipo: 'integrado', descricao: 'Cadernos e anotações do projeto.' },
  { id: 'ideias', nome: 'Ideias', emoji: '💡', tipo: 'local', descricao: 'Banco de ideias do projeto.' },
  { id: 'links', nome: 'Links', emoji: '🔗', tipo: 'local', descricao: 'Sites, GitHub, Figma, Drive, referências.' },
  { id: 'pessoas', nome: 'Pessoas', emoji: '👥', tipo: 'local', descricao: 'Clientes, parceiros, equipe, contatos.' },
  { id: 'aprendizados', nome: 'Aprendizados', emoji: '🎓', tipo: 'local', descricao: 'Lições, erros, boas práticas.' },
  { id: 'checklist', nome: 'Checklist', emoji: '☑️', tipo: 'local', descricao: 'Uma lista simples de itens a marcar.' },
  { id: 'base', nome: 'Base de dados', emoji: '🗃️', tipo: 'local', descricao: 'Uma tabela personalizada de registros.' },
]

export function defModulo(id: string): DefModulo | undefined {
  return MODULOS_PROJETO.find((m) => m.id === id)
}

/* -------------------------------- Templates ------------------------------- */

export interface Template {
  id: string
  nome: string
  emoji: string
  modulos: string[]
}

export const TEMPLATES: Template[] = [
  { id: 'vazio', nome: 'Em branco', emoji: '⬜', modulos: ['tarefas', 'notas'] },
  { id: 'pessoal', nome: 'Projeto pessoal', emoji: '🌱', modulos: ['tarefas', 'agenda', 'notas', 'ideias', 'aprendizados'] },
  { id: 'app', nome: 'Aplicativo', emoji: '📱', modulos: ['tarefas', 'agenda', 'notas', 'ideias', 'links', 'base', 'aprendizados'] },
  { id: 'empresa', nome: 'Empresa', emoji: '🏢', modulos: ['tarefas', 'agenda', 'financeiro', 'pessoas', 'notas', 'links', 'base'] },
  { id: 'startup', nome: 'Startup', emoji: '🚀', modulos: ['tarefas', 'agenda', 'financeiro', 'ideias', 'pessoas', 'notas', 'links'] },
  { id: 'estudo', nome: 'Estudo / Pesquisa', emoji: '📚', modulos: ['tarefas', 'agenda', 'notas', 'links', 'aprendizados'] },
  { id: 'viagem', nome: 'Viagem', emoji: '✈️', modulos: ['agenda', 'checklist', 'pessoas', 'financeiro', 'notas', 'links'] },
  { id: 'reforma', nome: 'Reforma', emoji: '🛠️', modulos: ['tarefas', 'financeiro', 'checklist', 'pessoas', 'notas'] },
  { id: 'evento', nome: 'Evento', emoji: '🎉', modulos: ['tarefas', 'agenda', 'checklist', 'pessoas', 'financeiro', 'notas'] },
  { id: 'financeiro', nome: 'Planejamento financeiro', emoji: '📊', modulos: ['financeiro', 'tarefas', 'notas', 'aprendizados'] },
]

/** Constrói a lista de módulos (visíveis, ordenados) para um template. */
export function modulosDoTemplate(ids: string[]): { id: string; visivel: boolean; ordem: number }[] {
  return ids.map((id, i) => ({ id, visivel: true, ordem: i }))
}
