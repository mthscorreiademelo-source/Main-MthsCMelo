import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays, addMonths, addYears, endOfMonth, format, parseISO, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { IconMais, IconRegua, IconSetaEsquerda } from '../../core/components/Icons'
import { hojeISO, rotuloMes } from '../../core/dates'
import { TaskEditorSheet } from '../tarefas/components/TaskEditorSheet'
import { useProjetos, useTarefas } from '../tarefas/hooks'
import type { Task } from '../tarefas/types'
import { EditorEvento } from './components/EditorEvento'
import { GanttCronogramas } from './components/GanttCronogramas'
import { GerenciarContextos } from './components/GerenciarContextos'
import { GerenciarCronogramas } from './components/GerenciarCronogramas'
import { PlannerTresDias } from './components/PlannerTresDias'
import { VistaMes } from './components/VistaMes'
import { VistaMultiMes } from './components/VistaMultiMes'
import { criarEvento, excluirEvento, expandirEventos, paraHHMM, rotuloRecorrencia, semearContextosSePreciso } from './db'
import { useCronogramas, useEventos } from './hooks'
import type { Evento } from './types'

// Exposto para diagnóstico/teste da recorrência (inofensivo).
if (typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__lumeAgenda = { expandirEventos, rotuloRecorrencia }
}

type Modo = 'dia' | '3dias' | 'custom' | 'semana' | 'mes' | 'ano' | 'cronogramas'

const OPCOES: { modo: Modo; rotulo: string }[] = [
  { modo: 'dia', rotulo: 'Dia' },
  { modo: '3dias', rotulo: '3 dias' },
  { modo: 'custom', rotulo: 'Personalizado' },
  { modo: 'semana', rotulo: 'Semana' },
  { modo: 'mes', rotulo: 'Mês' },
  { modo: 'ano', rotulo: 'Ano' },
  { modo: 'cronogramas', rotulo: 'Cronogramas' },
]

const MODOS_GRADE: Modo[] = ['dia', '3dias', 'custom', 'semana']

