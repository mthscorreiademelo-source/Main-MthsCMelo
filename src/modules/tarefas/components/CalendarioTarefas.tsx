import { useMemo, useState } from 'react'
import { addMonths, format, isSameMonth, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { EmptyState } from '../../../core/components/EmptyState'
import { IconCalendario, IconSetaEsquerda } from '../../../core/components/Icons'
import { DIAS_SEMANA, hojeISO, rotuloData, rotuloMes } from '../../../core/dates'
import type { Contexto } from '../../agenda/types'
import { concluidasNoDia, corPrioridade, diaEfetivo, estaPendente, filtrarHoje, ordenar } from '../db'
import type { Projeto, Task } from '../types'
import { TaskList } from './TaskList'

interface Props {
  tarefas: Task[]
  todas: Task[]
  projetos: Projeto[]
  /** Contextos reais da Agenda (exibidos nas tarefas da lista). */
  contextos?: Contexto[]
  /** Ids de tarefas sem horário possível dentro do prazo/contexto (Item 9) — mostra um aviso. */
  semHorarioIds?: Set<string>
  onAbrir: (t: Task) => void
  /** Dia selecionado (ISO), controlado pela página — afeta o padrão de "Nova tarefa". */
  selecionado: string
  onSelecionar: (dia: string) => void
}

export function CalendarioTarefas({ tarefas, todas, projetos, contextos, semHorarioIds, onAbrir, selecionado, onSelecionar }: Props) {
  const hoje = hojeISO()
  const [mesRef, setMesRef] = useState(selecionado.slice(0, 7)) // yyyy-MM

  // Mapa prazo (`data`) → tarefas pendentes daquele dia (base das bolinhas de prioridade).
  const pendentesPorPrazo = useMemo(() => {
    const m = new Map<string, Task[]>()
    for (const t of tarefas) {
      if (!estaPendente(t) || !t.data) continue
      const arr = m.get(t.data) ?? []
      arr.push(t)
      m.set(t.data, arr)
    }
    return m
  }, [tarefas])

  // Mapa prazo (`data`) → TODAS as tarefas com aquele prazo (pendentes ou não),
  // para o sinal de "dia limpo" (tudo que tinha prazo ali foi concluído).
  const todasPorPrazo = useMemo(() => {
    const m = new Map<string, Task[]>()
    for (const t of tarefas) {
      if (!t.data) continue
      const arr = m.get(t.data) ?? []
      arr.push(t)
      m.set(t.data, arr)
    }
    return m
  }, [tarefas])

  // Mapa dia efetivo (bloco planejado, senão prazo) → tarefas pendentes "programadas" pra aquele dia.
  const programadasPorDia = useMemo(() => {
    const m = new Map<string, Task[]>()
    for (const t of tarefas) {
      if (!estaPendente(t)) continue
      const dia = diaEfetivo(t)
      if (!dia) continue
      const arr = m.get(dia) ?? []
      arr.push(t)
      m.set(dia, arr)
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

  /** Passado = tudo que já concluiu; Hoje = pendentes de hoje + concluídas de hoje; Futuro = programadas (bloco, senão prazo). */
  const tipoDia: 'passado' | 'hoje' | 'futuro' =
    selecionado < hoje ? 'passado' : selecionado === hoje ? 'hoje' : 'futuro'

  const doDia = useMemo(() => {
    if (tipoDia === 'passado') return concluidasNoDia(tarefas, selecionado)
    if (tipoDia === 'hoje') return [...filtrarHoje(tarefas), ...concluidasNoDia(tarefas, hoje)]
    return ordenar(programadasPorDia.get(selecionado) ?? [])
  }, [tipoDia, tarefas, selecionado, hoje, programadasPorDia])

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
          const pendentesPrazo = pendentesPorPrazo.get(dia) ?? []
          const ehHoje = dia === hoje
          const sel = dia === selecionado
          const cores = [...new Set(pendentesPrazo.map((t) => corPrioridade(t.prioridade)))].slice(0, 4)
          const comPrazo = todasPorPrazo.get(dia) ?? []
          const diaLimpo = comPrazo.length > 0 && comPrazo.every((t) => !!t.concluidaEm)
          return (
            <button
              key={dia}
              onClick={() => onSelecionar(dia)}
              className={`relative flex aspect-square flex-col items-center justify-start gap-1 rounded-lg py-1.5 text-[13px] transition-colors ${
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
              {diaLimpo && (
                <span
                  className="absolute right-1 top-0.5 text-[9px] font-bold leading-none"
                  style={{ color: sel ? '#fff' : '#299438' }}
                  title="Tudo que tinha prazo neste dia foi concluído"
                >
                  ✓
                </span>
              )}
            </button>
          )
        })}
      </div>

      <section className="flex flex-col gap-1 border-t border-line pt-3">
        <h3 className="px-1 text-[13px] font-semibold text-muted">
          {rotuloData(selecionado)}
          {tipoDia === 'passado' && <span className="ml-1.5 font-normal text-muted/70">· concluídas</span>}
        </h3>
        <TaskList
          tarefas={doDia}
          todas={todas}
          projetos={projetos}
          contextos={contextos}
          semHorarioIds={semHorarioIds}
          onAbrir={onAbrir}
          ocultarData
          mostrarProjeto
          vazio={
            <EmptyState
              icone={<IconCalendario />}
              titulo="Nada neste dia"
              descricao={
                tipoDia === 'passado'
                  ? 'Nenhuma tarefa concluída neste dia.'
                  : 'Toque numa tarefa e reagende, ou adicione com esta data.'
              }
            />
          }
        />
      </section>
    </div>
  )
}
