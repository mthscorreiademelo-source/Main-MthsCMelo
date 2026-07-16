import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/db'
import type { Evento } from './types'

export function useEventos(): Evento[] | undefined {
  return useLiveQuery(() => db.eventos.toArray(), [])
}
