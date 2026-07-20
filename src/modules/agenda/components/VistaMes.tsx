import { useMemo } from 'react'
import { addDays, format, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { DIAS_SEMANA } from '../../../core/dates'
import { useRegistros as useRegistrosHabitos } from '../../habitos/hooks'
import { useHumorTipos, useRegistros as useRegistrosHumor } from '../../humor/hooks'
import { humorDe, mediaNivel, registrosDoDia as registrosHumorDoDia } from '../../humor/humor'
import type { NivelHumor } from '../../humor/types'
import { useTarefas } from '../../tarefas/hooks'
import { eventosDoDia, paraMin } from '../db'
import type { Evento } from '../types'

/** Visão de mês estratégica: carga por cor + indicadores (eventos, hábitos, humor, prazos). */
export function VistaMes({
  mesRef,
  eventos,
  onAbrirEvento,
  onIrParaDia,
}: {
  mesRef: string
  eventos: Evento[]
  onAbrirEvento: (e: Evento) => void
  onIrParaDia: (dia: string) => void
}) {
  const tarefas = useTarefas() ?? []
  const regHumor = useRegistrosHumor() ?? []
  const humorTipos = useHumorTipos() ?? []
  const regHabitos = useRegistrosHabitos() ?? []

  const mesDate = parseISO(`${mesRef}-01`)
  const celulas = useMemo(() => {
    const ini = startOfWeek(startOfMonth(mesDate), { weekStartsOn: 0 })
    return Array.from({ length: 42 }, (_, i) => format(addDays(ini, i), 'yyyy-MM-dd'))
  }, [mesRef]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-line">
      <div className="grid grid-cols-7 border-b border-line bg-surface/60">
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7" style={{ gridAutoRows: 'minmax(104px, 1fr)' }}>
        {celulas.map((dia) => {
          const noMes = isSameMonth(parseISO(dia), mesDate)
          const evs = eventosDoDia(eventos, dia)
          const hoje = isToday(parseISO(dia))
          const cargaMin = evs.reduce((s, e) => (e.diaInteiro ? s : s + Math.max(15, paraMin(e.fim) - paraMin(e.inicio))), 0)
          const carga = Math.min(1, cargaMin / 480)
          const habitosFeitos = regHabitos.filter((r) => r.data === dia && (r.estado === 'feito' || (r.valor ?? 0) > 0 || (r.itens?.length ?? 0) > 0)).length
          const rh = registrosHumorDoDia(regHumor, dia)
          const corHumor = rh.length ? humorDe(humorTipos, Math.min(5, Math.max(1, Math.round(mediaNivel(rh)))) as NivelHumor)?.cor : undefined
          const prazos = tarefas.filter((t) => t.data === dia && t.horario && !t.concluidaEm).length
          const viagem = evs.some((e) => e.categoria === 'familia' || /viagem|trip/i.test(e.titulo))
          return (
            <button
              key={dia}
              onClick={() => onIrParaDia(dia)}
              className={`group/dia relative flex flex-col gap-1 border-b border-l border-line p-1.5 text-left transition-colors hover:bg-hover ${noMes ? '' : 'bg-surface/40'}`}
            >
              {carga > 0 && noMes && <span className="pointer-events-none absolute inset-0" style={{ backgroundColor: `color-mix(in srgb, var(--vida-accent) ${Math.round(carga * 14)}%, transparent)` }} />}
              <div className="relative flex items-center justify-between">
                <span className={`flex size-6 items-center justify-center rounded-full text-[12px] ${hoje ? 'bg-accent font-semibold text-white' : noMes ? 'text-ink' : 'text-muted/40'}`}>{Number(dia.slice(8))}</span>
                <span className="flex items-center gap-1">
                  {corHumor && <span className="size-2 rounded-full" style={{ backgroundColor: corHumor }} title="Humor" />}
                  {viagem && <span className="text-[10px]" title="Viagem">✈️</span>}
                </span>
              </div>
              <div className="relative flex flex-col gap-0.5 overflow-hidden">
                {evs.slice(0, 2).map((e) => (
                  <span
                    key={e.id}
                    onClick={(ev) => { ev.stopPropagation(); onAbrirEvento(e) }}
                    className="truncate rounded px-1 text-[10px] font-medium leading-4"
                    style={e.presenca === 'confirmado' ? { backgroundColor: `color-mix(in srgb, ${e.cor ?? '#4073ff'} 88%, transparent)`, color: '#fff' } : { border: `1px solid ${e.cor ?? '#4073ff'}`, color: e.cor ?? '#4073ff' }}
                    title={e.titulo}
                  >
                    <span className={e.presenca === 'recusado' ? 'line-through' : ''}>{e.diaInteiro ? '' : `${e.inicio} `}{e.titulo}</span>
                  </span>
                ))}
                {evs.length > 2 && <span className="px-1 text-[10px] text-muted">+{evs.length - 2}</span>}
              </div>
              {noMes && (habitosFeitos > 0 || prazos > 0) && (
                <div className="relative mt-auto flex items-center gap-2 text-[9.5px] text-muted">
                  {habitosFeitos > 0 && <span title="Hábitos concluídos">🔥 {habitosFeitos}</span>}
                  {prazos > 0 && <span className="text-danger/80" title="Prazos">⚑ {prazos}</span>}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
