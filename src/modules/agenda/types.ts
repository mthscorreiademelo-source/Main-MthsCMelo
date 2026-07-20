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
  descricao?: string
  /** Repetição do evento (gera ocorrências nas datas seguintes). */
  recorrencia?: RecorrenciaEvento
  /** Presença: confirmado / recusado / ausente = pendente. */
  presenca?: Presenca
  criadoEm: number
  atualizadoEm?: number
}
