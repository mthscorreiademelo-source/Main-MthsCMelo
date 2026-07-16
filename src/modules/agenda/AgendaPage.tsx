import { useEffect, useMemo, useState } from 'react'
import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { IconMais, IconSetaEsquerda } from '../../core/components/Icons'
import { hojeISO } from '../../core/dates'
import { TaskEditorSheet } from '../tarefas/components/TaskEditorSheet'
import { useProjetos, useTarefas } from '../tarefas/hooks'
import type { Task } from '../tarefas/types'
import { EditorEvento } from './components/EditorEvento'
import { GradeTempo } from './components/GradeTempo'
import { criarEvento, paraHHMM } from './db'
import { useEventos } from './hooks'
import type { Evento } from './types'

const OPCOES = [
  { n: 1, rotulo: 'Dia' },
  { n: 3, rotulo: '3 dias' },
  { n: 4, rotulo: '4 dias' },
  { n: 7, rotulo: 'Semana' },
]

export function AgendaPage() {
  const eventos = useEventos()
  const tarefas = useTarefas()
  const projetos = useProjetos()
  const [nDias, setNDias] = useState(3)
  const [ancora, setAncora] = useState(hojeISO())
  const [editorEvento, setEditorEvento] = useState<Evento | null>(null)
  const [editorTarefa, setEditorTarefa] = useState<Task | null>(null)
  const [abrirId, setAbrirId] = useState<string | null>(null)

  const evs = useMemo(() => eventos ?? [], [eventos])
  const tks = useMemo(() => tarefas ?? [], [tarefas])
  const ps = projetos ?? []

  const dias = useMemo(() => {
    const inicio = nDias === 7 ? startOfWeek(parseISO(ancora), { weekStartsOn: 0 }) : parseISO(ancora)
    return Array.from({ length: nDias }, (_, i) => format(addDays(inicio, i), 'yyyy-MM-dd'))
  }, [ancora, nDias])

  // Abre o editor de um evento recém-criado quando ele aparece na lista.
  useEffect(() => {
    if (!abrirId) return
    const e = evs.find((x) => x.id === abrirId)
    if (e) {
      setEditorEvento(e)
      setAbrirId(null)
    }
  }, [abrirId, evs])

  // Mantém o editor de evento em sincronia com o dado (após mover/redimensionar).
  const eventoAtual = editorEvento ? evs.find((e) => e.id === editorEvento.id) ?? null : null
  const tarefaAtual = editorTarefa ? tks.find((t) => t.id === editorTarefa.id) ?? null : null

  function navegar(delta: number) {
    setAncora(format(addDays(parseISO(ancora), delta * nDias), 'yyyy-MM-dd'))
  }

  async function aoCriar(data: string, ini: number, fim: number) {
    const id = await criarEvento({ titulo: '', data, inicio: paraHHMM(ini), fim: paraHHMM(fim) })
    setAbrirId(id)
  }

  const rotuloIntervalo = (() => {
    const a = parseISO(dias[0])
    const b = parseISO(dias[dias.length - 1])
    if (nDias === 1) return format(a, "d 'de' MMMM", { locale: ptBR })
    const mesmoMes = format(a, 'MM') === format(b, 'MM')
    return mesmoMes
      ? `${format(a, 'd')}–${format(b, "d 'de' MMM", { locale: ptBR })}`
      : `${format(a, 'd MMM', { locale: ptBR })} – ${format(b, 'd MMM', { locale: ptBR })}`
  })()

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => navegar(-1)}
            aria-label="Anterior"
            className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink"
          >
            <IconSetaEsquerda width={17} height={17} />
          </button>
          <button
            onClick={() => setAncora(hojeISO())}
            className="rounded-full bg-hover px-3 py-1.5 text-[13px] font-medium text-muted hover:text-ink"
          >
            Hoje
          </button>
          <button
            onClick={() => navegar(1)}
            aria-label="Próximo"
            className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink"
          >
            <IconSetaEsquerda width={17} height={17} className="rotate-180" />
          </button>
          <h1 className="ml-2 text-[16px] font-semibold capitalize">{rotuloIntervalo}</h1>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex gap-1 rounded-full bg-hover p-0.5">
            {OPCOES.map((o) => (
              <button
                key={o.n}
                onClick={() => setNDias(o.n)}
                className={`rounded-full px-2.5 py-1 text-[13px] font-medium transition-colors ${
                  nDias === o.n ? 'bg-ink text-surface' : 'text-muted hover:text-ink'
                }`}
              >
                {o.rotulo}
              </button>
            ))}
          </div>
          <button
            onClick={() => aoCriar(dias[0], 9 * 60, 10 * 60)}
            className="flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[14px] font-medium text-surface"
          >
            <IconMais width={16} height={16} /> Evento
          </button>
        </div>
      </div>

      {eventos && tarefas && (
        <GradeTempo
          dias={dias}
          eventos={evs}
          tarefas={tks}
          onAbrirEvento={setEditorEvento}
          onAbrirTarefa={setEditorTarefa}
          onCriar={aoCriar}
        />
      )}

      {eventoAtual && <EditorEvento evento={eventoAtual} onFechar={() => setEditorEvento(null)} />}
      <TaskEditorSheet
        task={tarefaAtual}
        projetos={ps}
        todas={tks}
        onFechar={() => setEditorTarefa(null)}
      />
    </div>
  )
}
