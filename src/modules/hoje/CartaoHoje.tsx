import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'

export type Tamanho = 'hero' | 'grande' | 'medio' | 'pequeno'

/** Card do dashboard Hoje. `hero`/`grande` ocupam a linha inteira; `medio`/
 *  `pequeno` dividem a grade de 2 colunas. Entrada suave via `lume-entrada`. */
export function CartaoHoje({
  tamanho,
  to,
  onClick,
  destaque,
  style,
  children,
  className = '',
}: {
  tamanho: Tamanho
  to?: string
  onClick?: () => void
  /** realce (evento agora / atrasado): borda e fundo com cor de acento */
  destaque?: boolean
  style?: CSSProperties
  children: ReactNode
  className?: string
}) {
  const span = tamanho === 'hero' || tamanho === 'grande' ? 'sm:col-span-2' : ''
  const pad = tamanho === 'hero' ? 'p-5' : tamanho === 'pequeno' ? 'p-3.5' : 'p-4'
  const realce = destaque
    ? 'border-transparent ring-1 ring-inset'
    : 'border-line bg-surface/70 hover:bg-surface'
  const cls = `lume-entrada block rounded-2xl border text-left transition-colors ${span} ${pad} ${realce} ${className}`

  if (to) {
    return (
      <Link to={to} className={cls} style={style}>
        {children}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button onClick={onClick} className={`w-full ${cls}`} style={style}>
        {children}
      </button>
    )
  }
  return (
    <div className={cls} style={style}>
      {children}
    </div>
  )
}
