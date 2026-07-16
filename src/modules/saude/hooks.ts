import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/db'
import type { SaudeDia } from './types'

export function useSaude(): SaudeDia[] | undefined {
  return useLiveQuery(() => db.saude.toArray(), [])
}

export function useSaudeDia(data: string): SaudeDia | undefined {
  return useLiveQuery(() => db.saude.get(data), [data])
}
