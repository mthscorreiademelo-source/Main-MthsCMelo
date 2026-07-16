import { useMemo, useState } from 'react'
import { EmptyState } from '../../core/components/EmptyState'
import { IconSol } from '../../core/components/Icons'
import { hojeISO } from '../../core/dates'
import { QuickAdd } from './components/QuickAdd'
import { TaskEditorSheet } from './components/TaskEditorSheet'
import { TaskList } from './components/TaskList'
import { concluidasHoje, filtrarHoje } from './db'
import { useProjetos, useTarefas } from './hooks'
import type { Task } from './types'

/** Contribuição das Tarefas para o dashboard Hoje. */
export function SecaoHoje() {
  const tarefas = useTarefas()
  const projetos = useProjetos()
  const [selecionada, setSelecionada] = useState<Task | null>(null)

  const todas = useMemo(() => tarefas ?? [], [tarefas])
  const ps = projetos ?? []
  const { pendentes, concluidas } = useMemo(
    () => ({ pendentes: filtrarHoje(todas), concluidas: concluidasHoje(todas) }),
    [todas],
  )

  return (
    <div className="mb-4 flex break-inside-avoid flex-col gap-3">
      <h2 className="px-1 text-[13px] font-medium text-muted">Tarefas de hoje</h2>
      <QuickAdd projetos={ps} dataPadrao={hojeISO()} placeholder="Adicionar tarefa para hoje…" />

      {tarefas && (
        <TaskList
          tarefas={pendentes}
          todas={todas}
          projetos={ps}
          onAbrir={setSelecionada}
          ocultarData
          mostrarProjeto
          vazio={
            <EmptyState icone={<IconSol />} titulo="Dia livre" descricao="Nenhuma tarefa pendente para hoje." />
          }
        />
      )}

      {concluidas.length > 0 && (
        <section className="border-t border-line pt-3">
          <h2 className="mb-1 px-1 text-[13px] font-medium text-muted">Concluídas hoje · {concluidas.length}</h2>
          <TaskList tarefas={concluidas} todas={todas} projetos={ps} onAbrir={setSelecionada} ocultarData vazio={null} />
        </section>
      )}

      <TaskEditorSheet task={selecionada} projetos={ps} todas={todas} onFechar={() => setSelecionada(null)} />
    </div>
  )
}
