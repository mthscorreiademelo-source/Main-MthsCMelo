export type TipoMovimento = 'entrada' | 'saida'

export interface Movimento {
  id: string
  tipo: TipoMovimento
  /** Valor em centavos (inteiro), sempre positivo; o sinal vem do tipo */
  valorCentavos: number
  descricao: string
  categoria?: string
  /** Conta de onde saiu (saída) ou entrou (entrada) o dinheiro. */
  contaId?: string
  /** Vínculo opcional com um pet (gasto atribuído ao módulo Pets). */
  petId?: string
  /** Vínculo opcional com um projeto (Workspace de Projetos). */
  projetoId?: string
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

export type TipoMovObjetivo = 'guardar' | 'retirar' | 'rendimento'

/** Uma movimentação no objetivo (para reconstruir a evolução ao longo do tempo). */
export interface MovObjetivo {
  data: string // ISO yyyy-MM-dd
  delta: number // variação no `atual` em centavos (guardar/rendimento +, retirar −)
  tipo: TipoMovObjetivo
}

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
  /** Histórico de guardar/retirar/rendimento (para o mini-gráfico de evolução). */
  historico?: MovObjetivo[]
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
  /** Se true, vence no 5º dia útil do mês (ex.: salário) em vez do dia fixo. */
  quintoUtil?: boolean
  /** Mês (YYYY-MM) da última confirmação — evita cobrar duas vezes no mês. */
  ultimaConfirmacao?: string
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
  /** Exceções de limite por mês (YYYY-MM → centavos), sobrepõem o padrão. */
  limitesEspecificos?: Record<string, number>
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
