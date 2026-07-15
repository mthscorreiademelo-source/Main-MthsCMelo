import { useMemo, useState } from 'react'
import { EmptyState } from '../../core/components/EmptyState'
import { IconSol } from '../../core/components/Icons'
import { hojeISO } from '../../core/dates'
import { QuickAdd } from './components/QuickAdd'
import { TaskEditorSheet } from './components/TaskEditorSheet'
import { TaskList } from './components/TaskList'
import { concluidasHoje, filtrarHoje } from './db'
import { useTarefas } from './hooks'
import type { Task } from './types'

/** Contribuição das Tarefas para o dashboard Hoje. */
export function SecaoHoje() {
  const tarefas = useTarefas()
  const [selecionada, setSelecionada] = useState<Task | null>(null)

  const { pendentes, concluidas } = useMemo(() => {
    const todas = tarefas ?? []
    return { pendentes: filtrarHoje(todas), concluidas: concluidasHoje(todas) }
  }, [tarefas])

  return (
    <div className="flex flex-col gap-4">
      <QuickAdd dataPadrao={hojeISO()} placeholder="Adicionar tarefa para hoje…" />

      {tarefas && (
        <TaskList
          tarefas={pendentes}
          onAbrir={setSelecionada}
          ocultarData
          vazio={
            <EmptyState
              icone={<IconSol />}
              titulo="Dia livre"
              descricao="Nenhuma tarefa pendente para hoje."
            />
          }
        />
      )}

      {concluidas.length > 0 && (
        <section className="border-t border-line pt-3">
          <h2 className="mb-1 px-1 text-[13px] font-medium text-muted">
            Concluídas hoje · {concluidas.length}
          </h2>
          <TaskList tarefas={concluidas} onAbrir={setSelecionada} ocultarData vazio={null} />
        </section>
      )}

      <TaskEditorSheet task={selecionada} onFechar={() => setSelecionada(null)} />
    </div>
  )
}
