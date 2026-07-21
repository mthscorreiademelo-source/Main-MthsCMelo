/** Um cronograma agrupa eventos numa linha do tempo (Gantt): Trabalho, Exercícios… */
export interface Cronograma {
  id: string
  nome: string
  cor?: string
  ordem: number
  criadoEm: number
  atualizadoEm?: number
}

export type TipoRecorrenciaEvento = 'diaria' | 'semanal' | 'mensal' | 'anual'

export interface RecorrenciaEvento {
  tipo: TipoRecorrenciaEvento
  /** a cada N (dias/semanas/meses/anos). */
  intervalo?: number
  /** semanal: dias da semana 0–6 (dom–sáb). */
  dias?: number[]
  /** termina nesta data (ISO), inclusive. */
  ate?: string
  /** OU termina após N ocorrências (contando a primeira). */
  ocorrencias?: number
}

/** Presença no evento (estilo Google Calendar). Ausente = pendente (não respondi). */
export type Presenca = 'confirmado' | 'recusado'

/**
 * Contexto de rotina — faixa de fundo (Sono, Trabalho, Estudos…), totalmente
 * editável. Não é um evento: contextualiza o dia sem competir com os eventos.
 */
export interface Contexto {
  id: string
  nome: string
  cor: string
  /** Transparência da faixa (0.03–0.25). Padrão ~0.08. */
  opacidade?: number
  /** Minutos desde a meia-noite. Se fim ≤ início, a faixa cruza a meia-noite. */
  inicioMin: number
  fimMin: number
  /** Dias da semana (0=dom … 6=sáb). Vazio/ausente = todos os dias. */
  dias?: number[]
  /** Datas ISO (yyyy-MM-dd) em que o contexto não se aplica. */
  excecoes?: string[]
  categoria?: string
  icone?: string
  ordem: number
  criadoEm: number
  atualizadoEm?: number
}

/** Um evento da agenda. Fase 1: eventos de um único dia. */
export interface Evento {
  id: string
  titulo: string
  /** Dia do evento no formato ISO yyyy-MM-dd. */
  data: string
  /** Início HH:mm (ignorado se diaInteiro). */
  inicio: string
  /** Fim HH:mm (ignorado se diaInteiro). */
  fim: string
  /** Fim do evento em dias (ISO). Ausente = evento de um único dia. */
  dataFim?: string
  /** Cronograma ao qual o evento pertence (opcional). */
  cronogramaId?: string
  diaInteiro?: boolean
  cor?: string
  /** Categoria (id de CATEGORIAS_EVENTO). Define ícone e cor de destaque. */
  categoria?: string
  local?: string
  /** Nomes dos participantes (avatares por iniciais nos blocos). */
  participantes?: string[]
  /** Custo estimado do evento em centavos — reservado no orçamento de Finanças. */
  custoCentavos?: number
  /** Vínculo opcional com um pet (evento criado pelo módulo Pets). */
  petId?: string
  /** Vínculo opcional com um projeto (Workspace de Projetos). */
  projetoId?: string
  descricao?: string
  /** Repetição do evento (gera ocorrências nas datas seguintes). */
  recorrencia?: RecorrenciaEvento
  /** Presença: confirmado / recusado / ausente = pendente. */
  presenca?: Presenca
  criadoEm: number
  atualizadoEm?: number
}
