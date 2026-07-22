/**
 * Fonte de dados (Dexie) para as sugestões de token da Captura Rápida.
 * Separado de `tokens.ts` para manter aquela lógica pura e testável.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { FontesTokens } from './tokens'

/** Reúne, de forma reativa, as fontes de sugestão a partir do banco. */
export function useFontesTokens(): FontesTokens {
  return (
    useLiveQuery(async () => {
      const [projetos, linhas, eventos] = await Promise.all([
        db.projetos.toArray(),
        db.orcamentoLinhas.toArray(),
        db.eventos.toArray(),
      ])
      const cats = new Set<string>()
      for (const l of linhas) {
        if (l.nome) cats.add(l.nome)
        for (const c of l.categorias ?? []) cats.add(c)
      }
      const pessoas = new Set<string>()
      for (const e of eventos) for (const p of e.participantes ?? []) if (p?.trim()) pessoas.add(p.trim())
      return {
        projetos: projetos.map((p) => ({ id: p.id, nome: p.nome, cor: p.cor })),
        categorias: [...cats].sort((a, b) => a.localeCompare(b, 'pt-BR')),
        pessoas: [...pessoas].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      }
    }, []) ?? { projetos: [], categorias: [], pessoas: [] }
  )
}
