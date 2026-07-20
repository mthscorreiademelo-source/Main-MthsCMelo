import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/db'
import type { Destaque, Livro, NotaLivro } from './types'

export function useLivros(): Livro[] | undefined {
  return useLiveQuery(() => db.livros.toArray(), [])
}

export function useLivro(id: string | undefined): Livro | undefined {
  return useLiveQuery(() => (id ? db.livros.get(id) : undefined), [id])
}

/** Volumes de um compilado (série de quadrinho/mangá). */
export function useVolumes(compiladoId: string | undefined): Livro[] | undefined {
  return useLiveQuery(
    () => db.livros.filter((l) => !!compiladoId && l.compiladoId === compiladoId).toArray(),
    [compiladoId],
  )
}

export function useNotas(): NotaLivro[] | undefined {
  return useLiveQuery(() => db.notasLivro.toArray(), [])
}
export function useNotasLivro(livroId: string | undefined): NotaLivro[] | undefined {
  return useLiveQuery(() => (livroId ? db.notasLivro.where('livroId').equals(livroId).toArray() : []), [livroId])
}
export function useDestaques(): Destaque[] | undefined {
  return useLiveQuery(() => db.destaques.toArray(), [])
}
export function useDestaquesLivro(livroId: string | undefined): Destaque[] | undefined {
  return useLiveQuery(() => (livroId ? db.destaques.where('livroId').equals(livroId).toArray() : []), [livroId])
}
