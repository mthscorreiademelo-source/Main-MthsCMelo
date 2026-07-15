import { format, parseISO, subDays } from 'date-fns'
import { nanoid } from 'nanoid'
import { db } from '../../core/db/db'
import { hojeISO } from '../../core/dates'
import type { Habito } from './types'

export async function criarHabito(nome: string) {
  const texto = nome.trim()
  if (!texto) return
  const agora = Date.now()
  await db.habitos.add({ id: nanoid(), nome: texto, criadoEm: agora, ordem: agora })
}

export async function renomearHabito(id: string, nome: string) {
  const texto = nome.trim()
  if (texto) await db.habitos.update(id, { nome: texto })
}

export async function excluirHabito(id: string) {
  await db.transaction('rw', db.habitos, db.habitoRegistros, async () => {
    await db.habitoRegistros.where('habitoId').equals(id).delete()
    await db.habitos.delete(id)
  })
}

/** Marca/desmarca um dia do hábito. */
export async function alternarDia(habitoId: string, data: string) {
  const id = `${habitoId}:${data}`
  const existente = await db.habitoRegistros.get(id)
  if (existente) {
    await db.habitoRegistros.delete(id)
  } else {
    await db.habitoRegistros.add({ id, habitoId, data })
  }
}

export function ordenarHabitos(habitos: Habito[]): Habito[] {
  return [...habitos].sort((a, b) => a.ordem - b.ordem)
}

/** Últimos n dias (mais antigo primeiro), terminando hoje. */
export function ultimosDias(n: number): string[] {
  const hoje = parseISO(hojeISO())
  return Array.from({ length: n }, (_, i) =>
    format(subDays(hoje, n - 1 - i), 'yyyy-MM-dd'),
  )
}

/**
 * Sequência de dias consecutivos terminando hoje.
 * Se hoje ainda não foi marcado, a contagem parte de ontem (streak "viva").
 */
export function calcularStreak(diasFeitos: Set<string>, hoje = hojeISO()): number {
  let dia = parseISO(hoje)
  if (!diasFeitos.has(hoje)) dia = subDays(dia, 1)
  let streak = 0
  while (diasFeitos.has(format(dia, 'yyyy-MM-dd'))) {
    streak++
    dia = subDays(dia, 1)
  }
  return streak
}
