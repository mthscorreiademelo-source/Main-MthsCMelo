import { useMemo, useState } from 'react'
import { EmptyState } from '../../core/components/EmptyState'
import { IconSol } from '../../core/components/Icons'
import { dataPorExtenso, hojeISO, saudacao } from '../../core/dates'
import { QuickAdd } from '../tarefas/components/QuickAdd'
import { TaskEditorSheet } from '../tarefas/components/TaskEditorSheet'
import { TaskList } from '../tarefas/components/TaskList'
import { concluidasHoje, filtrarHoje } from '../tarefas/db'
import { useTarefas } from '../tarefas/hooks'
import type { Task } from '../tarefas/types'

export function HojePage() {
  const tarefas = useTarefas()
  const [selecionada, setSelecionada] = useState<Task | null>(null)

  const { pendentes, concluidas } = useMemo(() => {
    const todas = tarefas ?? []
    return {
      pendentes: filtrarHoje(todas),
      concluidas: concluidasHoje(todas),
    }
  }, [tarefas])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">{saudacao()}</h1>
        <p className="mt-1 text-sm text-muted">{dataPorExtenso()}</p>
      </header>

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
        <section className="border-t border-line pt-4">
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
