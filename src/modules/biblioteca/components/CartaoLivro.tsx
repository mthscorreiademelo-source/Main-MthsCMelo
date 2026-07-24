import { Link } from 'react-router-dom'
import { IconLivro } from '../../../core/components/Icons'
import { autorTexto, rotuloStatus, rotuloTipo } from '../db'
import type { Livro, StatusLeitura } from '../types'
import { CapaImg } from './CapaImg'

/** Capa de um livro (ou compilado) na estante (grade). */
export function CartaoLivro({
  livro,
  volumes,
  status,
}: {
  livro: Livro
  volumes?: number
  /** status efetivo (séries derivam dos volumes) para o subtítulo. */
  status?: StatusLeitura
}) {
  const progresso = livro.progresso ?? 0
  const ehComp = !!livro.ehCompilado
  const destino = ehComp ? `/biblioteca/compilado/${livro.id}` : `/biblioteca/${livro.id}`
  const semCapa = (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-2 text-center">
      <IconLivro width={26} height={26} className="text-muted/50" />
      <span className="line-clamp-3 text-[12px] font-medium text-muted">{livro.titulo}</span>
    </div>
  )
  return (
    <Link to={destino} className="group flex flex-col gap-1.5" data-livro={livro.id} data-compilado={ehComp ? '1' : undefined}>
      {/* pilha de "papéis" atrás da capa quando é um compilado */}
      <div className={ehComp ? 'relative' : ''}>
        {ehComp && (
          <>
            <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-lg border border-line bg-surface" />
            <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 rounded-lg border border-line bg-surface" />
          </>
        )}
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-line bg-surface shadow-sm transition-transform group-hover:-translate-y-0.5">
          {livro.capa ? (
            <CapaImg src={livro.capa} className="h-full w-full object-cover" fallback={semCapa} />
          ) : (
            semCapa
          )}
          {ehComp ? (
            <span className="absolute right-1.5 top-1.5 rounded-md bg-black/65 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
              {volumes ?? 0} vol.
            </span>
          ) : (
            livro.numero != null && (
              <span className="absolute left-1.5 top-1.5 rounded-md bg-black/65 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
                #{livro.numero}
              </span>
            )
          )}
          {progresso > 0 && progresso < 100 && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-black/20">
              <div className="h-full bg-ink" style={{ width: `${progresso}%` }} />
            </div>
          )}
        </div>
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium leading-tight">{livro.titulo}</p>
        <p className="truncate text-[11px] text-muted">
          {ehComp
            ? `${rotuloTipo(livro.tipo)} · ${rotuloStatus(status ?? livro.status)}`
            : autorTexto(livro) || livro.colecao || rotuloStatus(livro.status)}
        </p>
      </div>
    </Link>
  )
}
