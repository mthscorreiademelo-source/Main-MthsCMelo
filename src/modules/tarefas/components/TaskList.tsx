import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { reordenar } from '../db'
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
  /** Habilita reordenar arrastando (visões de ordem manual). */
  arrastavel?: boolean
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
  arrastavel,
  vazio,
}: Props) {
  // Ordem local durante o arrasto (null = usa a ordem vinda das props).
  const [ordem, setOrdem] = useState<string[] | null>(null)
  const arrastandoId = useRef<string | null>(null)
  const ordemRef = useRef<string[]>([])

  const idsBase = tarefas.map((t) => t.id)
  // Enquanto não arrasta, reflete a ordem das props.
  useEffect(() => {
    if (!arrastandoId.current) setOrdem(null)
  }, [idsBase.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  if (tarefas.length === 0) return <>{vazio}</>

  const ids = ordem ?? idsBase
  ordemRef.current = ids
  const porId = new Map(tarefas.map((t) => [t.id, t]))
  const lista = ids.map((id) => porId.get(id)).filter((t): t is Task => !!t)

  function iniciarArrasto(e: ReactPointerEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    arrastandoId.current = id
    setOrdem(ordemRef.current)

    const mover = (ev: PointerEvent) => {
      const alvo = (document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null)
        ?.closest('[data-task-id]')
        ?.getAttribute('data-task-id')
      const atual = arrastandoId.current
      if (!alvo || !atual || alvo === atual) return
      setOrdem((prev) => {
        const cur = prev ?? ordemRef.current
        const from = cur.indexOf(atual)
        const to = cur.indexOf(alvo)
        if (from < 0 || to < 0) return cur
        const novo = [...cur]
        novo.splice(from, 1)
        novo.splice(to, 0, atual)
        ordemRef.current = novo
        return novo
      })
    }
    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      const final = ordemRef.current
      arrastandoId.current = null
      void reordenar(final)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  return (
    <ul className="flex flex-col divide-y divide-line/50">
      {lista.map((t) => (
        <TaskItem
          key={t.id}
          task={t}
          todas={todas}
          projetos={projetos}
          onAbrir={onAbrir}
          aninhar={aninhar}
          ocultarData={ocultarData}
          mostrarProjeto={mostrarProjeto}
          aoIniciarArrasto={arrastavel ? iniciarArrasto : undefined}
        />
      ))}
    </ul>
  )
}