export function AgendaPage() {
  const eventos = useEventos()
  const tarefas = useTarefas()
  const projetos = useProjetos()
  const cronogramas = useCronogramas()
  const [modo, setModo] = useState<Modo>('3dias')
  const [customN, setCustomN] = useState(5)
  const [ancora, setAncora] = useState(hojeISO())
  const [editorEvento, setEditorEvento] = useState<Evento | null>(null)
  const [editorTarefa, setEditorTarefa] = useState<Task | null>(null)
  const [gerCron, setGerCron] = useState(false)
  const [gerContextos, setGerContextos] = useState(false)
  const [abrirId, setAbrirId] = useState<string | null>(null)
  const recemCriado = useRef<string | null>(null)

  useEffect(() => {
    semearContextosSePreciso()
  }, [])

  /** Fecha o editor de evento; descarta o evento recém-criado se ficou sem
   *  nenhuma informação (nome padrão e nada preenchido). */
  function fecharEditorEvento() {
    const e = editorEvento && evs.find((x) => x.id === editorEvento.id)
    if (e && recemCriado.current === e.id) {
      const vazio =
        (!e.titulo || e.titulo === 'Novo evento') &&
        !e.local && !e.descricao && !(e.participantes?.length) &&
        !e.custoCentavos && !e.diaInteiro && !e.recorrencia && !e.cronogramaId
      if (vazio) excluirEvento(e.id)
    }
    recemCriado.current = null
    setEditorEvento(null)
  }

  const evs = useMemo(() => eventos ?? [], [eventos])
  const tks = useMemo(() => tarefas ?? [], [tarefas])
  const ps = projetos ?? []
  const crs = cronogramas ?? []

  const nDias =
    modo === 'dia' ? 1 : modo === '3dias' ? 3 : modo === 'custom' ? Math.min(14, Math.max(2, customN)) : modo === 'semana' ? 7 : 0

  const diasMes = useMemo(() => {
    if (modo !== 'cronogramas') return []
    const ini = startOfMonth(parseISO(ancora))
    const fim = endOfMonth(ini)
    const out: string[] = []
    for (let d = ini; d <= fim; d = addDays(d, 1)) out.push(format(d, 'yyyy-MM-dd'))
    return out
  }, [ancora, modo])

  const dias = useMemo(() => {
    if (!nDias) return []
    return Array.from({ length: nDias }, (_, i) => format(addDays(parseISO(ancora), i), 'yyyy-MM-dd'))
  }, [ancora, nDias])

  const meses = useMemo(() => {
    if (modo !== 'ano') return []
    const ano = ancora.slice(0, 4)
    return Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, '0')}`)
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
    if (modo === 'mes' || modo === 'cronogramas') novo = addMonths(d, dir)
    else if (modo === 'ano') novo = addYears(d, dir)
    else novo = addDays(d, dir) // grades: 1 dia de cada vez (fluido)
    setAncora(format(novo, 'yyyy-MM-dd'))
  }

  async function aoCriar(data: string, ini: number, fim: number) {
    const id = await criarEvento({ titulo: '', data, inicio: paraHHMM(ini), fim: paraHHMM(fim) })
    recemCriado.current = id
    setAbrirId(id)
  }

  function irParaDia(dia: string) {
    setAncora(dia)
    setModo('dia')
  }

  const rotulo = (() => {
    if (modo === 'mes' || modo === 'cronogramas') return rotuloMes(ancora.slice(0, 7))
    if (modo === 'ano') return ancora.slice(0, 4)
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
    <div className={`mx-auto flex w-full flex-col gap-3 ${MODOS_GRADE.includes(modo) ? 'max-w-6xl' : 'max-w-4xl'}`}>
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
          {modo === 'custom' && (
            <label className="flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[13px] text-muted">
              <input
                type="number"
                min={2}
                max={14}
                value={customN}
                onChange={(e) => setCustomN(Math.min(14, Math.max(2, Number(e.target.value) || 2)))}
                className="w-10 bg-transparent text-center text-ink outline-none"
                aria-label="Quantos dias"
              />
              dias
            </label>
          )}
          {MODOS_GRADE.includes(modo) && (
            <button onClick={() => setGerContextos(true)} title="Contextos de rotina" className="flex min-h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] font-medium text-muted hover:text-ink">
              <IconRegua width={15} height={15} /> Contextos
            </button>
          )}
          <button onClick={() => aoCriar(dias[0] ?? ancora, 9 * 60, 10 * 60)} className="flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[14px] font-medium text-surface">
            <IconMais width={16} height={16} /> Evento
          </button>
        </div>
      </div>

      {pronto && MODOS_GRADE.includes(modo) && (
        <PlannerTresDias
          dias={dias}
          eventos={evs}
          tarefas={tks}
          hoje={hojeISO()}
          onAbrirEvento={setEditorEvento}
          onAbrirTarefa={setEditorTarefa}
          onCriar={aoCriar}
          onIrSemana={() => setModo('semana')}
          onIrHoje={() => setAncora(hojeISO())}
          onAbrirContextos={() => setGerContextos(true)}
          mostrarPainel={modo === '3dias'}
        />
      )}
      {pronto && modo === 'mes' && (
        <VistaMes mesRef={ancora.slice(0, 7)} eventos={evs} onAbrirEvento={setEditorEvento} onIrParaDia={irParaDia} />
      )}
      {pronto && modo === 'ano' && <VistaMultiMes meses={meses} eventos={evs} onIrParaDia={irParaDia} />}
      {pronto && modo === 'cronogramas' && (
        <GanttCronogramas dias={diasMes} eventos={evs} cronogramas={crs} onAbrirEvento={setEditorEvento} onGerenciar={() => setGerCron(true)} />
      )}

      {eventoAtual && <EditorEvento evento={eventoAtual} cronogramas={crs} onFechar={fecharEditorEvento} />}
      <TaskEditorSheet task={tarefaAtual} projetos={ps} todas={tks} onFechar={() => setEditorTarefa(null)} />
      {gerCron && <GerenciarCronogramas cronogramas={crs} onFechar={() => setGerCron(false)} />}
      {gerContextos && <GerenciarContextos onFechar={() => setGerContextos(false)} />}
    </div>
  )
}
