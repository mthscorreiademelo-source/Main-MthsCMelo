import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/db'
import { HUMORES_PADRAO } from './dados'
import type { Categoria, Fator, HumorTipo, Registro } from './types'

export function useRegistros(): Registro[] | undefined {
  return useLiveQuery(() => db.registros.toArray(), [])
}

export function useHumorTipos(): HumorTipo[] {
  const tipos = useLiveQuery(() => db.humorTipos.orderBy('nivel').toArray(), [])
  return tipos && tipos.length ? tipos : HUMORES_PADRAO
}

export function useCategorias(): Categoria[] | undefined {
  return useLiveQuery(() => db.categorias.orderBy('ordem').toArray(), [])
}

export function useFatores(): Fator[] | undefined {
  return useLiveQuery(() => db.fatores.orderBy('ordem').toArray(), [])
}
