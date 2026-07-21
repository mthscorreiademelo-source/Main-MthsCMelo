/** P1 (urgente) … P4 (nenhuma). Espelha o Todoist. */
export type Prioridade = 1 | 2 | 3 | 4

/** Energia exigida pela tarefa — ajuda a IA a sugerir o melhor momento do dia. */
export type NivelEnergia = 'alta' | 'media' | 'baixa'

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
  /** Nível de energia exigido: 'alta' (foco profundo), 'media', 'baixa'. */
  energia?: NivelEnergia
  /** Contexto necessário (Casa, Trabalho, Computador, Celular, Rua…). */
  contexto?: string
  /** Ids de tarefas das quais esta depende (precisam ser concluídas antes). */
  dependeDe?: string[]
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

export type StatusProjeto = 'ideia' | 'andamento' | 'pausado' | 'concluido'

/** Um bloco/módulo do Workspace do projeto (visível, recolhido, ordem). */
export interface ModuloProjeto {
  id: string
  visivel: boolean
  recolhido?: boolean
  ordem: number
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
  /* ---- Workspace (redesign Projetos) ---- */
  icone?: string
  descricao?: string
  /** Capa em dataURL (clara/padrão). */
  capa?: string
  /** Capa alternativa para o modo escuro. */
  capaDark?: string
  categoria?: string
  status?: StatusProjeto
  tags?: string[]
  /** Módulos ativos do Workspace e sua ordem. Vazio = usa o padrão. */
  modulos?: ModuloProjeto[]
  /** Última atividade (timestamp) para ordenar/mostrar na biblioteca. */
  ultimaAtividade?: number
}

/** Item genérico de um módulo local do Workspace (ideias, links, pessoas…). */
export interface ItemProjeto {
  id: string
  projetoId: string
  /** módulo dono: 'ideias' | 'links' | 'pessoas' | 'aprendizados' | 'base' … */
  modulo: string
  titulo?: string
  texto?: string
  url?: string
  /** dados livres (ex.: colunas da base de dados). */
  dados?: Record<string, unknown>
  concluido?: boolean
  ordem: number
  criadoEm: number
  atualizadoEm?: number
}
