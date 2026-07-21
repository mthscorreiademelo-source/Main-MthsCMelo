import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { atualizarPagina } from '../acoes'
import { buscarEntidades, ORDEM_TIPOS, TIPOS_RELACAO, useRelacoesResolvidas } from '../relacoes'
import type { Pagina, RelacaoNota, TipoRelacao } from '../types'

const mesma = (a: RelacaoNota, b: RelacaoNota) => a.tipo === b.tipo && a.id === b.id

/**
 * "Relacionado a": chips das relações + seletor de novas.
 * Em editor com estado local, passe `onAtualizar` (o autosave persiste); sem
 * ele, grava direto no banco (uso somente-leitura em outros contextos).
 */
export function ChipsRelacao({ pagina, onAtualizar }: { pagina: Pagina; onAtualizar?: (m: Partial<Pagina>) => void }) {
  const navigate = useNavigate()
  const resolvidas = useRelacoesResolvidas(pagina.relacoes)
  const [selecionar, setSelecionar] = useState(false)

  function aplicar(relacoes: RelacaoNota[], extra: Partial<Pagina>) {
    if (onAtualizar) onAtualizar({ relacoes, ...extra })
    else atualizarPagina(pagina.id, { relacoes, ...extra })
  }
  function adicionar(rel: RelacaoNota) {
    if ((pagina.relacoes ?? []).some((r) => mesma(r, rel))) return
    const relacoes = [...(pagina.relacoes ?? []), rel]
    aplicar(relacoes, rel.tipo === 'projeto' ? { projetoId: rel.id } : {})
  }
  function remover(rel: RelacaoNota) {
    const relacoes = (pagina.relacoes ?? []).filter((r) => !mesma(r, rel))
    const aindaProjeto = relacoes.some((r) => r.tipo === 'projeto')
    const extra = rel.tipo === 'projeto' && pagina.projetoId === rel.id && !aindaProjeto ? { projetoId: undefined } : {}
    aplicar(relacoes, extra)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">Relacionado a</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {(resolvidas ?? []).map((r) => (
          <span key={`${r.tipo}:${r.id}`} className={`inline-flex items-center gap-1 rounded-full border border-line py-1 pl-2 pr-1 text-[12.5px] ${r.existe ? '' : 'opacity-60'}`}>
            <button onClick={() => r.existe && navigate(r.rota)} className="flex items-center gap-1 hover:text-accent">
              <span>{r.emoji}</span>
              <span className="max-w-[140px] truncate">{r.nome}</span>
            </button>
            <button onClick={() => remover({ tipo: r.tipo, id: r.id })} aria-label="Remover" className="flex size-4 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-danger">×</button>
          </span>
        ))}
        <button onClick={() => setSelecionar(true)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-2.5 py-1 text-[12.5px] text-muted hover:text-ink">+ Relacionar</button>
      </div>
      {selecionar && <SeletorRelacao pagina={pagina} onEscolher={(rel) => { adicionar(rel); setSelecionar(false) }} onFechar={() => setSelecionar(false)} />}
    </div>
  )
}

function SeletorRelacao({ pagina, onEscolher, onFechar }: { pagina: Pagina; onEscolher: (rel: RelacaoNota) => void; onFechar: () => void }) {
  const [tipo, setTipo] = useState<TipoRelacao>('projeto')
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState<{ id: string; nome: string }[]>([])
  const jaTem = useMemo(() => new Set((pagina.relacoes ?? []).map((r) => `${r.tipo}:${r.id}`)), [pagina.relacoes])

  useEffect(() => {
    let vivo = true
    buscarEntidades(tipo, termo).then((r) => { if (vivo) setResultados(r.filter((x) => !(tipo === 'nota' && x.id === pagina.id))) })
    return () => { vivo = false }
  }, [tipo, termo, pagina.id])

  return (
    <FolhaInferior titulo="Relacionar a" onFechar={onFechar}>
      <div className="flex flex-col gap-3">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
          {ORDEM_TIPOS.map((t) => (
            <button key={t} onClick={() => setTipo(t)} className={`shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${tipo === t ? 'bg-ink text-surface' : 'text-muted hover:bg-hover'}`}>{TIPOS_RELACAO[t].emoji} {TIPOS_RELACAO[t].rotulo}</button>
          ))}
        </div>
        <input autoFocus value={termo} onChange={(e) => setTermo(e.target.value)} placeholder={`Buscar ${TIPOS_RELACAO[tipo].rotulo.toLowerCase()}…`} className="min-h-11 rounded-xl border border-line bg-surface/60 px-3 text-[14px] outline-none focus:border-muted/50" />
        <ul className="flex max-h-[45vh] flex-col gap-1 overflow-y-auto">
          {resultados.length === 0 ? (
            <li className="py-6 text-center text-[13px] text-muted">Nenhum {TIPOS_RELACAO[tipo].rotulo.toLowerCase()} encontrado.</li>
          ) : (
            resultados.map((r) => {
              const usado = jaTem.has(`${tipo}:${r.id}`)
              return (
                <li key={r.id}>
                  <button disabled={usado} onClick={() => onEscolher({ tipo, id: r.id })} className="flex w-full items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-left text-[14px] hover:bg-hover/50 disabled:opacity-40">
                    <span>{TIPOS_RELACAO[tipo].emoji}</span>
                    <span className="min-w-0 flex-1 truncate">{r.nome}</span>
                    {usado && <span className="text-[11px] text-muted">já vinculado</span>}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      </div>
    </FolhaInferior>
  )
}
