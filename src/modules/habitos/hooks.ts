import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/db'
import type { Habito, HabitoRegistro } from './types'

export function useHabitos(): Habito[] | undefined {
  return useLiveQuery(() => db.habitos.toArray(), [])
}

/** Todos os registros; em escala pessoal é barato e mantém a UI 100% reativa. */
export function useRegistros(): HabitoRegistro[] | undefined {
  return useLiveQuery(() => db.habitoRegistros.toArray(), [])
}

/** Conjunto de dias feitos por hábito (chave: habitoId). */
export function diasPorHabito(registros: HabitoRegistro[]): Map<string, Set<string>> {
  const mapa = new Map<string, Set<string>>()
  for (const r of registros) {
    if (!mapa.has(r.habitoId)) mapa.set(r.habitoId, new Set())
    mapa.get(r.habitoId)!.add(r.data)
  }
  return mapa
}
