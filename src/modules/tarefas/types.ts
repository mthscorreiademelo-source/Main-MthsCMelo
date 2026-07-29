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

/**
 * Um pedaço de tempo dedicado a uma tarefa — dia+hora que ela ocupa na Agenda.
 * Uma `Task` pode ter vários (divisão em blocos, Item 12 do plano).
 *
 * - `fixado: false` = sugestão viva do Motor de Planejamento (`sugerirBlocos`
 *   em `execucao.ts`): recalculada a cada mudança relevante do dia, nunca
 *   persistida sozinha — só aparece como "fantasma" na Agenda.
 * - `fixado: true` = confirmado pelo Matheus (arrastou na Agenda, criou
 *   manualmente, ou herdou o dia de um filtro/calendário) — o Motor não mexe
 *   mais nele; só volta a ser sugestão viva se destravado
 *   (`destravarBlocoTarefa`).
 */
export interface BlocoTarefa {
  id: string
  /** Dia ISO yyyy-MM-dd. Ausente = ainda não tem dia definido. */
  data?: string
  /** HH:mm. Ausente = só o dia foi definido; a hora ainda é sugerida pelo Motor. */
  inicio?: string
  duracaoMin: number
  fixado: boolean
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
  /**
   * Tempo mínimo de um pedaço, se o Motor precisar dividir a tarefa em vários
   * `blocos` (Item 12). Ausente ou igual a `duracaoMin` = não dividir
   * automaticamente (só divisão manual).
   */
  duracaoMinBloco?: number
  /** Blocos de tempo dedicados (dia+hora, sugeridos ou fixados). Ver `BlocoTarefa`. */
  blocos?: BlocoTarefa[]
  /** 1 (P1) … 4 (P4). Padrão 4. */
  prioridade: Prioridade
  /** Projeto ao qual pertence; ausente = Entrada (Inbox). */
  projetoId?: string
  /** Tarefa-pai (subtarefa). Aninhamento livre. */
  paiId?: string
  /** Etiquetas livres. */
  labels?: string[]
  /**
   * Contexto necessário — referência ao `id` de um Contexto real da Agenda
   * (`agenda/types.ts`, `Contexto`). Ausente = "Casa" (sem restrição de
   * contexto, qualquer horário livre que não pertença a nenhum contexto).
   */
  contextoId?: string
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
