/** P1 (urgente) … P4 (nenhuma). Espelha o Todoist. */
export type Prioridade = 1 | 2 | 3 | 4

export type TipoRecorrencia = 'diaria' | 'semanal' | 'mensal' | 'anual'

export interface Recorrencia {
  tipo: TipoRecorrencia
  /** a cada N (dias/semanas/meses/anos). */
  intervalo?: number
  /** semanal: dias da semana 0–6 (dom–sáb). */
  dias?: number[]
}

export interface Task {
  id: string
  titulo: string
  /** Detalhes/observações (antigo `nota`). */
  descricao?: string
  /** Data agendada no formato ISO yyyy-MM-dd. */
  data?: string
  /** Horário opcional HH:mm. */
  horario?: string
  /** Duração em minutos quando agendada num bloco de tempo (time-blocking). */
  duracaoMin?: number
  /** 1 (P1) … 4 (P4). Padrão 4. */
  prioridade: Prioridade
  /** Projeto ao qual pertence; ausente = Entrada (Inbox). */
  projetoId?: string
  /** Tarefa-pai (subtarefa). Aninhamento livre. */
  paiId?: string
  /** Etiquetas livres. */
  labels?: string[]
  /** Repetição; ao concluir, a data avança para a próxima ocorrência. */
  recorrencia?: Recorrencia
  /** Timestamp de conclusão; ausente = pendente. */
  concluidaEm?: number
  criadaEm: number
  /** Ordenação manual dentro da lista/projeto. */
  ordem: number
  /** Carimbo de sincronização (LWW). */
  atualizadoEm?: number
}

export interface Projeto {
  id: string
  nome: string
  cor?: string
  favorito?: boolean
  ordem: number
  arquivado?: boolean
  criadoEm: number
  atualizadoEm?: number
}
