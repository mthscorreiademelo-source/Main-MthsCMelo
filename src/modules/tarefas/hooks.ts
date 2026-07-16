import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/db'
import type { Projeto, Task } from './types'

/**
 * Todas as tarefas, reativas ao banco (qualquer escrita atualiza a UI).
 * Em escala pessoal isso é barato; filtros/visões são derivados em memória.
 */
export function useTarefas(): Task[] | undefined {
  return useLiveQuery(() => db.tasks.toArray(), [])
}

export function useProjetos(): Projeto[] | undefined {
  return useLiveQuery(async () => {
    const ps = await db.projetos.toArray()
    return ps.filter((p) => !p.arquivado).sort((a, b) => a.ordem - b.ordem)
  }, [])
}
