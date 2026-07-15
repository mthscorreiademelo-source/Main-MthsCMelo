import { nanoid } from 'nanoid'
import { db } from '../../core/db/db'
import type { Categoria, Fator, HumorTipo, NivelHumor } from './types'

/** Paleta de cores para humores e fatores (funciona em claro/escuro). */
export const PALETA_HUMOR = [
  '#c46a5e',
  '#d89b6c',
  '#c2b083',
  '#8cae7b',
  '#5b9c86',
  '#4a9d84',
  '#4a7bb0',
  '#6d8bc4',
  '#8a63c4',
  '#b063a6',
  '#c95f86',
  '#6b7280',
]

// ─── Humores ─────────────────────────────────────────────────────────────────

export async function atualizarHumorTipo(nivel: NivelHumor, mudancas: Partial<HumorTipo>) {
  await db.humorTipos.update(nivel, mudancas)
}

// ─── Categorias ──────────────────────────────────────────────────────────────

export async function criarCategoria(nome: string, icone = 'folha'): Promise<string | null> {
  const nomeT = nome.trim()
  if (!nomeT) return null
  const cats = await db.categorias.toArray()
  const ordem = cats.length ? Math.max(...cats.map((c) => c.ordem)) + 1 : 0
  const id = nanoid()
  await db.categorias.add({ id, nome: nomeT, icone, ordem })
  return id
}

export async function atualizarCategoria(id: string, mudancas: Partial<Categoria>) {
  await db.categorias.update(id, mudancas)
}

/** Exclui a categoria, seus fatores e remove as referências dos registros. */
export async function excluirCategoria(id: string) {
  await db.transaction('rw', db.categorias, db.fatores, db.registros, async () => {
    const fats = await db.fatores.where('categoriaId').equals(id).toArray()
    const ids = new Set(fats.map((f) => f.id))
    await db.fatores.where('categoriaId').equals(id).delete()
    await db.categorias.delete(id)
    await removerRefs(ids)
  })
}

/** Move a categoria uma posição para cima (−1) ou baixo (+1). */
export async function moverCategoria(id: string, dir: -1 | 1) {
  const cats = (await db.categorias.toArray()).sort((a, b) => a.ordem - b.ordem)
  const i = cats.findIndex((c) => c.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= cats.length) return
  const a = cats[i]
  const b = cats[j]
  await db.transaction('rw', db.categorias, async () => {
    await db.categorias.update(a.id, { ordem: b.ordem })
    await db.categorias.update(b.id, { ordem: a.ordem })
  })
}

// ─── Fatores ─────────────────────────────────────────────────────────────────

export async function criarFator(
  categoriaId: string,
  nome: string,
  icone = 'folha',
  cor?: string,
): Promise<string | null> {
  const nomeT = nome.trim()
  if (!nomeT) return null
  const irmaos = await db.fatores.where('categoriaId').equals(categoriaId).toArray()
  const ordem = irmaos.length ? Math.max(...irmaos.map((f) => f.ordem)) + 1 : 0
  const id = nanoid()
  await db.fatores.add({ id, categoriaId, nome: nomeT, icone, cor, ordem })
  return id
}

export async function atualizarFator(id: string, mudancas: Partial<Fator>) {
  await db.fatores.update(id, mudancas)
}

export async function arquivarFator(id: string, arquivado: boolean) {
  await db.fatores.update(id, { arquivado })
}

/** Exclui o fator e remove a referência dele de todos os registros. */
export async function excluirFator(id: string) {
  await db.transaction('rw', db.fatores, db.registros, async () => {
    await db.fatores.delete(id)
    await removerRefs(new Set([id]))
  })
}

/** Move o fator uma posição dentro da sua categoria. */
export async function moverFator(id: string, dir: -1 | 1) {
  const fator = await db.fatores.get(id)
  if (!fator) return
  const irmaos = (await db.fatores.where('categoriaId').equals(fator.categoriaId).toArray()).sort(
    (a, b) => a.ordem - b.ordem,
  )
  const i = irmaos.findIndex((f) => f.id === id)
  const j = i + dir
  if (j < 0 || j >= irmaos.length) return
  const a = irmaos[i]
  const b = irmaos[j]
  await db.transaction('rw', db.fatores, async () => {
    await db.fatores.update(a.id, { ordem: b.ordem })
    await db.fatores.update(b.id, { ordem: a.ordem })
  })
}

/** Remove um conjunto de ids de fator das listas fatorIds de todos os registros. */
async function removerRefs(ids: Set<string>) {
  const regs = await db.registros.toArray()
  for (const r of regs) {
    if (r.fatorIds.some((fid) => ids.has(fid))) {
      await db.registros.update(r.id, { fatorIds: r.fatorIds.filter((fid) => !ids.has(fid)) })
    }
  }
}
