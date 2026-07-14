import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/db'
import type { Pagina } from './types'

/** Páginas ordenadas da mais recente para a mais antiga. */
export function usePaginas(): Pagina[] | undefined {
  return useLiveQuery(
    () => db.paginas.orderBy('atualizadaEm').reverse().toArray(),
    [],
  )
}
