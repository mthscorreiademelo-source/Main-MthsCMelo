import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EmptyState } from '../../core/components/EmptyState'
import { IconDocumento, IconMais } from '../../core/components/Icons'
import { criarPagina, textoResumo } from './db'
import { usePaginas } from './hooks'

export function NotasPage() {
  const paginas = usePaginas()
  const navigate = useNavigate()

  async function novaPagina() {
    const id = await criarPagina()
    navigate(`/notas/${id}`)
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <button
        onClick={novaPagina}
        className="flex min-h-12 cursor-pointer items-center gap-1 rounded-lg border border-line bg-surface/60 px-2 text-[15px] text-muted transition-colors hover:border-muted/50 hover:text-ink"
      >
        <span className="flex size-11 items-center justify-center">
          <IconMais />
        </span>
        Nova página
      </button>

      {paginas && paginas.length === 0 && (
        <EmptyState
          icone={<IconDocumento />}
          titulo="Nenhuma página ainda"
          descricao="Crie sua primeira página para anotar qualquer coisa."
        />
      )}

      <ul className="flex flex-col">
        {paginas?.map((p) => {
          const resumo = textoResumo(p)
          return (
            <li key={p.id}>
              <button
                onClick={() => navigate(`/notas/${p.id}`)}
                className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-lg px-2 text-left transition-colors hover:bg-hover"
              >
                <IconDocumento className="shrink-0 text-muted" width={18} height={18} />
                <span className="min-w-0 flex-1 py-2.5">
                  <span className="block truncate text-[15px] font-medium">
                    {p.titulo || 'Sem título'}
                  </span>
                  {resumo && (
                    <span className="block truncate text-[13px] text-muted">{resumo}</span>
                  )}
                </span>
                <span className="shrink-0 pr-2 text-[13px] text-muted/70">
                  {format(p.atualizadaEm, "d 'de' MMM", { locale: ptBR })}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
