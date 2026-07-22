/**
 * Flashcards com repetição espaçada (algoritmo SM-2, o mesmo do Anki clássico).
 *
 * Tudo é local e offline — a criação dos cartões é manual (honesto: gerar
 * cartões automaticamente por IA depende de um LLM, que não roda aqui). Este
 * arquivo é PURO (só date-fns) para poder ser testado isolado.
 */
import { addDays, format, parseISO } from 'date-fns'

export interface Flashcard {
  id: string
  frente: string
  verso: string
  /** Livro de origem (opcional). */
  livroId?: string
  /** Fator de facilidade SM-2 (≥ 1.3). */
  facilidade: number
  /** Intervalo atual, em dias. */
  intervalo: number
  /** Acertos consecutivos. */
  repeticoes: number
  /** Próxima revisão (yyyy-MM-dd). */
  proximaRevisao: string
  criadoEm: number
  atualizadoEm?: number
}

/** Nota de recordação: 0 = não lembrou … 5 = fácil. */
export type Qualidade = 0 | 1 | 2 | 3 | 4 | 5

/** Estado inicial de um cartão novo (revisar hoje). */
export function agendamentoInicial(hoje: string): Pick<Flashcard, 'facilidade' | 'intervalo' | 'repeticoes' | 'proximaRevisao'> {
  return { facilidade: 2.5, intervalo: 0, repeticoes: 0, proximaRevisao: hoje }
}

/** Aplica o SM-2 e devolve os campos de agendamento atualizados. */
export function revisarSM2(
  c: Pick<Flashcard, 'facilidade' | 'intervalo' | 'repeticoes'>,
  q: Qualidade,
  hoje: string,
): Pick<Flashcard, 'facilidade' | 'intervalo' | 'repeticoes' | 'proximaRevisao'> {
  let { facilidade, intervalo, repeticoes } = c
  if (q < 3) {
    repeticoes = 0
    intervalo = 1
  } else {
    repeticoes += 1
    if (repeticoes === 1) intervalo = 1
    else if (repeticoes === 2) intervalo = 6
    else intervalo = Math.round(intervalo * facilidade)
  }
  facilidade = Math.max(1.3, facilidade + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
  facilidade = Math.round(facilidade * 100) / 100
  const proximaRevisao = format(addDays(parseISO(`${hoje}T00:00:00`), intervalo), 'yyyy-MM-dd')
  return { facilidade, intervalo, repeticoes, proximaRevisao }
}

/** O cartão está devido para revisão hoje? */
export function devido(c: Flashcard, hoje: string): boolean {
  return c.proximaRevisao <= hoje
}
