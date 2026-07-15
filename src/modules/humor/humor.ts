import { format, parseISO, subDays } from 'date-fns'
import { nanoid } from 'nanoid'
import { db } from '../../core/db/db'
import { hojeISO } from '../../core/dates'
import { CATEGORIAS_PADRAO, FATORES_PADRAO, HUMORES_PADRAO } from './dados'
import type { Categoria, Fator, HumorTipo, NivelHumor, Registro } from './types'

/**
 * Garante que os dados-base existam. Idempotente: só semeia tabelas vazias.
 * Também migra o humor legado (v0.16, um por dia) para registros.
 */
export async function garantirSeedsHumor() {
  const [nTipos, nCats, nFatores, nReg, nLegado] = await Promise.all([
    db.humorTipos.count(),
    db.categorias.count(),
    db.fatores.count(),
    db.registros.count(),
    db.humores.count(),
  ])
  if (nTipos === 0) await db.humorTipos.bulkPut(HUMORES_PADRAO)
  if (nCats === 0) await db.categorias.bulkPut(CATEGORIAS_PADRAO)
  if (nFatores === 0) await db.fatores.bulkPut(FATORES_PADRAO)

  // migração do humor antigo → registros (uma única vez)
  if (nReg === 0 && nLegado > 0) {
    const legado = await db.humores.toArray()
    const migrados: Registro[] = legado.map((h) => ({
      id: nanoid(),
      data: h.data,
      criadoEm: h.atualizadoEm ?? parseISO(h.data).getTime(),
      nivel: h.nivel,
      fatorIds: [],
      nota: h.nota,
    }))
    if (migrados.length) await db.registros.bulkAdd(migrados)
  }
}

// ─── Registros ────────────────────────────────────────────────────────────

export async function criarRegistro(dados: {
  data: string
  nivel: NivelHumor
  intensidade?: Registro['intensidade']
  fatorIds?: string[]
  nota?: string
  anexoId?: string
  anexoTipo?: Registro['anexoTipo']
}): Promise<string> {
  const id = nanoid()
  await db.registros.add({
    id,
    data: dados.data,
    criadoEm: Date.now(),
    nivel: dados.nivel,
    intensidade: dados.intensidade,
    fatorIds: dados.fatorIds ?? [],
    nota: dados.nota?.trim() || undefined,
    anexoId: dados.anexoId,
    anexoTipo: dados.anexoTipo,
  })
  return id
}

export async function atualizarRegistro(id: string, mudancas: Partial<Registro>) {
  await db.registros.update(id, mudancas)
}

export async function excluirRegistro(id: string) {
  const reg = await db.registros.get(id)
  if (reg?.anexoId) await db.arquivos.delete(reg.anexoId).catch(() => {})
  await db.registros.delete(id)
}

// ─── Anexos (foto/desenho) reaproveitam a tabela `arquivos` ─────────────────

export async function salvarAnexo(blob: Blob, nome: string): Promise<string> {
  const id = nanoid()
  await db.arquivos.add({
    id,
    blob,
    nome,
    tipo: blob.type || 'application/octet-stream',
    tamanho: blob.size,
    criadoEm: Date.now(),
  })
  return id
}

export async function urlDoAnexo(id: string): Promise<string | null> {
  const a = await db.arquivos.get(id)
  return a ? URL.createObjectURL(a.blob) : null
}

// ─── Helpers puros ──────────────────────────────────────────────────────────

export function humorDe(tipos: HumorTipo[], nivel: NivelHumor): HumorTipo {
  return tipos.find((t) => t.nivel === nivel) ?? HUMORES_PADRAO[nivel - 1]
}

export function mapaFatores(fatores: Fator[]): Map<string, Fator> {
  return new Map(fatores.map((f) => [f.id, f]))
}

export function mapaCategorias(cats: Categoria[]): Map<string, Categoria> {
  return new Map(cats.map((c) => [c.id, c]))
}

/** Registros de um dia, mais recentes primeiro. */
export function registrosDoDia(regs: Registro[], data: string): Registro[] {
  return regs.filter((r) => r.data === data).sort((a, b) => b.criadoEm - a.criadoEm)
}

/** Média de nível de uma lista (0 se vazia). */
export function mediaNivel(regs: Registro[]): number {
  if (regs.length === 0) return 0
  return regs.reduce((s, r) => s + r.nivel, 0) / regs.length
}

/** Contagem por nível (índice 0..4 = níveis 1..5). */
export function contagemPorNivel(regs: Registro[]): number[] {
  const c = [0, 0, 0, 0, 0]
  for (const r of regs) c[r.nivel - 1]++
  return c
}

/** Conjunto de dias com pelo menos um registro. */
export function diasComRegistro(regs: Registro[]): Set<string> {
  return new Set(regs.map((r) => r.data))
}

/** Sequência de dias consecutivos com registro, terminando hoje (ou ontem). */
export function streakRegistros(regs: Registro[], hoje = hojeISO()): number {
  const dias = diasComRegistro(regs)
  let dia = parseISO(hoje)
  if (!dias.has(hoje)) dia = subDays(dia, 1)
  let streak = 0
  while (dias.has(format(dia, 'yyyy-MM-dd'))) {
    streak++
    dia = subDays(dia, 1)
  }
  return streak
}
