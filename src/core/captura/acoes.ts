/**
 * Registro central das Quick Actions estruturadas (Fase 1).
 *
 * Cada ação apenas descreve a si mesma; o LauncherCaptura decide o fluxo por
 * `id`, reutilizando os editores existentes de cada módulo. Adicionar uma ação
 * nova é acrescentar uma entrada aqui e um caso no launcher.
 */

export type IdAcao =
  | 'tarefa'
  | 'evento'
  | 'nota'
  | 'desenho'
  | 'despesa'
  | 'receita'
  | 'compra'

export type GrupoAcao = 'criar' | 'registrar' | 'comprar' | 'capturar' | 'executar'

export interface AcaoRapida {
  id: IdAcao
  grupo: GrupoAcao
  nome: string
  /** Frase curta mostrada no modo expandido. */
  descricao: string
  emoji: string
  /** Cor de destaque (fundo suave + ícone). */
  cor: string
}

export const GRUPOS: { id: GrupoAcao; nome: string }[] = [
  { id: 'criar', nome: 'Criar' },
  { id: 'registrar', nome: 'Registrar' },
  { id: 'comprar', nome: 'Comprar e armazenar' },
]

export const ACOES: AcaoRapida[] = [
  { id: 'tarefa', grupo: 'criar', nome: 'Tarefa', descricao: 'Algo a fazer, com data e prioridade.', emoji: '✅', cor: '#4073ff' },
  { id: 'evento', grupo: 'criar', nome: 'Evento', descricao: 'Um compromisso na agenda.', emoji: '📅', cor: '#7c9885' },
  { id: 'nota', grupo: 'criar', nome: 'Nota', descricao: 'Escrever agora, organizar depois.', emoji: '📝', cor: '#884dff' },
  { id: 'desenho', grupo: 'criar', nome: 'Desenho', descricao: 'Rabiscar num quadro livre.', emoji: '✏️', cor: '#0f9b9b' },
  { id: 'despesa', grupo: 'registrar', nome: 'Despesa', descricao: 'Registrar uma saída de dinheiro.', emoji: '💸', cor: '#c0405e' },
  { id: 'receita', grupo: 'registrar', nome: 'Receita', descricao: 'Registrar uma entrada de dinheiro.', emoji: '💰', cor: '#299438' },
  { id: 'compra', grupo: 'comprar', nome: 'Item de compra', descricao: 'Adicionar à lista de compras.', emoji: '🛒', cor: '#eb8909' },
]

export const acaoPorId = (id: IdAcao) => ACOES.find((a) => a.id === id)

/** Ações mostradas por padrão na seção "Ações rápidas" do Hoje. */
export const ACOES_HOJE_PADRAO: IdAcao[] = ['tarefa', 'nota', 'evento', 'compra', 'despesa', 'desenho']
