import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconChevron, IconLupa, IconMais } from '../../../core/components/Icons'
import { useTheme } from '../../../core/theme/useTheme'
import { useTarefas } from '../../tarefas/hooks'
import type { Projeto } from '../../tarefas/types'
import { progressoProjeto } from '../db'
import { useProjetosWS } from '../hooks'
import { EditorProjeto } from './EditorProjeto'

type Filtro = 'todos' | 'favoritos' | 'arquivados'

function ultimaAtividadeLegivel(ts?: number): string {
  if (!ts) return '—'
  const dias = Math.floor((Date.now() - ts) / 86400000)
  if (dias <= 0) return 'Hoje'
  if (dias === 1) return 'Ontem'
  if (dias < 7) return `${dias} dias atrás`
  if (dias < 14) return '1 semana atrás'
  return `${Math.floor(dias / 7)} semanas atrás`
}

function capaTema(p: Projeto, tema: 'light' | 'dark') {
  return tema === 'dark' ? (p.capaDark ?? p.capa) : p.capa
}

export function ListaProjetos({ selecionadoId, onColapsar }: { selecionadoId?: string; onColapsar?: () => void }) {
  const projetos = useProjetosWS()
  const tarefas = useTarefas()
  const navigate = useNavigate()
  const { tema } = useTheme()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busca, setBusca] = useState('')
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [criar, setCriar] = useState(false)

  const progressoDe = useMemo(() => {
    const mapa = new Map<string, number>()
    const porProj = new Map<string, typeof tarefas>()
    for (const t of tarefas ?? []) {
      if (!t.projetoId) continue
      const arr = porProj.get(t.projetoId) ?? []
      arr!.push(t)
      porProj.set(t.projetoId, arr)
    }
    for (const [pid, arr] of porProj) mapa.set(pid, progressoProjeto(arr ?? []))
    return mapa
  }, [tarefas])

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return [...(projetos ?? [])]
      .filter((p) => (filtro === 'arquivados' ? p.arquivado : !p.arquivado))
      .filter((p) => (filtro === 'favoritos' ? p.favorito : true))
      .filter((p) => (q ? p.nome.toLowerCase().includes(q) || (p.descricao ?? '').toLowerCase().includes(q) : true))
      .sort((a, b) => Number(b.favorito) - Number(a.favorito) || (b.ultimaAtividade ?? b.criadoEm) - (a.ultimaAtividade ?? a.criadoEm))
  }, [projetos, filtro, busca])

  const FILTROS: { id: Filtro; rotulo: string }[] = [
    { id: 'todos', rotulo: 'Todos' },
    { id: 'favoritos', rotulo: 'Favoritos' },
    { id: 'arquivados', rotulo: 'Arquivados' },
  ]

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-[20px] font-bold">Projetos</h1>
        <div className="flex items-center gap-1">
          <button onClick={() => setBuscaAberta((v) => !v)} aria-label="Buscar" className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink"><IconLupa width={16} height={16} /></button>
          <button onClick={() => setCriar(true)} aria-label="Novo projeto" className="flex size-8 items-center justify-center rounded-full bg-accent text-white"><IconMais width={16} height={16} /></button>
          {onColapsar && (
            <button onClick={onColapsar} aria-label="Recolher painel" title="Recolher painel" className="ml-0.5 flex size-8 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink"><IconChevron className="rotate-90" width={16} height={16} /></button>
          )}
        </div>
      </div>

      {buscaAberta && (
        <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar projeto…" className="min-h-9 rounded-xl border border-line bg-surface/60 px-3 text-[14px] outline-none focus:border-muted/50" />
      )}

      {/* Filtros */}
      <div className="flex items-center gap-1 text-[13px] font-medium">
        {FILTROS.map((f) => (
          <button key={f.id} onClick={() => setFiltro(f.id)} className={`rounded-full px-2.5 py-1 transition-colors ${filtro === f.id ? 'bg-hover text-ink' : 'text-muted hover:text-ink'}`}>{f.rotulo}</button>
        ))}
      </div>

      {/* Cards */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
        {projetos === undefined ? (
          <p className="py-6 text-center text-[13px] text-muted">Carregando…</p>
        ) : lista.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-muted">Nenhum projeto {filtro === 'favoritos' ? 'favorito' : filtro === 'arquivados' ? 'arquivado' : 'ainda'}.</p>
        ) : (
          lista.map((p) => {
            const prog = progressoDe.get(p.id) ?? 0
            const capa = capaTema(p, tema)
            const sel = p.id === selecionadoId
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/projetos/${p.id}`)}
                className={`flex flex-col gap-2 rounded-2xl border p-3 text-left transition-colors ${sel ? 'border-accent/40 bg-accent/[0.07]' : 'border-line bg-surface/40 hover:bg-hover/40'}`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[18px]"
                    style={capa ? { backgroundImage: `url(${capa})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundColor: `color-mix(in srgb, ${p.cor} 16%, var(--vida-surface))` }}
                  >
                    {!capa && (p.icone ?? '📁')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{p.nome}</span>
                      {p.favorito && <span className="text-[11px]">⭐</span>}
                    </span>
                    {p.descricao && <span className="block truncate text-[11.5px] text-muted">{p.descricao}</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hover">
                    <div className="h-full rounded-full" style={{ width: `${Math.round(prog * 100)}%`, backgroundColor: p.cor }} />
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold text-muted tabular-nums">{Math.round(prog * 100)}%</span>
                </div>
                <span className="text-[10.5px] text-muted/70">Última atividade: {ultimaAtividadeLegivel(p.ultimaAtividade)}</span>
              </button>
            )
          })
        )}
      </div>

      {/* Novo projeto */}
      <button onClick={() => setCriar(true)} className="flex min-h-10 items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line text-[13.5px] font-medium text-muted hover:text-ink">
        <IconMais width={15} height={15} /> Novo projeto
      </button>

      {criar && <EditorProjeto onFechar={() => setCriar(false)} onCriado={(id) => { setCriar(false); navigate(`/projetos/${id}`) }} />}
    </div>
  )
}
