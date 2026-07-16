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
  /** Horário-limite (prazo) HH:mm no dia `data`. Aparece como marca no calendário. */
  horario?: string
  /** Quanto tempo a tarefa leva para ser feita (estimativa, em minutos). */
  duracaoMin?: number
  /** Bloco de tempo dedicado — dia em que vou fazer a tarefa (ISO). */
  blocoData?: string
  /** Bloco de tempo dedicado — hora de início HH:mm. */
  blocoInicio?: string
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
