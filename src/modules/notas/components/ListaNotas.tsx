import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { IconCaneta, IconDocumento, IconPasta } from '../../../core/components/Icons'
import { alternarArquivado, alternarFavorito, alternarFixado } from '../acoes'
import { excluirPagina, textoResumo } from '../db'
import type { Pagina } from '../types'

/** Lista de notas com ações rápidas (favoritar/fixar/arquivar/excluir). */
export function ListaNotas({ paginas }: { paginas: Pagina[] }) {
  const navigate = useNavigate()
  const [menu, setMenu] = useState<string | null>(null)

  if (paginas.length === 0) return null

  return (
    <ul className="flex flex-col">
      {paginas.map((p) => {
        const ehDesenho = p.tipo === 'desenho'
        const ehArquivos = p.tipo === 'arquivos'
        const qtdArq = p.arquivos?.length ?? 0
        const resumo = ehDesenho ? 'Desenho à mão' : ehArquivos ? `${qtdArq} ${qtdArq === 1 ? 'arquivo' : 'arquivos'}` : textoResumo(p)
        return (
          <li key={p.id} className="group relative flex items-center gap-1">
            <button onClick={() => navigate(`/notas/${p.id}`)} className="flex min-h-14 flex-1 items-center gap-3 rounded-lg px-2 text-left transition-colors hover:bg-hover">
              {ehDesenho && p.miniatura ? (
                <img src={p.miniatura} alt="" className="h-12 w-9 shrink-0 rounded-md border border-line object-cover" />
              ) : ehDesenho ? (
                <IconCaneta className="shrink-0 text-muted" width={18} height={18} />
              ) : ehArquivos ? (
                <IconPasta className="shrink-0 text-muted" width={18} height={18} />
              ) : (
                <IconDocumento className="shrink-0 text-muted" width={18} height={18} />
              )}
              <span className="min-w-0 flex-1 py-2.5">
                <span className="flex items-center gap-1.5">
                  {p.fixado && <span className="text-[11px]">📌</span>}
                  <span className="min-w-0 truncate text-[15px] font-medium">{p.titulo || 'Sem título'}</span>
                  {p.favorito && <span className="text-[11px]">⭐</span>}
                </span>
                {resumo && <span className="block truncate text-[13px] text-muted">{resumo}</span>}
                {p.tags && p.tags.length > 0 && (
                  <span className="mt-0.5 flex flex-wrap gap-1">{p.tags.slice(0, 3).map((t) => <span key={t} className="rounded bg-hover px-1.5 text-[10.5px] text-muted">#{t}</span>)}</span>
                )}
              </span>
              <span className="shrink-0 text-[12.5px] text-muted/70">{format(p.atualizadaEm, "d MMM", { locale: ptBR })}</span>
            </button>
            <div className="relative shrink-0">
              <button onClick={() => setMenu(menu === p.id ? null : p.id)} aria-label="Ações" className="flex size-8 items-center justify-center rounded-full text-muted opacity-0 transition-opacity hover:bg-hover group-hover:opacity-100 aria-expanded:opacity-100" aria-expanded={menu === p.id}>⋯</button>
              {menu === p.id && (
                <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-line bg-surface p-1 shadow-xl">
                  <button onClick={() => { alternarFavorito(p); setMenu(null) }} className="block w-full rounded-lg px-3 py-1.5 text-left text-[13px] hover:bg-hover">{p.favorito ? 'Remover favorito' : 'Favoritar'}</button>
                  <button onClick={() => { alternarFixado(p); setMenu(null) }} className="block w-full rounded-lg px-3 py-1.5 text-left text-[13px] hover:bg-hover">{p.fixado ? 'Desafixar' : 'Fixar no topo'}</button>
                  <button onClick={() => { alternarArquivado(p); setMenu(null) }} className="block w-full rounded-lg px-3 py-1.5 text-left text-[13px] hover:bg-hover">{p.arquivado ? 'Desarquivar' : 'Arquivar'}</button>
                  <button onClick={() => { if (confirm('Excluir esta nota?')) excluirPagina(p.id); setMenu(null) }} className="block w-full rounded-lg px-3 py-1.5 text-left text-[13px] text-danger hover:bg-hover">Excluir</button>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
