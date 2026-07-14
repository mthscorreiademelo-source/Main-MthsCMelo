import { format, parseISO, isToday, isTomorrow, isYesterday } from 'date-fns'
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

export function saudacao(agora = new Date()): string {
  const hora = agora.getHours()
  if (hora < 6) return 'Boa madrugada'
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}
