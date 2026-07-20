/** Resumo de saúde de um dia (um registro por dia; id = a data ISO). */
export interface SaudeDia {
  id: string
  /** Dia no formato ISO yyyy-MM-dd */
  data: string
  /** Minutos de sono */
  sonoMin?: number
  passos?: number
  /** Calorias ativas (kcal) */
  caloriasAtivas?: number
  /** Frequência cardíaca de repouso (bpm) */
  fcRepouso?: number
  /** Minutos de exercício/treino no dia */
  exercicioMin?: number
  /** Água ingerida no dia (ml) */
  aguaMl?: number
  /** Saturação de oxigênio (%) */
  spo2?: number
  criadoEm: number
  atualizadoEm?: number
}

export type MetricaSaude =
  | 'sonoMin'
  | 'passos'
  | 'caloriasAtivas'
  | 'fcRepouso'
  | 'exercicioMin'
  | 'aguaMl'
  | 'spo2'

/* ----------------------------- Medidas corporais -------------------------- */

export type TipoMedida =
  | 'peso'
  | 'gordura'
  | 'massaMuscular'
  | 'cintura'
  | 'quadril'
  | 'peitoral'
  | 'braco'
  | 'coxa'
  | 'panturrilha'
  | 'altura'

/** Uma medida corporal num dia (série temporal por tipo). */
export interface Medida {
  id: string
  data: string
  tipo: TipoMedida
  /** Valor: kg (peso/massa), % (gordura), cm (circunferências/altura). */
  valor: number
  criadoEm: number
  atualizadoEm?: number
}

/* -------------------------------- Atividades ------------------------------ */

export interface Atividade {
  id: string
  data: string
  hora?: string
  tipo: string
  duracaoMin?: number
  calorias?: number
  distanciaKm?: number
  /** Ritmo (ex.: "5:30 /km") — texto livre. */
  ritmo?: string
  /** Fonte do dado (Garmin, Apple Watch, Manual…). */
  origem?: string
  obs?: string
  criadoEm: number
  atualizadoEm?: number
}

/* ------------------------------- Alimentação ------------------------------ */

export type TipoRefeicao = 'cafe' | 'almoco' | 'jantar' | 'lanche'

export interface Refeicao {
  id: string
  data: string
  hora?: string
  tipo: TipoRefeicao
  descricao: string
  /** Referência a um blob na tabela `arquivos` (foto do prato). */
  fotoId?: string
  calorias?: number
  proteinaG?: number
  carboidratoG?: number
  gorduraG?: number
  fibraG?: number
  sodioMg?: number
  criadoEm: number
  atualizadoEm?: number
}

/* --------------------------- Consultas & profissionais -------------------- */

export interface Profissional {
  id: string
  nome: string
  especialidade?: string
  telefone?: string
  clinica?: string
  obs?: string
  criadoEm: number
  atualizadoEm?: number
}

export type StatusConsulta = 'agendada' | 'realizada' | 'cancelada'

export interface Consulta {
  id: string
  profissionalId?: string
  /** Título/motivo (ex.: "Avaliação física"). */
  titulo?: string
  especialidade?: string
  data: string
  hora?: string
  local?: string
  status: StatusConsulta
  recomendacoes?: string
  obs?: string
  /** Custo estimado/confirmado (centavos) — integra com Finanças. */
  custoCentavos?: number
  /** Evento criado na Agenda (para aparecer no calendário). */
  eventoId?: string
  criadoEm: number
  atualizadoEm?: number
}

/* ------------------------------- Medicamentos ----------------------------- */

export interface Medicamento {
  id: string
  nome: string
  dosagem?: string
  /** Horários do dia (HH:mm). */
  horarios?: string[]
  frequencia?: string
  /** Estoque atual (unidades) e alerta de reposição. */
  estoque?: number
  estoqueAlerta?: number
  ativo?: boolean
  cor?: string
  obs?: string
  criadoEm: number
  atualizadoEm?: number
}

/** Tomada de uma dose; id = `${medicamentoId}:${data}:${hora}`. */
export interface MedicamentoTomada {
  id: string
  medicamentoId: string
  data: string
  hora: string
  criadoEm: number
  atualizadoEm?: number
}

/* --------------------------------- Exames --------------------------------- */

export type StatusExame = 'normal' | 'atencao' | 'alterado'

export interface Exame {
  id: string
  /** Nome do exame ou marcador (ex.: "Colesterol total", "Vitamina D"). */
  nome: string
  /** Chave para agrupar o histórico do mesmo marcador ao longo do tempo. */
  marcador?: string
  data: string
  valorNum?: number
  valorTexto?: string
  unidade?: string
  refMin?: number
  refMax?: number
  status?: StatusExame
  /** Referência a um blob na tabela `arquivos` (PDF/imagem do exame). */
  arquivoId?: string
  obs?: string
  criadoEm: number
  atualizadoEm?: number
}

/* --------------------------------- Vacinas -------------------------------- */

export interface Vacina {
  id: string
  nome: string
  data?: string
  dose?: string
  proximaDose?: string
  lote?: string
  /** Referência a um blob na tabela `arquivos` (comprovante). */
  comprovanteId?: string
  obs?: string
  criadoEm: number
  atualizadoEm?: number
}

/* ----------------------------- Doação de sangue --------------------------- */

export interface DoacaoSangue {
  id: string
  data: string
  local?: string
  obs?: string
  criadoEm: number
  atualizadoEm?: number
}

/* --------------------------------- Config --------------------------------- */

export interface SaudeConfig {
  id: string
  tipoSanguineo?: string
  alturaCm?: number
  metaAguaMl?: number
  metaPassos?: number
  metaSonoMin?: number
  metaPesoKg?: number
  metaCaloriasAtivas?: number
  semeado?: boolean
  atualizadoEm?: number
}
