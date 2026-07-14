import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/db'
import type { Task } from './types'

/**
 * Todas as tarefas, reativas ao banco (qualquer escrita atualiza a UI).
 * Em escala pessoal isso é barato; filtros são derivados em memória.
 */
export function useTarefas(): Task[] | undefined {
  return useLiveQuery(() => db.tasks.toArray(), [])
}
