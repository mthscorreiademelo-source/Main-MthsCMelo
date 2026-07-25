import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'

export type Tamanho = 'hero' | 'grande' | 'medio' | 'pequeno'

/**
 * Card do dashboard Hoje. O TAMANHO controla o respiro interno (padding); a
 * LARGURA (span na grade) vem de fora, via `className`, para cada modo montar sua
 * própria composição. Ocupa a altura toda do slot (`h-full`) para os cards de
 * uma linha ficarem alinhados. Entrada suave via `lume-entrada`.
 */
export function CartaoHoje({
  tamanho = 'medio',
  to,
  onClick,
  destaque,
  style,
  children,
  className = '',
}: {
  tamanho?: Tamanho
  to?: string
  onClick?: () => void
  /** realce (evento agora / atrasado / herói): borda e fundo com cor de acento */
  destaque?: boolean
  style?: CSSProperties
  children: ReactNode
  className?: string
}) {
  const pad = tamanho === 'hero' ? 'p-5 sm:p-6' : tamanho === 'pequeno' ? 'p-3.5' : 'p-4'
  const realce = destaque
    ? 'border-transparent ring-1 ring-inset'
    : 'border-line bg-surface/70 hover:bg-surface'
  const cls = `lume-entrada flex h-full flex-col rounded-2xl border text-left transition-colors ${pad} ${realce} ${className}`

  if (to) {
    return (
      <Link to={to} className={`${cls} no-underline`} style={style}>
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
