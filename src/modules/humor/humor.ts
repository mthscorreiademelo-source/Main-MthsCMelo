import { db } from '../../core/db/db'
import type { HumorRegistro, NivelHumor } from './types'

export interface HumorDef {
  nivel: NivelHumor
  rotulo: string
  /** Cor fixa (funciona em claro e escuro), no espírito minimalista do Lume. */
  cor: string
}

/** Escala de 5 humores — do péssimo ao ótimo. */
export const HUMORES: HumorDef[] = [
  { nivel: 1, rotulo: 'Péssimo', cor: '#d05a56' },
  { nivel: 2, rotulo: 'Ruim', cor: '#dc9250' },
  { nivel: 3, rotulo: 'Normal', cor: '#c9b458' },
  { nivel: 4, rotulo: 'Bom', cor: '#7faf6b' },
  { nivel: 5, rotulo: 'Ótimo', cor: '#4c9d84' },
]

export function humorDe(nivel: NivelHumor): HumorDef {
  return HUMORES[nivel - 1]
}

/** Registra (ou atualiza) o humor de um dia. */
export async function registrarHumor(data: string, nivel: NivelHumor, nota?: string) {
  const existente = await db.humores.get(data)
  await db.humores.put({
    id: data,
    data,
    nivel,
    nota: nota ?? existente?.nota,
    atualizadoEm: Date.now(),
  })
}

export async function definirNota(data: string, nota: string) {
  const existente = await db.humores.get(data)
  if (!existente) return
  await db.humores.put({ ...existente, nota: nota.trim() || undefined, atualizadoEm: Date.now() })
}

export async function excluirHumor(data: string) {
  await db.humores.delete(data)
}

/** Média de humor de uma lista de registros (0 se vazia). */
export function mediaHumor(regs: HumorRegistro[]): number {
  if (regs.length === 0) return 0
  return regs.reduce((s, r) => s + r.nivel, 0) / regs.length
}

/** Contagem por nível (índice 0..4 = níveis 1..5). */
export function contagemPorNivel(regs: HumorRegistro[]): number[] {
  const c = [0, 0, 0, 0, 0]
  for (const r of regs) c[r.nivel - 1]++
  return c
}
