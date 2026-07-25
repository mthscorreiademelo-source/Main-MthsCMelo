import { useEffect, useState } from 'react'

/** Faixas do dia — a "Hoje" muda de prioridades conforme o horário. */
export type Faixa = 'madrugada' | 'manha' | 'meiodia' | 'tarde' | 'noite' | 'fimdenoite'

export interface FaixaInfo {
  id: Faixa
  /** minuto inicial (0..1439) e final (exclusivo) da faixa no dia */
  rotulo: string
}

export const FAIXAS: Record<Faixa, FaixaInfo> = {
  madrugada: { id: 'madrugada', rotulo: 'Madrugada' },
  manha: { id: 'manha', rotulo: 'Manhã' },
  meiodia: { id: 'meiodia', rotulo: 'Meio-dia' },
  tarde: { id: 'tarde', rotulo: 'Tarde' },
  noite: { id: 'noite', rotulo: 'Noite' },
  fimdenoite: { id: 'fimdenoite', rotulo: 'Fim do dia' },
}

/** Faixa do dia a partir de um horário. */
export function faixaDoDia(d: Date): Faixa {
  const h = d.getHours()
  if (h < 5) return 'madrugada'
  if (h < 11) return 'manha'
  if (h < 14) return 'meiodia'
  if (h < 18) return 'tarde'
  if (h < 22) return 'noite'
  return 'fimdenoite'
}

/** Minutos desde a meia-noite. */
export function minutosDoDia(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

/** "HH:mm" → minutos; retorna null se inválido. */
export function hhmmParaMin(hhmm: string | undefined): number | null {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Override de horário (testes/preview): window.__lumeHojeAgora (ms) ou ?agora=HH:MM. */
function override(): Date | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { __lumeHojeAgora?: number }
  if (typeof w.__lumeHojeAgora === 'number') return new Date(w.__lumeHojeAgora)
  try {
    const q = window.location.hash.split('?')[1]
    if (q) {
      const hm = new URLSearchParams(q).get('agora')
      if (hm && /^\d{1,2}:\d{2}$/.test(hm)) {
        const [h, m] = hm.split(':').map(Number)
        const d = new Date()
        d.setHours(h, m, 0, 0)
        return d
      }
    }
  } catch {
    /* ignora */
  }
  return null
}

/** Hora atual reativa (atualiza a cada 30s). Respeita o override de testes. */
export function useAgora(): Date {
  const [agora, setAgora] = useState(() => override() ?? new Date())
  useEffect(() => {
    const t = setInterval(() => setAgora(override() ?? new Date()), 30_000)
    return () => clearInterval(t)
  }, [])
  return agora
}
