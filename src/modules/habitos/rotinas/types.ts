/**
 * Rotinas — sequências reutilizáveis de ações executadas em conjunto
 * (ex.: rotina matinal, rotina noturna, pré-treino). Uma rotina pode conter
 * hábitos (que registram no próprio módulo, sem duplicar), passos de checklist,
 * temporizadores, notas e ações. Nada é obrigatório: a rotina apenas organiza.
 */

export type TipoEtapa = 'habito' | 'tarefa' | 'checklist' | 'timer' | 'nota' | 'acao'

/** Período do dia sugerido para a rotina / etapa. */
export type PeriodoDia = 'manha' | 'tarde' | 'noite' | 'qualquer'

export interface EtapaRotina {
  id: string
  tipo: TipoEtapa
  titulo: string
  /** tipo 'habito': completar a etapa registra este hábito (sem duplicar). */
  habitoId?: string
  /** Duração estimada / do temporizador, em minutos. */
  duracaoMin?: number
  /** Instrução curta mostrada durante a execução guiada. */
  instrucao?: string
  /** Etapa que pode ser pulada sem "quebrar" a rotina. */
  opcional?: boolean
}

export interface Rotina {
  id: string
  nome: string
  icone?: string
  cor?: string
  descricao?: string
  etapas: EtapaRotina[]
  /** Sugestões de quando executar (não obrigam nada). */
  periodo?: PeriodoDia
  horario?: string // HH:mm
  /** Dias da semana sugeridos (0=dom … 6=sáb). Vazio = qualquer dia. */
  dias?: number[]
  arquivada?: boolean
  ordem: number
  criadoEm: number
  atualizadoEm?: number
}

/** Uma execução (histórico) de uma rotina num dia. */
export interface ExecucaoRotina {
  id: string
  rotinaId: string
  /** Dia ISO yyyy-MM-dd. */
  data: string
  iniciadoEm: number
  concluidoEm?: number
  /** ids das etapas concluídas. */
  feitas: string[]
  /** ids das etapas puladas. */
  puladas?: string[]
  atualizadoEm?: number
}

export const ROTULO_PERIODO: Record<PeriodoDia, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
  qualquer: 'A qualquer momento',
}

export const EMOJI_TIPO_ETAPA: Record<TipoEtapa, string> = {
  habito: '🔁',
  tarefa: '✅',
  checklist: '☑️',
  timer: '⏱️',
  nota: '📝',
  acao: '⚡',
}
