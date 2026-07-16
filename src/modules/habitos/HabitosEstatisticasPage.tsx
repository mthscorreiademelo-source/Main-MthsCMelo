import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { IconChama, IconSetaEsquerda } from '../../core/components/Icons'
import { IconeFator } from '../../core/components/icones'
import { Heatmap } from './components/Heatmap'
import { useHabitos, useRegistros } from './hooks'
import {
  estatGlobais,
  heatmapGlobal,
  rankingHabitos,
  serieUltimosDias,
  streakGeral,
} from './progresso'

function Tile({ valor, rotulo, cor }: { valor: string; rotulo: string; cor?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-line bg-surface/60 p-3">
      <span className="text-[22px] font-bold tabular-nums" style={cor ? { color: cor } : undefined}>
        {valor}
      </span>
      <span className="text-[12px] text-muted">{rotulo}</span>
    </div>
  )
}

/** Barras dos últimos N dias (% concluído). */
function BarrasDias({ serie }: { serie: { data: string; fracao: number; total: number }[] }) {
  return (
    <div className="flex items-end gap-[3px]" style={{ height: 96 }}>
      {serie.map((s) => {
        const h = s.total === 0 ? 3 : Math.max(4, Math.round(s.fracao * 92))
        const cheio = s.total > 0 && s.fracao >= 1
        return (
          <div key={s.data} className="group relative flex flex-1 flex-col justify-end">
            <div
              className="w-full rounded-t-[3px] transition-[height] duration-500"
              style={{
                height: h,
                backgroundColor: s.total === 0 ? 'var(--vida-line)' : cheio ? 'var(--vida-accent)' : 'var(--vida-accent)',
                opacity: s.total === 0 ? 1 : 0.35 + s.fracao * 0.65,
              }}
              title={`${format(parseISO(s.data), 'dd/MM')} · ${Math.round(s.fracao * 100)}%`}
            />
          </div>
        )
      })}
    </div>
  )
}

export function HabitosEstatisticasPage() {
  const habitos = useHabitos()
  const registros = useRegistros()

  const ativos = useMemo(() => (habitos ?? []).filter((h) => !h.arquivado), [habitos])
  const g = useMemo(() => estatGlobais(ativos, registros ?? [], 30), [ativos, registros])
  const streak = useMemo(() => streakGeral(ativos, registros ?? []), [ativos, registros])
  const serie14 = useMemo(() => serieUltimosDias(ativos, registros ?? [], 14), [ativos, registros])
  const heat = useMemo(() => heatmapGlobal(ativos, registros ?? [], 133), [ativos, registros])
  const ranking = useMemo(() => rankingHabitos(ativos, registros ?? [], 30), [ativos, registros])

  const carregando = habitos === undefined || registros === undefined

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <Link to="/habitos" className="flex items-center gap-1 text-[13px] text-muted hover:text-ink">
          <IconSetaEsquerda width={16} height={16} />
          Hábitos
        </Link>
        <h1 className="text-[15px] font-semibold">Estatísticas</h1>
      </div>

      {carregando ? (
        <p className="py-16 text-center text-sm text-muted">Carregando…</p>
      ) : ativos.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">
          Crie alguns hábitos para ver suas estatísticas aqui.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile valor={`${Math.round(g.taxa * 100)}%`} rotulo="Conclusão (30 d)" cor="var(--vida-accent)" />
            <Tile valor={`${g.diasPerfeitos}`} rotulo="Dias perfeitos (30 d)" />
            <Tile valor={`${streak}`} rotulo="Sequência geral" cor="#d89b6c" />
            <Tile valor={`${g.ativos}`} rotulo="Hábitos ativos" />
          </div>

          <section className="flex flex-col gap-2">
            <h2 className="text-[13px] font-medium text-muted">Últimos 14 dias</h2>
            <div className="rounded-xl border border-line bg-surface/60 p-3">
              <BarrasDias serie={serie14} />
              <div className="mt-1.5 flex justify-between text-[10px] text-muted">
                <span>{format(parseISO(serie14[0].data), 'dd/MM')}</span>
                <span>hoje</span>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[13px] font-medium text-muted">Constância</h2>
            <div className="rounded-xl border border-line bg-surface/60 p-3">
              <Heatmap dias={heat} cor="var(--vida-accent)" />
              <div className="mt-2 flex items-center gap-3 text-[11px] text-muted">
                <span className="flex items-center gap-1">
                  <span className="size-3 rounded-[3px]" style={{ backgroundColor: 'var(--vida-accent)' }} /> dia completo
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-3 rounded-[3px] bg-line" /> incompleto
                </span>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[13px] font-medium text-muted">Por hábito (30 dias)</h2>
            <div className="flex flex-col divide-y divide-line/70 overflow-hidden rounded-xl border border-line bg-surface/60">
              {ranking.map((r) => {
                const cor = r.habito.cor ?? 'var(--vida-accent)'
                return (
                  <Link
                    key={r.habito.id}
                    to={`/habitos/${r.habito.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-hover"
                  >
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${cor}1f`, color: cor }}
                    >
                      <IconeFator nome={r.habito.icone} width={16} height={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[14px] font-medium">{r.habito.nome}</span>
                        <span className="shrink-0 text-[13px] font-semibold tabular-nums" style={{ color: cor }}>
                          {Math.round(r.taxa * 100)}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line/70">
                        <div
                          className="h-full rounded-full transition-[width] duration-500"
                          style={{ width: `${Math.round(r.taxa * 100)}%`, backgroundColor: cor }}
                        />
                      </div>
                    </div>
                    {r.streak > 0 && (
                      <span className="flex shrink-0 items-center gap-0.5 text-[12px] font-medium text-amber-500">
                        <IconChama width={13} height={13} />
                        {r.streak}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
