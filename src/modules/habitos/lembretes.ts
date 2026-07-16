import { hojeISO } from '../../core/dates'
import { devidoNoDia } from './freq'
import { diaConcluido } from './progresso'
import type { Habito, HabitoRegistro } from './types'

/**
 * Lembretes locais. Importante: um PWA sem servidor só dispara notificações
 * enquanto o app está aberto (não há push em segundo plano). Por isso agendamos
 * timers em memória para os horários de hoje que ainda vão chegar — some quando
 * o app é fechado. É a rede de segurança honesta para um app local-first.
 */

export type EstadoNotif = 'indisponivel' | 'default' | 'granted' | 'denied'

export function estadoNotificacoes(): EstadoNotif {
  if (typeof Notification === 'undefined') return 'indisponivel'
  return Notification.permission as EstadoNotif
}

export async function pedirPermissaoNotificacoes(): Promise<EstadoNotif> {
  if (typeof Notification === 'undefined') return 'indisponivel'
  if (Notification.permission === 'granted') return 'granted'
  const r = await Notification.requestPermission()
  return r as EstadoNotif
}

const ICONE = `${import.meta.env.BASE_URL}favicon-96.png`

async function mostrar(titulo: string, corpo: string) {
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready
      if (reg) {
        await reg.showNotification(titulo, { body: corpo, icon: ICONE, tag: 'lume-habito' })
        return
      }
    }
  } catch {
    /* cai no fallback */
  }
  new Notification(titulo, { body: corpo, icon: ICONE })
}

function minutosAgora(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

function paraMinutos(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

/**
 * (Re)agenda os lembretes de hoje. Retorna uma função de limpeza que cancela os
 * timers pendentes. Só agenda horários ainda no futuro de hábitos devidos e não
 * concluídos hoje.
 */
export function agendarLembretes(
  habitos: Habito[],
  registros: HabitoRegistro[],
): () => void {
  if (estadoNotificacoes() !== 'granted') return () => {}
  const hoje = hojeISO()
  const agora = minutosAgora()
  const timers: ReturnType<typeof setTimeout>[] = []

  for (const h of habitos) {
    if (h.arquivado || !h.lembretes?.length) continue
    if (!devidoNoDia(h, hoje)) continue
    for (const hhmm of h.lembretes) {
      const min = paraMinutos(hhmm)
      if (min == null || min <= agora) continue
      const atrasoMs = (min - agora) * 60_000
      // Limite prático: até ~16h à frente (setTimeout tem teto de 2^31 ms).
      if (atrasoMs > 16 * 3600_000) continue
      const t = setTimeout(() => {
        // Reconfirma no disparo: pode ter sido concluído nesse meio-tempo.
        if (diaConcluido(h, registros, hoje)) return
        void mostrar(h.nome, h.descricao?.trim() || 'Hora do seu hábito ✨')
      }, atrasoMs)
      timers.push(t)
    }
  }

  return () => timers.forEach(clearTimeout)
}
