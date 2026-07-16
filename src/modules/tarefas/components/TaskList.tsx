import type { ReactNode } from 'react'
import type { Projeto, Task } from '../types'
import { TaskItem } from './TaskItem'

interface Props {
  /** Tarefas a exibir (raízes, nas visões aninhadas). */
  tarefas: Task[]
  /** Todas as tarefas (para achar subtarefas e contagens). */
  todas: Task[]
  projetos: Projeto[]
  onAbrir: (task: Task) => void
  aninhar?: boolean
  ocultarData?: boolean
  mostrarProjeto?: boolean
  vazio: ReactNode
}

export function TaskList({
  tarefas,
  todas,
  projetos,
  onAbrir,
  aninhar,
  ocultarData,
  mostrarProjeto,
  vazio,
}: Props) {
  if (tarefas.length === 0) return <>{vazio}</>
  return (
    <ul className="flex flex-col divide-y divide-line/50">
      {tarefas.map((t) => (
        <TaskItem
          key={t.id}
          task={t}
          todas={todas}
          projetos={projetos}
          onAbrir={onAbrir}
          aninhar={aninhar}
          ocultarData={ocultarData}
          mostrarProjeto={mostrarProjeto}
        />
      ))}
    </ul>
  )
}
