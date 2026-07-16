import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** Mini-tile do "cockpit" da tela Hoje: número/visual glanceável por módulo. */
export function TileResumo({
  to,
  icone,
  valor,
  rotulo,
  cor,
}: {
  to?: string
  icone?: ReactNode
  valor: ReactNode
  rotulo: string
  cor?: string
}) {
  const conteudo = (
    <span className="flex min-w-0 flex-1 items-center gap-2.5">
      {icone && (
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: cor ? `${cor}22` : 'var(--vida-hover)', color: cor }}
        >
          {icone}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[17px] font-bold leading-none tabular-nums">{valor}</span>
        <span className="mt-1 block truncate text-[11px] text-muted">{rotulo}</span>
      </span>
    </span>
  )
  const cls =
    'flex min-w-[132px] flex-1 items-center rounded-2xl border border-line bg-surface/60 px-3.5 py-3 transition-colors hover:border-muted/40'
  return to ? (
    <Link to={to} className={cls}>
      {conteudo}
    </Link>
  ) : (
    <div className={cls}>{conteudo}</div>
  )
}
