export type TipoRecorrenciaEvento = 'diaria' | 'semanal' | 'mensal' | 'anual'

export interface RecorrenciaEvento {
  tipo: TipoRecorrenciaEvento
  /** a cada N (dias/semanas/meses/anos). */
  intervalo?: number
  /** repete até esta data (ISO), opcional. */
  ate?: string
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
  diaInteiro?: boolean
  cor?: string
  local?: string
  descricao?: string
  /** Repetição do evento (gera ocorrências nas datas seguintes). */
  recorrencia?: RecorrenciaEvento
  /** Presença: confirmado / recusado / ausente = pendente. */
  presenca?: Presenca
  criadoEm: number
  atualizadoEm?: number
}
