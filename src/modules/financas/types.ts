export type TipoMovimento = 'entrada' | 'saida'

export interface Movimento {
  id: string
  tipo: TipoMovimento
  /** Valor em centavos (inteiro), sempre positivo; o sinal vem do tipo */
  valorCentavos: number
  descricao: string
  categoria?: string
  /** Dia do movimento no formato ISO yyyy-MM-dd */
  data: string
  criadoEm: number
  atualizadoEm?: number
}

/* ------------------------------- Patrimônio ------------------------------- */

export type TipoConta = 'corrente' | 'poupanca' | 'investimento' | 'carteira' | 'divida'

/** Uma conta/ativo do usuário. O patrimônio líquido é a soma (dívidas subtraem). */
export interface Conta {
  id: string
  nome: string
  tipo: TipoConta
  /** Saldo em centavos (sempre positivo; dívida é subtraída no patrimônio). */
  saldoCentavos: number
  cor?: string
  icone?: string
  ordem: number
  criadoEm: number
  atualizadoEm?: number
}

/** Foto do patrimônio líquido num mês (yyyy-MM) — alimenta o gráfico de evolução. */
export interface PatrimonioSnapshot {
  /** yyyy-MM (chave primária). */
  mes: string
  valorCentavos: number
  atualizadoEm?: number
}

/* ------------------------------- Objetivos -------------------------------- */

export type TipoObjetivo = 'reserva' | 'meta'

export interface Objetivo {
  id: string
  nome: string
  icone?: string
  cor?: string
  alvoCentavos: number
  atualCentavos: number
  /** Aporte mensal planejado — reservado do orçamento antes do cálculo diário. */
  aporteMensalCentavos?: number
  /** 'reserva' = reserva de emergência (o objetivo-âncora); 'meta' = demais. */
  tipo?: TipoObjetivo
  ordem: number
  criadoEm: number
  atualizadoEm?: number
}

/* ------------------------------- Recorrentes ------------------------------ */

/** Despesa (ou receita) recorrente conhecida — considerada no planejamento. */
export interface Recorrente {
  id: string
  nome: string
  tipo: TipoMovimento
  valorCentavos: number
  categoria?: string
  /** Dia do mês do débito (1–31). */
  diaMes: number
  ativo?: boolean
  cor?: string
  icone?: string
  ordem: number
  criadoEm: number
  atualizadoEm?: number
}

/* --------------------------- Orçamento (distribuição) --------------------- */

/** Uma linha da distribuição do orçamento (Essencial, Educação, Lazer…). */
export interface OrcamentoLinha {
  id: string
  nome: string
  cor: string
  icone?: string
  limiteCentavos: number
  /** Categorias de Movimento que contam nesta linha. */
  categorias: string[]
  ordem: number
  criadoEm: number
  atualizadoEm?: number
}

/* -------------------------------- Config ---------------------------------- */

/** Configuração do módulo (documento único, id 'default'). */
export interface FinancasConfig {
  id: string
  /** Renda mensal (base do orçamento). */
  rendaMensalCentavos: number
  /** Poupança/investimento mensal planejado (não vinculado a um objetivo). */
  investimentoMensalCentavos: number
  /** Marca que o exemplo inicial já foi semeado (não semear de novo). */
  semeado?: boolean
  atualizadoEm?: number
}
