import { Checkbox } from '../../../core/components/Checkbox'
import { IconCalendario } from '../../../core/components/Icons'
import { rotuloData } from '../../../core/dates'
import { alternarConclusao, estaAtrasada } from '../db'
import type { Task } from '../types'

interface Props {
  task: Task
  onAbrir: (task: Task) => void
  /** Oculta o chip de data (útil na visão "Hoje", onde a data é óbvia). */
  ocultarData?: boolean
}

export function TaskItem({ task, onAbrir, ocultarData }: Props) {
  const concluida = !!task.concluidaEm
  const atrasada = estaAtrasada(task)

  return (
    <li className="group">
      <div
        onClick={() => onAbrir(task)}
        className="flex min-h-12 cursor-pointer items-center gap-1 rounded-lg px-1 transition-colors hover:bg-hover"
      >
        <Checkbox
          marcado={concluida}
          onChange={() => alternarConclusao(task)}
          rotulo={`Concluir ${task.titulo}`}
        />
        <div className="min-w-0 flex-1 py-2.5">
          <p
            className={`truncate text-[15px] leading-snug transition-colors ${
              concluida ? 'text-muted line-through' : ''
            }`}
          >
            {task.titulo}
          </p>
          {task.nota && (
            <p className="truncate text-[13px] text-muted">{task.nota}</p>
          )}
        </div>
        {task.data && !ocultarData && !concluida && (
          <span
            className={`mr-2 flex shrink-0 items-center gap-1 text-[13px] ${
              atrasada ? 'text-danger' : 'text-muted'
            }`}
          >
            <IconCalendario width={14} height={14} />
            {rotuloData(task.data)}
          </span>
        )}
        {atrasada && ocultarData && (
          <span className="mr-2 shrink-0 text-[13px] text-danger">
            {rotuloData(task.data!)}
          </span>
        )}
      </div>
    </li>
  )
}
