/** Camada de dados dos flashcards (Dexie) + hooks. */
import { nanoid } from 'nanoid'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../core/db/db'
import { hojeISO } from '../../../core/dates'
import { agendamentoInicial, devido, revisarSM2, type Flashcard, type Qualidade } from './tipos'

export async function criarFlashcard(dados: { frente: string; verso: string; livroId?: string }): Promise<string | undefined> {
  const frente = dados.frente.trim()
  const verso = dados.verso.trim()
  if (!frente || !verso) return
  const hoje = hojeISO()
  const card: Flashcard = {
    id: nanoid(),
    frente,
    verso,
    livroId: dados.livroId,
    ...agendamentoInicial(hoje),
    criadoEm: Date.now(),
  }
  await db.flashcards.add(card)
  return card.id
}

export async function atualizarFlashcard(id: string, mudancas: Partial<Flashcard>) {
  await db.flashcards.update(id, { ...mudancas, atualizadoEm: Date.now() })
}

export async function excluirFlashcard(id: string) {
  await db.flashcards.delete(id)
}

/** Registra uma revisão, aplicando o SM-2. */
export async function revisarFlashcard(card: Flashcard, q: Qualidade) {
  const sched = revisarSM2(card, q, hojeISO())
  await db.flashcards.update(card.id, { ...sched, atualizadoEm: Date.now() })
}

export function useFlashcards(livroId?: string): Flashcard[] | undefined {
  return useLiveQuery(async () => {
    const todos = await db.flashcards.toArray()
    const filtrados = livroId ? todos.filter((c) => c.livroId === livroId) : todos
    return filtrados.sort((a, b) => b.criadoEm - a.criadoEm)
  }, [livroId])
}

/** Cartões devidos hoje (embaralhados de forma estável por id). */
export function useFlashcardsDevidos(livroId?: string): Flashcard[] | undefined {
  const cards = useFlashcards(livroId)
  if (!cards) return undefined
  const hoje = hojeISO()
  return cards.filter((c) => devido(c, hoje)).sort((a, b) => a.proximaRevisao.localeCompare(b.proximaRevisao))
}
