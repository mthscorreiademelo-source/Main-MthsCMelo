import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/db'
import type { ItemProjeto, Projeto, Task } from '../tarefas/types'

export function useProjetosWS(): Projeto[] | undefined {
  return useLiveQuery(() => db.projetos.toArray())
}

export function useProjetoWS(id: string | undefined): Projeto | undefined {
  return useLiveQuery(async () => (id ? db.projetos.get(id) : undefined), [id])
}

export function useTarefasProjeto(projetoId: string | undefined): Task[] | undefined {
  return useLiveQuery(
    async () => (projetoId ? db.tasks.where('projetoId').equals(projetoId).toArray() : []),
    [projetoId],
  )
}

export function useItensProjeto(projetoId: string | undefined, modulo: string): ItemProjeto[] | undefined {
  return useLiveQuery(
    async () =>
      projetoId ? db.projetoItens.where({ projetoId, modulo }).toArray() : [],
    [projetoId, modulo],
  )
}
