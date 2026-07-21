import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/db'
import type { Lugar } from './types'

export function useLugares(): Lugar[] | undefined {
  return useLiveQuery(() => db.lugares.orderBy('ordem').toArray(), [])
}
