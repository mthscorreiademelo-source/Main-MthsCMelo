import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { IconCaneta, IconDocumento, IconPasta } from '../../../core/components/Icons'
import { textoResumo } from '../db'
import type { Pagina } from '../types'

/** Lista de notas com preview — usada nas notas soltas e dentro dos grupos. */
export function ListaPaginas({ paginas }: { paginas: Pagina[] }) {
  const navigate = useNavigate()
  return (
    <ul className="flex flex-col">
      {paginas.map((p) => {
        const ehDesenho = p.tipo === 'desenho'
        const ehArquivos = p.tipo === 'arquivos'
        const qtdArq = p.arquivos?.length ?? 0
        const resumo = ehDesenho
          ? 'Desenho à mão'
          : ehArquivos
            ? `${qtdArq} ${qtdArq === 1 ? 'arquivo' : 'arquivos'}`
            : textoResumo(p)
        return (
          <li key={p.id}>
            <button
              onClick={() => navigate(`/notas/${p.id}`)}
              className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-lg px-2 text-left transition-colors hover:bg-hover"
            >
              {ehDesenho && p.miniatura ? (
                <img
                  src={p.miniatura}
                  alt=""
                  className="h-12 w-9 shrink-0 rounded-md border border-line object-cover"
                />
              ) : ehDesenho ? (
                <IconCaneta className="shrink-0 text-muted" width={18} height={18} />
              ) : ehArquivos ? (
                <IconPasta className="shrink-0 text-muted" width={18} height={18} />
              ) : (
                <IconDocumento className="shrink-0 text-muted" width={18} height={18} />
              )}
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
  )
}
