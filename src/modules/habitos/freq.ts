import { differenceInCalendarDays, getDate, getDay, parseISO } from 'date-fns'
import type { Frequencia, Habito } from './types'

const NOMES_DIA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/** O hábito é "devido" (esperado) nesse dia, segundo a frequência? */
export function devidoNoDia(habito: Habito, data: string): boolean {
  const f = habito.frequencia ?? { tipo: 'diario' }
  const d = parseISO(data)
  switch (f.tipo) {
    case 'diario':
      return true
    case 'dias_semana':
      return (f.dias ?? []).includes(getDay(d))
    case 'mensal':
      return (f.dias ?? []).includes(getDate(d))
    case 'alternado': {
      const intervalo = Math.max(1, f.intervalo ?? 2)
      const base = parseISO(new Date(habito.criadoEm).toISOString().slice(0, 10))
      return differenceInCalendarDays(d, base) % intervalo === 0
    }
    case 'semanal':
      // Meta por semana: aparece todo dia até bater a meta (o card mostra o alvo).
      return true
    default:
      return true
  }
}

/** Rótulo curto e legível da frequência. */
export function rotuloFrequencia(f?: Frequencia): string {
  if (!f) return 'Todo dia'
  switch (f.tipo) {
    case 'diario':
      return 'Todo dia'
    case 'dias_semana': {
      const dias = [...(f.dias ?? [])].sort((a, b) => a - b)
      if (dias.length === 7) return 'Todo dia'
      if (dias.length === 5 && dias.every((d) => d >= 1 && d <= 5)) return 'Dias úteis'
      if (dias.length === 2 && dias.includes(0) && dias.includes(6)) return 'Fins de semana'
      return dias.map((d) => NOMES_DIA[d]).join(', ')
    }
    case 'alternado':
      return `A cada ${Math.max(1, f.intervalo ?? 2)} dias`
    case 'semanal':
      return `${f.vezes ?? 1}× por semana`
    case 'mensal': {
      const dias = [...(f.dias ?? [])].sort((a, b) => a - b)
      return dias.length ? `Dia ${dias.join(', ')} do mês` : 'Mensal'
    }
    default:
      return ''
  }
}

export { NOMES_DIA }
