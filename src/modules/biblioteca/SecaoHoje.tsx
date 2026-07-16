import { Link } from 'react-router-dom'
import { SecaoDashboard } from '../../core/components/SecaoDashboard'
import { IconLivro } from '../../core/components/Icons'
import { useLivros } from './hooks'

/** Contribuição da Biblioteca para o dashboard Hoje: o que você está lendo. */
export function SecaoHoje() {
  const livros = useLivros()
  if (livros === undefined) return null
  const lendo = livros
    .filter((l) => l.status === 'lendo')
    .sort((a, b) => (b.atualizadoEm ?? b.adicionadoEm) - (a.atualizadoEm ?? a.adicionadoEm))
  if (lendo.length === 0) return null
  const atual = lendo[0]

  return (
    <SecaoDashboard titulo="Leitura" verTodos="/biblioteca">
      <Link
        to={`/biblioteca/${atual.id}`}
        className="flex items-center gap-3 rounded-2xl border border-line p-3 transition-colors hover:border-muted/40"
      >
        <div className="aspect-[2/3] h-14 shrink-0 overflow-hidden rounded-md border border-line bg-surface">
          {atual.capa ? (
            <img src={atual.capa} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <IconLivro width={18} height={18} className="text-muted/50" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold">{atual.titulo}</span>
          {atual.autor && <span className="block truncate text-[12px] text-muted">{atual.autor}</span>}
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-hover">
            <div className="h-full bg-ink" style={{ width: `${atual.progresso ?? 0}%` }} />
          </div>
        </div>
        <span className="text-[13px] font-semibold text-muted">{atual.progresso ?? 0}%</span>
      </Link>
    </SecaoDashboard>
  )
}
