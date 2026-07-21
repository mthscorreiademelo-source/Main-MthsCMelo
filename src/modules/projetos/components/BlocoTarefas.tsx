import { useMemo, useState } from 'react'
import { QuickAdd } from '../../tarefas/components/QuickAdd'
import { TaskList } from '../../tarefas/components/TaskList'
import { TaskEditorSheet } from '../../tarefas/components/TaskEditorSheet'
import { useProjetos, useTarefas } from '../../tarefas/hooks'
import type { Task } from '../../tarefas/types'

/** Bloco Tarefas — integrado: mesmas tarefas da aba Tarefas, filtradas pelo projeto. */
export function BlocoTarefas({ projetoId }: { projetoId: string }) {
  const tarefas = useTarefas()
  const projetos = useProjetos() ?? []
  const [sel, setSel] = useState<Task | null>(null)

  const doProjeto = useMemo(
    () => (tarefas ?? []).filter((t) => t.projetoId === projetoId && !t.paiId),
    [tarefas, projetoId],
  )
  const selAtual = sel ? (tarefas ?? []).find((t) => t.id === sel.id) ?? null : null

  return (
    <div className="flex flex-col gap-2">
      <QuickAdd projetos={projetos} projetoPadrao={projetoId} placeholder="Adicionar tarefa ao projeto…" />
      <TaskList
        tarefas={doProjeto}
        todas={tarefas ?? []}
        projetos={projetos}
        onAbrir={setSel}
        vazio={<p className="py-2 text-[13px] text-muted">Nenhuma tarefa ainda. Toda tarefa criada aqui aparece também na aba Tarefas.</p>}
      />
      <TaskEditorSheet task={selAtual} projetos={projetos} todas={tarefas ?? []} onFechar={() => setSel(null)} />
    </div>
  )
}
