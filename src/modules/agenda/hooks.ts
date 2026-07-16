import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/db'
import type { Cronograma, Evento } from './types'

export function useEventos(): Evento[] | undefined {
  return useLiveQuery(() => db.eventos.toArray(), [])
}

export function useCronogramas(): Cronograma[] | undefined {
  return useLiveQuery(async () => (await db.cronogramas.toArray()).sort((a, b) => a.ordem - b.ordem), [])
}
