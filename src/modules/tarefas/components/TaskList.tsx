import type { ReactNode } from 'react'
import type { Task } from '../types'
import { TaskItem } from './TaskItem'

interface Props {
  tarefas: Task[]
  onAbrir: (task: Task) => void
  ocultarData?: boolean
  vazio: ReactNode
}

export function TaskList({ tarefas, onAbrir, ocultarData, vazio }: Props) {
  if (tarefas.length === 0) return <>{vazio}</>
  return (
    <ul className="flex flex-col">
      {tarefas.map((t) => (
        <TaskItem key={t.id} task={t} onAbrir={onAbrir} ocultarData={ocultarData} />
      ))}
    </ul>
  )
}
