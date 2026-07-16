import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/db'
import type { CategoriaHabito, Habito, HabitoRegistro } from './types'

/**
 * Garante que todo hábito tem `tipo` e `frequencia`, mesmo os vindos da nuvem
 * de versões antigas (a migração local não alcança registros sincronizados).
 */
export function normalizarHabito(h: Habito): Habito {
  if (h.tipo && h.frequencia) return h
  return {
    ...h,
    tipo: h.tipo ?? 'sim_nao',
    frequencia: h.frequencia ?? { tipo: 'diario' },
  }
}

export function useHabitos(): Habito[] | undefined {
  return useLiveQuery(async () => (await db.habitos.toArray()).map(normalizarHabito), [])
}

export function useRegistros(): HabitoRegistro[] | undefined {
  return useLiveQuery(() => db.habitoRegistros.toArray(), [])
}

export function useCategoriasHabito(): CategoriaHabito[] | undefined {
  return useLiveQuery(() => db.categoriasHabito.toArray(), [])
}

export function useHabito(id: string | undefined): Habito | undefined {
  return useLiveQuery(async () => {
    if (!id) return undefined
    const h = await db.habitos.get(id)
    return h ? normalizarHabito(h) : h
  }, [id])
}
