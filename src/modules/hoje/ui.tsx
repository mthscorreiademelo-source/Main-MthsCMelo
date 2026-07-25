import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** Peças visuais reaproveitadas pelos cards do Hoje — mantêm a mesma cara. */

/** Cabeçalho padrão de card: ícone em círculo suave + título + ação à direita. */
export function CabecalhoCard({
  icone,
  titulo,
  cor,
  acao,
  to,
}: {
  icone: ReactNode
  titulo: string
  /** Cor de acento do ícone (padrão: acento do tema). */
  cor?: string
  /** Rótulo da ação à direita (ex.: "Ver todas"). */
  acao?: string
  to?: string
}) {
  const c = cor ?? 'var(--vida-accent)'
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `color-mix(in srgb, ${c} 15%, transparent)`, color: c }}
        aria-hidden
      >
        {icone}
      </span>
      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{titulo}</span>
      {acao &&
        (to ? (
          <Link to={to} className="shrink-0 text-[12px] font-medium text-accent hover:underline">
            {acao}
          </Link>
        ) : (
          <span className="shrink-0 text-[12px] text-muted">{acao}</span>
        ))}
    </div>
  )
}

/** Barra de progresso linear no padrão do app. */
export function BarraProgresso({
  fracao,
  cor = 'var(--vida-accent)',
  altura = 8,
}: {
  fracao: number
  cor?: string
  altura?: number
}) {
  const f = Math.max(0, Math.min(1, fracao))
  return (
    <span className="block overflow-hidden rounded-full bg-hover" style={{ height: altura }}>
      <span
        className="block h-full rounded-full transition-all"
        style={{ width: `${f * 100}%`, backgroundColor: cor }}
      />
    </span>
  )
}

/** Rótulo pequeno em maiúsculas (usado nos herói). */
export function Rotulo({ children, cor }: { children: ReactNode; cor?: string }) {
  return (
    <span
      className="text-[11px] font-semibold uppercase tracking-wide"
      style={cor ? { color: cor } : undefined}
    >
      {children}
    </span>
  )
}

/** Minutos → texto humano ("1 h 30 min", "45 min"). */
export function rotuloDuracao(min: number): string {
  if (min <= 0) return '0 min'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

/** Minutos até um evento → "em 20 min" / "em 1 h 10 min" / "agora". */
export function rotuloFaltam(min: number): string {
  if (min <= 0) return 'agora'
  return `em ${rotuloDuracao(min)}`
}
