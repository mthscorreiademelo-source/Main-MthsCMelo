import type { ReactNode } from 'react'

/** Anel de progresso circular (SVG), com conteúdo opcional no centro. */
export function AnelProgresso({
  fracao,
  tamanho = 56,
  espessura = 5,
  cor = 'var(--vida-ink)',
  trilha = 'var(--vida-line)',
  children,
}: {
  fracao: number
  tamanho?: number
  espessura?: number
  cor?: string
  trilha?: string
  children?: ReactNode
}) {
  const r = (tamanho - espessura) / 2
  const c = 2 * Math.PI * r
  const f = Math.max(0, Math.min(1, fracao))
  return (
    <div className="relative shrink-0" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} className="-rotate-90">
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke={trilha} strokeWidth={espessura} />
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={r}
          fill="none"
          stroke={cor}
          strokeWidth={espessura}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - f)}
          style={{ transition: 'stroke-dashoffset 0.45s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      )}
    </div>
  )
}
