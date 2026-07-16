import { useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  IconArrastar,
  IconCalendario,
  IconChevron,
  IconCheck,
  IconRelogio,
  IconRepetir,
} from '../../../core/components/Icons'
import { rotuloData } from '../../../core/dates'
import { alternarConclusao, contarSubtarefas, corPrioridade, estaAtrasada, subtarefas } from '../db'
import { MenuReagendar } from './MenuReagendar'
import type { Projeto, Task } from '../types'

interface Props {
  task: Task
  todas: Task[]
  projetos: Projeto[]
  onAbrir: (task: Task) => void
  /** Renderiza subtarefas aninhadas (visões Entrada/Projeto). */
  aninhar?: boolean
  nivel?: number
  ocultarData?: boolean
  /** Mostra o ponto/nome do projeto (visões mistas: Hoje/Próximas/Entrada). */
  mostrarProjeto?: boolean
  /** Quando definido, mostra a alça de arrastar (reordenar) na raiz. */
  aoIniciarArrasto?: (e: ReactPointerEvent, id: string) => void
}

/** Checkbox redondo colorido pela prioridade (estilo Todoist). */
function CheckPrioridade({ task }: { task: Task }) {
  const concluida = !!task.concluidaEm
  const cor = corPrioridade(task.prioridade)
  const fundo = task.prioridade < 4 ? `${cor}1a` : 'transparent'
  return (
    <button
      role="checkbox"
      aria-checked={concluida}
      aria-label={`Concluir ${task.titulo}`}
      onClick={(e) => {
        e.stopPropagation()
        alternarConclusao(task)
      }}
      className="flex size-9 shrink-0 items-center justify-center"
    >
      <span
        className={`flex size-[19px] items-center justify-center rounded-full border-[1.5px] transition-all ${concluida ? 'lume-pop' : ''}`}
        style={{
          borderColor: cor,
          backgroundColor: concluida ? cor : fundo,
          color: concluida ? '#fff' : cor,
        }}
      >
        <IconCheck
          width={12}
          height={12}
          strokeWidth={3}
          className={concluida ? 'opacity-100' : 'opacity-0'}
        />
      </span>
    </button>
  )
}

export function TaskItem({
  task,
  todas,
  projetos,
  onAbrir,
  aninhar,
  nivel = 0,
  ocultarData,
  mostrarProjeto,
  aoIniciarArrasto,
}: Props) {
  const concluida = !!task.concluidaEm
  const atrasada = estaAtrasada(task)
  const filhas = aninhar ? subtarefas(todas, task.id) : []
  const cont = contarSubtarefas(todas, task.id)
  const projeto = task.projetoId ? projetos.find((p) => p.id === task.projetoId) : undefined
  const [aberto, setAberto] = useState(true)
  const [reagendando, setReagendando] = useState(false)
  const arrastavel = !!aoIniciarArrasto && nivel === 0

  return (
    <li className="group/task" data-task-id={nivel === 0 ? task.id : undefined}>
      <div
        onClick={() => onAbrir(task)}
        className="flex cursor-pointer items-start rounded-lg pr-1 transition-colors hover:bg-hover"
        style={{ paddingLeft: nivel * 22 }}
      >
        {arrastavel && (
          <button
            onPointerDown={(e) => aoIniciarArrasto!(e, task.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label="Arrastar para reordenar"
            className="mt-1.5 flex size-6 shrink-0 cursor-grab touch-none items-center justify-center text-transparent transition-colors group-hover/task:text-muted/60 active:cursor-grabbing"
          >
            <IconArrastar width={14} height={14} />
          </button>
        )}
        {aninhar && filhas.length > 0 ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setAberto((v) => !v)
            }}
            aria-label={aberto ? 'Recolher subtarefas' : 'Expandir subtarefas'}
            className="mt-2 flex size-6 shrink-0 items-center justify-center rounded text-muted transition-colors hover:text-ink"
          >
            <IconChevron
              width={14}
              height={14}
              style={{ transform: aberto ? 'none' : 'rotate(-90deg)' }}
            />
          </button>
        ) : (
          aninhar && <span className="w-6 shrink-0" />
        )}

        <CheckPrioridade task={task} />

        <div className="min-w-0 flex-1 py-1.5">
          <p
            className={`text-[15px] leading-snug transition-colors ${
              concluida ? 'text-muted line-through' : ''
            }`}
          >
            {task.titulo}
          </p>
          {task.descricao && !concluida && (
            <p className="truncate text-[13px] text-muted">{task.descricao}</p>
          )}

          {!concluida && (
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-muted">
              {task.data && (!ocultarData || atrasada) && (
                <span className={`flex items-center gap-1 ${atrasada ? 'text-danger' : ''}`}>
                  <IconCalendario width={12} height={12} />
                  {rotuloData(task.data)}
                  {task.horario && ` ${task.horario}`}
                </span>
              )}
              {task.horario && (!task.data || ocultarData) && (
                <span className="flex items-center gap-1">
                  <IconRelogio width={12} height={12} />
                  {task.horario}
                </span>
              )}
              {task.recorrencia && <IconRepetir width={12} height={12} aria-label="Recorrente" />}
              {cont.total > 0 && (
                <span className="flex items-center gap-1">
                  <IconCheck width={12} height={12} />
                  {cont.feitas}/{cont.total}
                </span>
              )}
              {task.labels?.map((l) => (
                <span key={l} className="rounded bg-hover px-1.5 py-px text-[11px] text-muted">
                  {l}
                </span>
              ))}
              {mostrarProjeto && projeto && (
                <span className="flex items-center gap-1">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: projeto.cor ?? 'var(--vida-muted)' }}
                  />
                  {projeto.nome}
                </span>
              )}
            </div>
          )}
        </div>

        {!concluida && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setReagendando(true)
            }}
            aria-label="Reagendar"
            className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-transparent transition-colors group-hover/task:text-muted hover:!text-ink hover:bg-hover"
          >
            <IconCalendario width={15} height={15} />
          </button>
        )}
      </div>

      {reagendando && <MenuReagendar task={task} onFechar={() => setReagendando(false)} />}

      {aninhar && aberto && filhas.length > 0 && (
        <ul>
          {filhas.map((f) => (
            <TaskItem
              key={f.id}
              task={f}
              todas={todas}
              projetos={projetos}
              onAbrir={onAbrir}
              aninhar
              nivel={nivel + 1}
              ocultarData={ocultarData}
              mostrarProjeto={false}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
