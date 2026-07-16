import { useMemo } from 'react'
import { addDays, format, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { DIAS_SEMANA } from '../../../core/dates'
import { eventosDoDia } from '../db'
import type { Evento } from '../types'

/** Visão de mês com chips de eventos por dia. */
export function VistaMes({
  mesRef,
  eventos,
  onAbrirEvento,
  onIrParaDia,
}: {
  mesRef: string // yyyy-MM
  eventos: Evento[]
  onAbrirEvento: (e: Evento) => void
  onIrParaDia: (dia: string) => void
}) {
  const mesDate = parseISO(`${mesRef}-01`)
  const celulas = useMemo(() => {
    const ini = startOfWeek(startOfMonth(mesDate), { weekStartsOn: 0 })
    return Array.from({ length: 42 }, (_, i) => format(addDays(ini, i), 'yyyy-MM-dd'))
  }, [mesRef]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line">
      <div className="grid grid-cols-7 border-b border-line bg-surface/60">
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} className="py-1.5 text-center text-[11px] font-medium text-muted">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7" style={{ gridAutoRows: 'minmax(96px, 1fr)' }}>
        {celulas.map((dia) => {
          const noMes = isSameMonth(parseISO(dia), mesDate)
          const evs = eventosDoDia(eventos, dia)
          const hoje = isToday(parseISO(dia))
          return (
            <button
              key={dia}
              onClick={() => onIrParaDia(dia)}
              className={`flex flex-col gap-0.5 border-b border-l border-line p-1 text-left transition-colors hover:bg-hover ${noMes ? '' : 'bg-surface/40'}`}
            >
              <span
                className={`flex size-6 items-center justify-center self-start rounded-full text-[12px] ${
                  hoje ? 'bg-accent font-semibold text-white' : noMes ? 'text-ink' : 'text-muted/50'
                }`}
              >
                {Number(dia.slice(8))}
              </span>
              <span className="flex flex-col gap-0.5 overflow-hidden">
                {evs.slice(0, 3).map((e) => (
                  <span
                    key={e.id}
                    onClick={(ev) => {
                      ev.stopPropagation()
                      onAbrirEvento(e)
                    }}
                    className="truncate rounded px-1 text-[10px] font-medium leading-4"
                    style={
                      e.presenca === 'confirmado'
                        ? { backgroundColor: e.cor ?? '#4073ff', color: '#fff' }
                        : { border: `1px solid ${e.cor ?? '#4073ff'}`, color: e.cor ?? '#4073ff' }
                    }
                    title={e.titulo}
                  >
                    <span className={e.presenca === 'recusado' ? 'line-through' : ''}>
                      {e.diaInteiro ? '' : `${e.inicio} `}
                      {e.titulo}
                    </span>
                  </span>
                ))}
                {evs.length > 3 && <span className="px-1 text-[10px] text-muted">+{evs.length - 3}</span>}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
