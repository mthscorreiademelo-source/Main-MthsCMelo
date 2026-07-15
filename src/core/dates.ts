import {
  format,
  parseISO,
  isToday,
  isTomorrow,
  isYesterday,
  getDaysInMonth,
  getDay,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

/** Data de hoje no formato ISO yyyy-MM-dd (fuso local). */
export function hojeISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Ex.: "segunda-feira, 14 de julho" (primeira letra maiúscula). */
export function dataPorExtenso(data = new Date()): string {
  const texto = format(data, "EEEE, d 'de' MMMM", { locale: ptBR })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** Rótulo curto e humano para uma data ISO. */
export function rotuloData(iso: string): string {
  const data = parseISO(iso)
  if (isToday(data)) return 'Hoje'
  if (isTomorrow(data)) return 'Amanhã'
  if (isYesterday(data)) return 'Ontem'
  return format(data, "d 'de' MMM", { locale: ptBR })
}

/** Iniciais dos dias da semana, começando no domingo (padrão de calendário BR). */
export const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const

/** Rótulo "Mês de aaaa" com inicial maiúscula, para um mês 'yyyy-MM'. */
export function rotuloMes(mes: string): string {
  const texto = format(parseISO(`${mes}-01`), "MMMM 'de' yyyy", { locale: ptBR })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/**
 * Semanas de um mês 'yyyy-MM' como matriz 7×N: cada célula é a data ISO
 * (yyyy-MM-dd) ou null para posições fora do mês. Domingo na primeira coluna.
 */
export function semanasDoMes(mes: string): (string | null)[][] {
  const inicio = parseISO(`${mes}-01`)
  const total = getDaysInMonth(inicio)
  const offset = getDay(inicio) // 0 = domingo
  const celulas: (string | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= total; d++) {
    celulas.push(`${mes}-${String(d).padStart(2, '0')}`)
  }
  while (celulas.length % 7 !== 0) celulas.push(null)
  const semanas: (string | null)[][] = []
  for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7))
  return semanas
}

export function saudacao(agora = new Date()): string {
  const hora = agora.getHours()
  if (hora < 6) return 'Boa madrugada'
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}
