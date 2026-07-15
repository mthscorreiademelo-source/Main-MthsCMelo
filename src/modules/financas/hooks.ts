import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/db'
import type { Movimento } from './types'

export function useMovimentos(): Movimento[] | undefined {
  return useLiveQuery(() => db.movimentos.toArray(), [])
}
