import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/db'
import type { CategoriaHabito, Habito, HabitoRegistro } from './types'

export function useHabitos(): Habito[] | undefined {
  return useLiveQuery(() => db.habitos.toArray(), [])
}

export function useRegistros(): HabitoRegistro[] | undefined {
  return useLiveQuery(() => db.habitoRegistros.toArray(), [])
}

export function useCategoriasHabito(): CategoriaHabito[] | undefined {
  return useLiveQuery(() => db.categoriasHabito.toArray(), [])
}

export function useHabito(id: string | undefined): Habito | undefined {
  return useLiveQuery(() => (id ? db.habitos.get(id) : undefined), [id])
}
