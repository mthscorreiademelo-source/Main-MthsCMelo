import { useMemo } from 'react'
import { addDays, endOfMonth, format, isToday, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { DIAS_SEMANA, rotuloMes } from '../../../core/dates'
import { expandirEventos } from '../db'
import type { Evento } from '../types'

function MiniMes({
  mesRef,
  comEvento,
  onIrParaDia,
}: {
  mesRef: string
  comEvento: Set<string>
  onIrParaDia: (dia: string) => void
}) {
  const mesDate = parseISO(`${mesRef}-01`)
  const ini = startOfWeek(startOfMonth(mesDate), { weekStartsOn: 0 })
  const dias = Array.from({ length: 42 }, (_, i) => format(addDays(ini, i), 'yyyy-MM-dd'))
  const mm = format(mesDate, 'MM')

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-line p-2.5">
      <div className="px-1 text-[13px] font-semibold capitalize">{rotuloMes(mesRef).split(' de ')[0]}</div>
      <div className="grid grid-cols-7">
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} className="pb-0.5 text-center text-[9px] text-muted/70">{d}</div>
        ))}
        {dias.map((dia) => {
          const noMes = format(parseISO(dia), 'MM') === mm
          const hoje = isToday(parseISO(dia))
          const tem = comEvento.has(dia)
          return (
            <button
              key={dia}
              onClick={() => onIrParaDia(dia)}
              className="flex aspect-square flex-col items-center justify-center rounded transition-colors hover:bg-hover"
            >
              <span
                className={`flex size-5 items-center justify-center rounded-full text-[10px] ${
                  hoje ? 'bg-accent font-semibold text-white' : noMes ? '' : 'text-muted/40'
                }`}
              >
                {Number(dia.slice(8))}
              </span>
              <span className={`mt-px size-1 rounded-full ${tem && noMes ? 'bg-accent' : 'bg-transparent'}`} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Trimestre (3) ou ano (12) em mini-calendários. */
export function VistaMultiMes({
  meses,
  eventos,
  onIrParaDia,
}: {
  meses: string[] // yyyy-MM em ordem
  eventos: Evento[]
  onIrParaDia: (dia: string) => void
}) {
  const comEvento = useMemo(() => {
    const dias: string[] = []
    for (const m of meses) {
      const d0 = startOfMonth(parseISO(`${m}-01`))
      const dn = endOfMonth(d0)
      for (let d = d0; d <= dn; d = addDays(d, 1)) dias.push(format(d, 'yyyy-MM-dd'))
    }
    return new Set(expandirEventos(eventos, dias).map((o) => o.data))
  }, [meses, eventos])

  return (
    <div className={`grid gap-3 ${meses.length > 3 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
      {meses.map((m) => (
        <MiniMes key={m} mesRef={m} comEvento={comEvento} onIrParaDia={onIrParaDia} />
      ))}
    </div>
  )
}
