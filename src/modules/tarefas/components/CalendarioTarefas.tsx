import { useMemo, useState } from 'react'
import { addMonths, format, isSameMonth, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { EmptyState } from '../../../core/components/EmptyState'
import { IconCalendario, IconSetaEsquerda } from '../../../core/components/Icons'
import { DIAS_SEMANA, hojeISO, rotuloData, rotuloMes } from '../../../core/dates'
import { corPrioridade, estaPendente, ordenar } from '../db'
import type { Projeto, Task } from '../types'
import { TaskList } from './TaskList'

export function CalendarioTarefas({
  tarefas,
  todas,
  projetos,
  onAbrir,
}: {
  tarefas: Task[]
  todas: Task[]
  projetos: Projeto[]
  onAbrir: (t: Task) => void
}) {
  const hoje = hojeISO()
  const [mesRef, setMesRef] = useState(hoje.slice(0, 7)) // yyyy-MM
  const [selecionado, setSelecionado] = useState(hoje)

  // Mapa data → tarefas pendentes daquele dia.
  const porDia = useMemo(() => {
    const m = new Map<string, Task[]>()
    for (const t of tarefas) {
      if (!estaPendente(t) || !t.data) continue
      const arr = m.get(t.data) ?? []
      arr.push(t)
      m.set(t.data, arr)
    }
    return m
  }, [tarefas])

  const celulas = useMemo(() => {
    const ini = startOfWeek(startOfMonth(parseISO(`${mesRef}-01`)), { weekStartsOn: 0 })
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(ini)
      d.setDate(ini.getDate() + i)
      return format(d, 'yyyy-MM-dd')
    })
  }, [mesRef])

  const mesDate = parseISO(`${mesRef}-01`)
  const doDia = ordenar(porDia.get(selecionado) ?? [])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setMesRef(format(addMonths(mesDate, -1), 'yyyy-MM'))}
          className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink"
          aria-label="Mês anterior"
        >
          <IconSetaEsquerda width={17} height={17} />
        </button>
        <h2 className="text-[15px] font-semibold">{rotuloMes(mesRef)}</h2>
        <button
          onClick={() => setMesRef(format(addMonths(mesDate, 1), 'yyyy-MM'))}
          className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink"
          aria-label="Próximo mês"
        >
          <IconSetaEsquerda width={17} height={17} className="rotate-180" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} className="pb-1 text-center text-[11px] font-medium text-muted">
            {d}
          </div>
        ))}
        {celulas.map((dia) => {
          const noMes = isSameMonth(parseISO(dia), mesDate)
          const tks = porDia.get(dia) ?? []
          const ehHoje = dia === hoje
          const sel = dia === selecionado
          const cores = [...new Set(tks.map((t) => corPrioridade(t.prioridade)))].slice(0, 4)
          return (
            <button
              key={dia}
              onClick={() => setSelecionado(dia)}
              className={`flex aspect-square flex-col items-center justify-start gap-1 rounded-lg py-1.5 text-[13px] transition-colors ${
                sel ? 'bg-ink text-surface' : noMes ? 'hover:bg-hover' : 'text-muted/40'
              }`}
            >
              <span
                className={`flex size-6 items-center justify-center rounded-full ${
                  ehHoje && !sel ? 'bg-accent text-white' : ''
                } ${!noMes ? 'opacity-60' : ''}`}
              >
                {Number(dia.slice(8))}
              </span>
              <span className="flex h-1.5 items-center gap-0.5">
                {cores.map((c) => (
                  <span key={c} className="size-1.5 rounded-full" style={{ backgroundColor: sel ? '#fff' : c }} />
                ))}
              </span>
            </button>
          )
        })}
      </div>

      <section className="flex flex-col gap-1 border-t border-line pt-3">
        <h3 className="px-1 text-[13px] font-semibold text-muted">{rotuloData(selecionado)}</h3>
        <TaskList
          tarefas={doDia}
          todas={todas}
          projetos={projetos}
          onAbrir={onAbrir}
          ocultarData
          mostrarProjeto
          vazio={
            <EmptyState
              icone={<IconCalendario />}
              titulo="Nada neste dia"
              descricao="Toque numa tarefa e reagende, ou adicione com esta data."
            />
          }
        />
      </section>
    </div>
  )
}
