/**
 * Contratos da camada de inteligência do app.
 *
 * A ideia: qualquer módulo pode expor "sinais diários" (uma série numérica
 * por dia) e "presenças diárias" (um fator aconteceu ou não naquele dia).
 * O motor de insights (engine.ts) cruza esses sinais de forma genérica —
 * então correlacionar humor × sono, humor × gasto com delivery, ou hábitos ×
 * exercício usa exatamente o mesmo código, sem conhecer os módulos.
 *
 * Hoje só o Humor alimenta o motor; conforme Saúde/Finanças/Exercícios
 * expuserem sinais, o mesmo motor passa a correlacioná-los automaticamente.
 */

/** Série numérica por dia: data ISO (yyyy-MM-dd) → valor. */
export type SerieDiaria = Map<string, number>

/** Um sinal contínuo que um módulo publica (ex.: humor médio, horas de sono). */
export interface SinalDiario {
  chave: string // ex.: 'humor.media', 'sono.horas', 'financas.delivery'
  rotulo: string // ex.: 'Humor', 'Sono', 'Delivery'
  serie: SerieDiaria
  unidade?: string
}

/** Um fator marcável por dia (ex.: "fez exercício", "dormiu bem"). */
export interface FatorDiario {
  chave: string
  rotulo: string
  icone?: string
  cor?: string
  /** Dias (ISO) em que o fator esteve presente. */
  dias: Set<string>
}

/**
 * Provedor de sinais de um módulo — a ser registrado quando existir mais de
 * uma fonte para cruzar. É um hook (lê dados reativos do módulo).
 */
export interface ProvedorSinais {
  id: string
  usarSinais: () => SinalDiario[]
  usarFatores?: () => FatorDiario[]
}
