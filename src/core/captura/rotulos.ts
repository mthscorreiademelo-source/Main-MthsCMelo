import type { Confianca, StatusCaptura, TipoCaptura } from './types'

export const TIPO_INFO: Record<TipoCaptura, { emoji: string; nome: string }> = {
  tarefa: { emoji: '✅', nome: 'Tarefa' },
  lembrete: { emoji: '⏰', nome: 'Lembrete' },
  evento: { emoji: '📅', nome: 'Evento' },
  nota: { emoji: '📝', nome: 'Nota' },
  desenho: { emoji: '✏️', nome: 'Desenho' },
  compra: { emoji: '🛒', nome: 'Compra' },
  despesa: { emoji: '💸', nome: 'Despesa' },
  receita: { emoji: '💰', nome: 'Receita' },
}

export const CONF: Record<Confianca, { t: string; c: string }> = {
  alta: { t: 'boa confiança', c: '#299438' },
  media: { t: 'confiança média', c: '#eb8909' },
  baixa: { t: 'baixa confiança', c: '#808080' },
}

export const STATUS_ROTULO: Record<StatusCaptura, string> = {
  rascunho: 'Rascunho',
  processando: 'Processando',
  aguardando: 'Aguardando revisão',
  concluido: 'Concluído',
  falhou: 'Falhou',
  arquivado: 'Arquivado',
}
