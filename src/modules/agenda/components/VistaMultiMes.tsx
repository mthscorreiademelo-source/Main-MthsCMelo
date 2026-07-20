import { useMemo } from 'react'
import { addDays, endOfMonth, format, isToday, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { DIAS_SEMANA, rotuloMes } from '../../../core/dates'
import { expandirEventos } from '../db'
import type { Evento } from '../types'

/** Cor de calor pela carga (nº de eventos no dia). */
function corCalor(n: number): string {
  if (n <= 0) return 'transparent'
  const pct = Math.min(60, 14 + n * 16)
  return `color-mix(in srgb, var(--vida-accent) ${pct}%, transparent)`
}

function MiniMes({
  mesRef,
  carga,
  total,
  onIrParaDia,
}: {
  mesRef: string
  carga: Map<string, number>
  total: number
  onIrParaDia: (dia: string) => void
}) {
  const mesDate = parseISO(`${mesRef}-01`)
  const ini = startOfWeek(startOfMonth(mesDate), { weekStartsOn: 0 })
  const dias = Array.from({ length: 42 }, (_, i) => format(addDays(ini, i), 'yyyy-MM-dd'))
  const mm = format(mesDate, 'MM')

  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-line p-3">
      <div className="flex items-baseline justify-between px-0.5">
        <span className="text-[13px] font-semibold capitalize">{rotuloMes(mesRef).split(' de ')[0]}</span>
        {total > 0 && <span className="text-[10.5px] text-muted">{total} ev</span>}
      </div>
      <div className="grid grid-cols-7 gap-[3px]">
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} className="pb-0.5 text-center text-[9px] text-muted/60">{d}</div>
        ))}
        {dias.map((dia) => {
          const noMes = format(parseISO(dia), 'MM') === mm
          const hoje = isToday(parseISO(dia))
          const n = noMes ? carga.get(dia) ?? 0 : 0
          return (
            <button
              key={dia}
              onClick={() => onIrParaDia(dia)}
              title={n > 0 ? `${Number(dia.slice(8))}: ${n} evento(s)` : undefined}
              className="flex aspect-square items-center justify-center rounded-[5px] text-[10px] transition-transform hover:scale-110"
              style={{
                backgroundColor: hoje ? 'var(--vida-accent)' : n > 0 ? corCalor(n) : noMes ? 'var(--vida-hover)' : 'transparent',
                color: hoje ? '#fff' : noMes ? 'var(--vida-ink)' : 'var(--vida-muted)',
                opacity: noMes ? 1 : 0.3,
              }}
            >
              {Number(dia.slice(8))}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Ano como mapa de calor da vida — meses e dias coloridos pela carga de eventos. */
export function VistaMultiMes({
  meses,
  eventos,
  onIrParaDia,
}: {
  meses: string[]
  eventos: Evento[]
  onIrParaDia: (dia: string) => void
}) {
  const { cargaPorMes, totalPorMes } = useMemo(() => {
    const cargaPorMes = new Map<string, Map<string, number>>()
    const totalPorMes = new Map<string, number>()
    for (const m of meses) {
      const d0 = startOfMonth(parseISO(`${m}-01`))
      const dn = endOfMonth(d0)
      const dias: string[] = []
      for (let d = d0; d <= dn; d = addDays(d, 1)) dias.push(format(d, 'yyyy-MM-dd'))
      const carga = new Map<string, number>()
      for (const o of expandirEventos(eventos, dias)) carga.set(o.data, (carga.get(o.data) ?? 0) + 1)
      cargaPorMes.set(m, carga)
      totalPorMes.set(m, [...carga.values()].reduce((a, b) => a + b, 0))
    }
    return { cargaPorMes, totalPorMes }
  }, [meses, eventos])

  return (
    <div className={`grid gap-3 ${meses.length > 3 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
      {meses.map((m) => (
        <MiniMes key={m} mesRef={m} carga={cargaPorMes.get(m) ?? new Map()} total={totalPorMes.get(m) ?? 0} onIrParaDia={onIrParaDia} />
      ))}
    </div>
  )
}
