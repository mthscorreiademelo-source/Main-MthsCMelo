import { useEffect, useState } from 'react'
import { AnelProgresso } from '../habitos/components/AnelProgresso'
import { useLocal } from './local'

/**
 * Sessão de foco — um pomodoro DE VERDADE (não um desenho). Alterna foco (25 min)
 * e pausa (5 min), com iniciar/pausar/reiniciar. Sobrevive a recarregar a página
 * porque guarda no localStorage o instante em que o tempo acaba (`fimEm`) — ao
 * voltar, recalcula o que resta pelo relógio real.
 */

const FOCO_MIN = 25
const PAUSA_MIN = 5
const DUR: Record<Fase, number> = { foco: FOCO_MIN * 60, pausa: PAUSA_MIN * 60 }

type Fase = 'foco' | 'pausa'

interface EstadoPomodoro {
  fase: Fase
  rodando: boolean
  /** Segundos restantes quando pausado. */
  restante: number
  /** Instante (ms) em que o tempo acaba, quando rodando; null se pausado. */
  fimEm: number | null
}

const INICIAL: EstadoPomodoro = { fase: 'foco', rodando: false, restante: DUR.foco, fimEm: null }

function mmss(seg: number): string {
  const s = Math.max(0, Math.round(seg))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

/** Segundos que faltam agora — pelo relógio real quando rodando. */
function restanteDe(e: EstadoPomodoro): number {
  if (e.rodando && e.fimEm != null) return Math.max(0, Math.round((e.fimEm - Date.now()) / 1000))
  return e.restante
}

export function Pomodoro({ compacto = false }: { compacto?: boolean }) {
  const [estado, setEstado] = useLocal<EstadoPomodoro>('pomodoro', INICIAL)
  const [, setTique] = useState(0) // apenas força o re-render de 1 em 1 segundo

  useEffect(() => {
    if (!estado.rodando) return
    const id = setInterval(() => {
      if (restanteDe(estado) <= 0) {
        const prox: Fase = estado.fase === 'foco' ? 'pausa' : 'foco'
        setEstado({ fase: prox, rodando: false, restante: DUR[prox], fimEm: null })
      } else {
        setTique((n) => n + 1)
      }
    }, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado.rodando, estado.fase, estado.fimEm])

  const restante = restanteDe(estado)
  const fracao = 1 - restante / DUR[estado.fase]

  function iniciarOuPausar() {
    if (estado.rodando) {
      setEstado({ ...estado, rodando: false, restante, fimEm: null })
    } else {
      const base = restante > 0 ? restante : DUR[estado.fase]
      setEstado({ ...estado, rodando: true, restante: base, fimEm: Date.now() + base * 1000 })
    }
  }

  function reiniciar() {
    setEstado({ fase: estado.fase, rodando: false, restante: DUR[estado.fase], fimEm: null })
  }

  function trocarFase(fase: Fase) {
    setEstado({ fase, rodando: false, restante: DUR[fase], fimEm: null })
  }

  const anel = compacto ? 96 : 130
  const rotulo = estado.rodando
    ? 'Pausar'
    : restante < DUR[estado.fase]
      ? 'Retomar'
      : 'Iniciar sessão'

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div className="mb-3 flex gap-1 rounded-full bg-hover/70 p-0.5 text-[12px] font-medium">
        {(['foco', 'pausa'] as Fase[]).map((f) => (
          <button
            key={f}
            onClick={() => trocarFase(f)}
            className={`rounded-full px-3 py-1 transition-colors ${
              estado.fase === f ? 'bg-bg text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {f === 'foco' ? 'Foco' : 'Pausa'}
          </button>
        ))}
      </div>

      <AnelProgresso fracao={fracao} tamanho={anel} espessura={7} cor="var(--vida-accent)">
        <span className="flex flex-col items-center">
          <span className="text-3xl font-bold leading-none tabular-nums">{mmss(restante)}</span>
          <span className="mt-1 text-[11px] uppercase tracking-wide text-muted">
            {estado.fase === 'foco' ? 'Foco' : 'Pausa'}
          </span>
        </span>
      </AnelProgresso>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={iniciarOuPausar}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-accent px-5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          {estado.rodando ? <IconePause /> : <IconePlay />}
          {rotulo}
        </button>
        <button
          onClick={reiniciar}
          aria-label="Reiniciar"
          className="inline-flex size-10 items-center justify-center rounded-xl border border-line text-muted transition-colors hover:bg-hover hover:text-ink"
        >
          <IconeReiniciar />
        </button>
      </div>
    </div>
  )
}

function IconePlay() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}
function IconePause() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  )
}
function IconeReiniciar() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}
