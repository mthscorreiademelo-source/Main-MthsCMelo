import { Link } from 'react-router-dom'
import { SecaoDashboard } from '../../core/components/SecaoDashboard'
import { IconCaneta, IconArquivo, IconDocumento } from '../../core/components/Icons'
import { rotuloData } from '../../core/dates'
import { usePaginas } from './hooks'
import type { Pagina } from './types'

function IconeTipo({ pagina }: { pagina: Pagina }) {
  const props = { width: 15, height: 15 }
  if (pagina.tipo === 'desenho') return <IconCaneta {...props} />
  if (pagina.tipo === 'arquivos') return <IconArquivo {...props} />
  return <IconDocumento {...props} />
}

function resumoBlocos(p: Pagina): string {
  const txt = (p.blocos ?? [])
    .map((b) => b.texto?.trim())
    .filter(Boolean)
    .join(' · ')
  return txt || (p.tipo === 'desenho' ? 'Desenho' : p.tipo === 'arquivos' ? 'Arquivos' : 'Nota vazia')
}

/** Contribuição das Notas para o Hoje: as últimas notas editadas. */
export function SecaoHoje() {
  const paginas = usePaginas()
  if (paginas === undefined) return null
  const recentes = paginas.slice(0, 4)
  if (recentes.length === 0) return null

  return (
    <SecaoDashboard titulo="Notas recentes" verTodos="/notas">
      <div className="flex flex-col overflow-hidden rounded-2xl border border-line">
        {recentes.map((p, i) => (
          <Link
            key={p.id}
            to={`/notas/${p.id}`}
            className={`flex items-center gap-3 p-3 transition-colors hover:bg-hover ${i > 0 ? 'border-t border-line' : ''}`}
          >
            {p.miniatura ? (
              <span className="isolate size-9 shrink-0 overflow-hidden rounded-md border border-line bg-bg">
                <img src={p.miniatura} alt="" className="size-full object-cover mix-blend-multiply dark:mix-blend-normal" />
              </span>
            ) : (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-hover text-muted">
                <IconeTipo pagina={p} />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium">{p.titulo || 'Sem título'}</span>
              <span className="block truncate text-[12px] text-muted">{resumoBlocos(p)}</span>
            </span>
            <span className="shrink-0 text-[12px] text-muted">
              {rotuloData(new Date(p.atualizadaEm).toISOString().slice(0, 10))}
            </span>
          </Link>
        ))}
      </div>
    </SecaoDashboard>
  )
}
