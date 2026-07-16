import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/db'
import type { Livro } from './types'

export function useLivros(): Livro[] | undefined {
  return useLiveQuery(() => db.livros.toArray(), [])
}

export function useLivro(id: string | undefined): Livro | undefined {
  return useLiveQuery(() => (id ? db.livros.get(id) : undefined), [id])
}
