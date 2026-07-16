import { useEffect, useMemo, useState } from 'react'
import { addDays, addMonths, addYears, format, parseISO, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { IconMais, IconSetaEsquerda } from '../../core/components/Icons'
import { hojeISO, rotuloMes } from '../../core/dates'
import { TaskEditorSheet } from '../tarefas/components/TaskEditorSheet'
import { useProjetos, useTarefas } from '../tarefas/hooks'
import type { Task } from '../tarefas/types'
import { EditorEvento } from './components/EditorEvento'
import { GradeTempo } from './components/GradeTempo'
import { VistaDia } from './components/VistaDia'
import { VistaMes } from './components/VistaMes'
import { VistaMultiMes } from './components/VistaMultiMes'
import { criarEvento, paraHHMM } from './db'
import { useEventos } from './hooks'
import type { Evento } from './types'

type Modo = 'dia' | '3dias' | '4dias' | 'semana' | 'mes' | 'trimestre' | 'ano'

const OPCOES: { modo: Modo; rotulo: string }[] = [
  { modo: 'dia', rotulo: 'Dia' },
  { modo: '3dias', rotulo: '3 dias' },
  { modo: '4dias', rotulo: '4 dias' },
  { modo: 'semana', rotulo: 'Semana' },
  { modo: 'mes', rotulo: 'Mês' },
  { modo: 'trimestre', rotulo: 'Trimestre' },
  { modo: 'ano', rotulo: 'Ano' },
]

const N_DIAS: Partial<Record<Modo, number>> = { dia: 1, '3dias': 3, '4dias': 4, semana: 7 }

export function AgendaPage() {
  const eventos = useEventos()
  const tarefas = useTarefas()
  const projetos = useProjetos()
  const [modo, setModo] = useState<Modo>('3dias')
  const [ancora, setAncora] = useState(hojeISO())
  const [editorEvento, setEditorEvento] = useState<Evento | null>(null)
  const [editorTarefa, setEditorTarefa] = useState<Task | null>(null)
  const [abrirId, setAbrirId] = useState<string | null>(null)

  const evs = useMemo(() => eventos ?? [], [eventos])
  const tks = useMemo(() => tarefas ?? [], [tarefas])
  const ps = projetos ?? []

  const dias = useMemo(() => {
    const n = N_DIAS[modo]
    if (!n) return []
    const inicio = modo === 'semana' ? startOfWeek(parseISO(ancora), { weekStartsOn: 0 }) : parseISO(ancora)
    return Array.from({ length: n }, (_, i) => format(addDays(inicio, i), 'yyyy-MM-dd'))
  }, [ancora, modo])

  const meses = useMemo(() => {
    if (modo === 'trimestre') {
      const base = parseISO(`${ancora.slice(0, 7)}-01`)
      return [0, 1, 2].map((i) => format(addMonths(base, i), 'yyyy-MM'))
    }
    if (modo === 'ano') {
      const ano = ancora.slice(0, 4)
      return Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, '0')}`)
    }
    return []
  }, [ancora, modo])

  useEffect(() => {
    if (!abrirId) return
    const e = evs.find((x) => x.id === abrirId)
    if (e) {
      setEditorEvento(e)
      setAbrirId(null)
    }
  }, [abrirId, evs])

  const eventoAtual = editorEvento ? evs.find((e) => e.id === editorEvento.id) ?? null : null
  const tarefaAtual = editorTarefa ? tks.find((t) => t.id === editorTarefa.id) ?? null : null

  function navegar(dir: number) {
    const d = parseISO(ancora)
    let novo = d
    if (modo === 'mes') novo = addMonths(d, dir)
    else if (modo === 'trimestre') novo = addMonths(d, dir * 3)
    else if (modo === 'ano') novo = addYears(d, dir)
    else novo = addDays(d, dir * (N_DIAS[modo] ?? 1))
    setAncora(format(novo, 'yyyy-MM-dd'))
  }

  async function aoCriar(data: string, ini: number, fim: number) {
    const id = await criarEvento({ titulo: '', data, inicio: paraHHMM(ini), fim: paraHHMM(fim) })
    setAbrirId(id)
  }

  function irParaDia(dia: string) {
    setAncora(dia)
    setModo('dia')
  }

  const rotulo = (() => {
    if (modo === 'mes') return rotuloMes(ancora.slice(0, 7))
    if (modo === 'ano') return ancora.slice(0, 4)
    if (modo === 'trimestre') {
      const a = parseISO(`${meses[0]}-01`)
      const b = parseISO(`${meses[2]}-01`)
      return `${format(a, 'MMM', { locale: ptBR })} – ${format(b, "MMM 'de' yyyy", { locale: ptBR })}`
    }
    const a = parseISO(dias[0])
    const b = parseISO(dias[dias.length - 1])
    if (modo === 'dia') return format(a, "d 'de' MMMM", { locale: ptBR })
    const mesmoMes = format(a, 'MM') === format(b, 'MM')
    return mesmoMes
      ? `${format(a, 'd')}–${format(b, "d 'de' MMM", { locale: ptBR })}`
      : `${format(a, 'd MMM', { locale: ptBR })} – ${format(b, 'd MMM', { locale: ptBR })}`
  })()

  const pronto = eventos && tarefas

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button onClick={() => navegar(-1)} aria-label="Anterior" className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink">
            <IconSetaEsquerda width={17} height={17} />
          </button>
          <button onClick={() => setAncora(hojeISO())} className="rounded-full bg-hover px-3 py-1.5 text-[13px] font-medium text-muted hover:text-ink">
            Hoje
          </button>
          <button onClick={() => navegar(1)} aria-label="Próximo" className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink">
            <IconSetaEsquerda width={17} height={17} className="rotate-180" />
          </button>
          <h1 className="ml-2 text-[16px] font-semibold capitalize">{rotulo}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex flex-wrap gap-1 rounded-full bg-hover p-0.5">
            {OPCOES.map((o) => (
              <button
                key={o.modo}
                onClick={() => setModo(o.modo)}
                className={`rounded-full px-2.5 py-1 text-[13px] font-medium transition-colors ${
                  modo === o.modo ? 'bg-ink text-surface' : 'text-muted hover:text-ink'
                }`}
              >
                {o.rotulo}
              </button>
            ))}
          </div>
          <button onClick={() => aoCriar(dias[0] ?? ancora, 9 * 60, 10 * 60)} className="flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[14px] font-medium text-surface">
            <IconMais width={16} height={16} /> Evento
          </button>
        </div>
      </div>

      {pronto && modo === 'dia' && (
        <VistaDia dia={ancora} eventos={evs} tarefas={tks} onAbrirEvento={setEditorEvento} onAbrirTarefa={setEditorTarefa} onCriar={aoCriar} />
      )}
      {pronto && (modo === '3dias' || modo === '4dias' || modo === 'semana') && (
        <GradeTempo dias={dias} eventos={evs} tarefas={tks} onAbrirEvento={setEditorEvento} onAbrirTarefa={setEditorTarefa} onCriar={aoCriar} />
      )}
      {pronto && modo === 'mes' && (
        <VistaMes mesRef={ancora.slice(0, 7)} eventos={evs} onAbrirEvento={setEditorEvento} onIrParaDia={irParaDia} />
      )}
      {pronto && (modo === 'trimestre' || modo === 'ano') && (
        <VistaMultiMes meses={meses} eventos={evs} onIrParaDia={irParaDia} />
      )}

      {eventoAtual && <EditorEvento evento={eventoAtual} onFechar={() => setEditorEvento(null)} />}
      <TaskEditorSheet task={tarefaAtual} projetos={ps} todas={tks} onFechar={() => setEditorTarefa(null)} />
    </div>
  )
}
