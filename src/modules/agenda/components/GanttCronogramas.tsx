import { differenceInCalendarDays, format, isToday, parseISO } from 'date-fns'
import { IconMais } from '../../../core/components/Icons'
import type { Cronograma, Evento } from '../types'

const DAY_W = 34
const NOME_W = 128
const BAR_H = 26

interface Barra {
  evento: Evento
  offset: number
  span: number
  lane: number
}

function empacotar(eventos: Evento[], dias: string[]): { barras: Barra[]; lanes: number } {
  const jIni = dias[0]
  const jFim = dias[dias.length - 1]
  const brutas = eventos
    .map((e) => {
      const ini = e.data
      const fim = e.dataFim && e.dataFim > e.data ? e.dataFim : e.data
      if (fim < jIni || ini > jFim) return null
      const start = ini < jIni ? jIni : ini
      const end = fim > jFim ? jFim : fim
      const offset = differenceInCalendarDays(parseISO(start), parseISO(jIni))
      const span = differenceInCalendarDays(parseISO(end), parseISO(start)) + 1
      return { evento: e, offset, span, lane: 0 } as Barra
    })
    .filter((b): b is Barra => !!b)
    .sort((a, b) => a.offset - b.offset)

  const fimLane: number[] = []
  for (const b of brutas) {
    let l = fimLane.findIndex((f) => f <= b.offset)
    if (l === -1) {
      l = fimLane.length
      fimLane.push(b.offset + b.span)
    } else {
      fimLane[l] = b.offset + b.span
    }
    b.lane = l
  }
  return { barras: brutas, lanes: Math.max(1, fimLane.length) }
}

export function GanttCronogramas({
  dias,
  eventos,
  cronogramas,
  onAbrirEvento,
  onGerenciar,
}: {
  dias: string[]
  eventos: Evento[]
  cronogramas: Cronograma[]
  onAbrirEvento: (e: Evento) => void
  onGerenciar: () => void
}) {
  const grupos = cronogramas.map((c) => ({
    cronograma: c,
    ...empacotar(eventos.filter((e) => e.cronogramaId === c.id), dias),
  }))
  const semCron = eventos.filter((e) => !e.cronogramaId && e.dataFim && e.dataFim > e.data)
  const grupoSem = semCron.length ? { cronograma: null, ...empacotar(semCron, dias) } : null

  const larguraTotal = NOME_W + dias.length * DAY_W

  const Cabecalho = (
    <div className="flex border-b border-line bg-surface/60" style={{ minWidth: larguraTotal }}>
      <div className="sticky left-0 z-10 shrink-0 bg-surface/60" style={{ width: NOME_W }} />
      {dias.map((d) => {
        const dt = parseISO(d)
        const fds = [0, 6].includes(dt.getDay())
        return (
          <div
            key={d}
            className={`shrink-0 border-l border-line py-1 text-center text-[10px] ${fds ? 'bg-hover/40' : ''} ${isToday(dt) ? 'font-bold text-accent' : 'text-muted'}`}
            style={{ width: DAY_W }}
          >
            {format(dt, 'd')}
          </div>
        )
      })}
    </div>
  )

  function Linha({ cor, nome, barras, lanes, semCorFundo }: { cor: string; nome: string; barras: Barra[]; lanes: number; semCorFundo?: boolean }) {
    return (
      <div className="flex border-b border-line" style={{ minWidth: larguraTotal }}>
        <div className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-line bg-bg px-3 py-2" style={{ width: NOME_W }}>
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
          <span className="truncate text-[13px] font-medium">{nome}</span>
        </div>
        <div className="relative" style={{ width: dias.length * DAY_W, height: lanes * BAR_H + 8, padding: '4px 0' }}>
          {/* grades verticais */}
          {dias.map((d, i) => {
            const fds = [0, 6].includes(parseISO(d).getDay())
            return <div key={d} className={`absolute top-0 bottom-0 border-l border-line/50 ${fds ? 'bg-hover/30' : ''}`} style={{ left: i * DAY_W, width: DAY_W }} />
          })}
          {barras.length === 0 && (
            <span className="absolute left-2 top-2 text-[11px] text-muted/60">— sem eventos neste período —</span>
          )}
          {barras.map((b) => {
            const cbg = semCorFundo ? b.evento.cor ?? cor : cor
            return (
              <button
                key={b.evento.id}
                onClick={() => onAbrirEvento(b.evento)}
                title={b.evento.titulo}
                className="absolute z-[1] flex items-center overflow-hidden rounded-md px-2 text-left text-[11px] font-medium text-white shadow-sm"
                style={{ left: b.offset * DAY_W + 2, width: b.span * DAY_W - 4, top: b.lane * BAR_H + 4, height: BAR_H - 4, backgroundColor: cbg }}
              >
                <span className="truncate">{b.evento.titulo}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted">Eventos de vários dias, agrupados por cronograma.</p>
        <button onClick={onGerenciar} className="flex min-h-8 items-center gap-1 rounded-full border border-line px-3 text-[13px] text-muted transition-colors hover:text-ink">
          <IconMais width={14} height={14} /> Cronogramas
        </button>
      </div>

      {cronogramas.length === 0 && !grupoSem ? (
        <div className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-[14px] text-muted">
          Crie um cronograma (ex.: Trabalho, Exercícios) e marque eventos nele para ver o Gantt aqui.
          <div className="mt-3">
            <button onClick={onGerenciar} className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-surface">
              Criar cronograma
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          {Cabecalho}
          {grupos.map((g) => (
            <Linha key={g.cronograma.id} cor={g.cronograma.cor ?? '#4073ff'} nome={g.cronograma.nome} barras={g.barras} lanes={g.lanes} />
          ))}
          {grupoSem && <Linha cor="var(--vida-muted)" nome="Sem cronograma" barras={grupoSem.barras} lanes={grupoSem.lanes} semCorFundo />}
        </div>
      )}
    </div>
  )
}
