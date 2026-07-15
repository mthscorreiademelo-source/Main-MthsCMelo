import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/db'
import type { HumorRegistro } from './types'

export function useHumores(): HumorRegistro[] | undefined {
  return useLiveQuery(() => db.humores.toArray(), [])
}

/** Mapa data → registro, para consulta O(1) no calendário. */
export function mapaPorData(regs: HumorRegistro[]): Map<string, HumorRegistro> {
  const m = new Map<string, HumorRegistro>()
  for (const r of regs) m.set(r.data, r)
  return m
}
