import { Link } from 'react-router-dom'
import { IconLivro } from '../../../core/components/Icons'
import { rotuloStatus } from '../db'
import type { Livro } from '../types'

/** Capa de um livro na estante (grade). */
export function CartaoLivro({ livro }: { livro: Livro }) {
  const progresso = livro.progresso ?? 0
  return (
    <Link
      to={`/biblioteca/${livro.id}`}
      className="group flex flex-col gap-1.5"
      data-livro={livro.id}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-line bg-surface shadow-sm transition-transform group-hover:-translate-y-0.5">
        {livro.capa ? (
          <img src={livro.capa} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-2 text-center">
            <IconLivro width={26} height={26} className="text-muted/50" />
            <span className="line-clamp-3 text-[12px] font-medium text-muted">{livro.titulo}</span>
          </div>
        )}
        {progresso > 0 && progresso < 100 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/20">
            <div className="h-full bg-ink" style={{ width: `${progresso}%` }} />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium leading-tight">{livro.titulo}</p>
        <p className="truncate text-[11px] text-muted">
          {livro.autor || rotuloStatus(livro.status)}
        </p>
      </div>
    </Link>
  )
}
