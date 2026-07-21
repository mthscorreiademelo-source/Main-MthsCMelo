export type TipoHabito =
  | 'sim_nao'
  | 'contador'
  | 'valor'
  | 'tempo'
  | 'distancia'
  | 'quantidade'
  | 'checklist'

export type TipoFrequencia = 'diario' | 'dias_semana' | 'alternado' | 'semanal' | 'mensal'

export interface Frequencia {
  tipo: TipoFrequencia
  /** dias_semana: 0–6 (dom–sáb). mensal: dias do mês (1–31). */
  dias?: number[]
  /** alternado: a cada N dias. */
  intervalo?: number
  /** semanal: quantas vezes por semana. */
  vezes?: number
}

export interface ItemChecklist {
  id: string
  texto: string
}

export interface Habito {
  id: string
  nome: string
  descricao?: string
  icone?: string
  cor?: string
  categoriaId?: string
  tipo: TipoHabito
  /** rótulo da unidade (ex.: copos, min, km, passos, páginas). */
  unidade?: string
  /** meta diária (para tipos medidos); no checklist = nº de itens. */
  meta?: number
  /** incremento por toque (tipos medidos). */
  passo?: number
  /** itens do checklist. */
  itens?: ItemChecklist[]
  frequencia: Frequencia
  /** horário sugerido HH:mm. */
  horario?: string
  /** horários de lembrete no dia (HH:mm). Notificações locais. */
  lembretes?: string[]
  /** id de uma fonte de integração (ex.: 'saude:passos') — valor automático. */
  fonteId?: string
  /** Vínculo com um pet: o hábito aparece no workspace desse pet (ex.: passear). */
  vinculoPetId?: string
  /** Conta como água na Saúde: o valor do dia soma na hidratação. */
  vinculoAgua?: boolean
  /** Quantos ml cada unidade do hábito representa (copo = 250; ml = 1). */
  mlPorUnidade?: number
  /** 1 (alta) … 4 (baixa). */
  prioridade?: number
  ordem: number
  arquivado?: boolean
  criadoEm: number
  atualizadoEm?: number
}

/** Um registro por dia; id = `${habitoId}:${data}`. */
export interface HabitoRegistro {
  id: string
  habitoId: string
  /** dia no formato ISO yyyy-MM-dd. */
  data: string
  /** valor acumulado no dia (tipos medidos). */
  valor?: number
  /** ids dos itens de checklist concluídos no dia. */
  itens?: string[]
  /** ids dos itens de checklist marcados como "não fez" no dia. */
  itensFalhou?: string[]
  /** Sim/Não: feito ou explicitamente não feito. Ausente = pendente. */
  estado?: 'feito' | 'falhou'
  criadoEm?: number
  atualizadoEm?: number
}

export interface CategoriaHabito {
  id: string
  nome: string
  cor?: string
  icone?: string
  ordem: number
  recolhida?: boolean
  criadoEm: number
  atualizadoEm?: number
}
