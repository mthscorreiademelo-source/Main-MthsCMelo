import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconMais } from '../../core/components/Icons'
import { hojeISO, rotuloData } from '../../core/dates'
import { useTheme } from '../../core/theme/useTheme'
import { useTarefas } from '../tarefas/hooks'
import { COR_STATUS, progressoProjeto, ROTULO_STATUS } from './db'
import { EditorProjeto } from './components/EditorProjeto'
import { useProjetosWS } from './hooks'
import type { Projeto } from '../tarefas/types'

type Filtro = 'todos' | 'favoritos' | 'arquivados'

function capaTema(p: Projeto, tema: 'light' | 'dark'): string | undefined {
  return tema === 'dark' ? (p.capaDark ?? p.capa) : p.capa
}

export function ProjetosPage() {
  const projetos = useProjetosWS()
  const tarefas = useTarefas()
  const navigate = useNavigate()
  const { tema } = useTheme()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [criar, setCriar] = useState(false)

  const porProjeto = useMemo(() => {
    const mapa = new Map<string, typeof tarefas>()
    for (const t of tarefas ?? []) {
      if (!t.projetoId) continue
      const arr = mapa.get(t.projetoId) ?? []
      arr!.push(t)
      mapa.set(t.projetoId, arr)
    }
    return mapa
  }, [tarefas])

  const lista = useMemo(() => {
    const base = [...(projetos ?? [])]
      .filter((p) => (filtro === 'arquivados' ? p.arquivado : !p.arquivado))
      .filter((p) => (filtro === 'favoritos' ? p.favorito : true))
    return base.sort(
      (a, b) => Number(b.favorito) - Number(a.favorito) || (b.ultimaAtividade ?? b.criadoEm) - (a.ultimaAtividade ?? a.criadoEm),
    )
  }, [projetos, filtro])

  const FILTROS: { id: Filtro; rotulo: string }[] = [
    { id: 'todos', rotulo: 'Todos' },
    { id: 'favoritos', rotulo: 'Favoritos' },
    { id: 'arquivados', rotulo: 'Arquivados' },
  ]

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-[22px] font-bold">Projetos</h1>
          <p className="text-[13px] text-muted">Cada projeto é um espaço próprio — reúna tudo o que importa nele.</p>
        </div>
        <button onClick={() => setCriar(true)} className="flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[14px] font-medium text-surface">
          <IconMais width={16} height={16} /> Novo projeto
        </button>
      </div>

      <div className="flex items-center gap-1 self-start rounded-full bg-hover p-0.5">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`rounded-full px-3 py-1 text-[13px] font-medium transition-colors ${filtro === f.id ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            {f.rotulo}
          </button>
        ))}
      </div>

      {projetos === undefined ? (
        <p className="py-10 text-center text-[14px] text-muted">Carregando…</p>
      ) : lista.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line py-16 text-center">
          <span className="text-4xl">🗂️</span>
          <p className="text-[15px] font-medium">Nenhum projeto {filtro === 'favoritos' ? 'favorito' : filtro === 'arquivados' ? 'arquivado' : 'ainda'}</p>
          <p className="max-w-sm text-[13px] text-muted">Um app, uma viagem, um TCC, uma empresa, um objetivo… Crie um espaço e centralize tudo relacionado a ele.</p>
          <button onClick={() => setCriar(true)} className="mt-1 flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[14px] font-medium text-surface">
            <IconMais width={16} height={16} /> Criar o primeiro
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((p) => {
            const tks = porProjeto.get(p.id) ?? []
            const prog = progressoProjeto(tks ?? [])
            const capa = capaTema(p, tema)
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/projetos/${p.id}`)}
                className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface/50 text-left transition-all hover:border-muted/40 hover:shadow-md"
              >
                {/* Capa / faixa colorida */}
                <div
                  className="h-16 w-full bg-bg"
                  style={capa ? { backgroundImage: `url(${capa})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: `linear-gradient(135deg, color-mix(in srgb, ${p.cor} 35%, transparent), color-mix(in srgb, ${p.cor} 8%, transparent))` }}
                />
                <div className="flex flex-col gap-2 p-3.5">
                  <div className="-mt-8 flex items-start justify-between">
                    <span
                      className="flex size-11 items-center justify-center rounded-xl border border-line bg-surface text-[22px] shadow-sm"
                      style={{ backgroundColor: `color-mix(in srgb, ${p.cor} 12%, var(--vida-surface))` }}
                    >
                      {p.icone ?? '📁'}
                    </span>
                    {p.favorito && <span className="mt-8 text-[13px]">⭐</span>}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="min-w-0 flex-1 truncate text-[15px] font-semibold">{p.nome}</h3>
                    </div>
                    {p.descricao && <p className="mt-0.5 line-clamp-1 text-[12.5px] text-muted">{p.descricao}</p>}
                  </div>

                  {/* Progresso */}
                  <div className="mt-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-hover">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(prog * 100)}%`, backgroundColor: p.cor }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted">
                    <span className="flex items-center gap-1.5">
                      {p.status && <span className="inline-flex items-center gap-1"><span className="size-1.5 rounded-full" style={{ backgroundColor: COR_STATUS[p.status] }} />{ROTULO_STATUS[p.status]}</span>}
                    </span>
                    <span>{Math.round(prog * 100)}%</span>
                  </div>
                  <div className="text-[10.5px] text-muted/70">
                    {p.categoria ? `${p.categoria} · ` : ''}
                    {p.ultimaAtividade ? `ativo ${rotuloData(new Date(p.ultimaAtividade).toISOString().slice(0, 10)) === rotuloData(hojeISO()) ? 'hoje' : rotuloData(new Date(p.ultimaAtividade).toISOString().slice(0, 10))}` : ''}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {criar && <EditorProjeto onFechar={() => setCriar(false)} onCriado={(id) => { setCriar(false); navigate(`/projetos/${id}`) }} />}
    </div>
  )
}
