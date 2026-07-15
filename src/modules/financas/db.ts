import { nanoid } from 'nanoid'
import { db } from '../../core/db/db'
import type { Movimento, TipoMovimento } from './types'

export const CATEGORIAS = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Lazer',
  'Saúde',
  'Outros',
] as const

export async function criarMovimento(dados: {
  tipo: TipoMovimento
  valorCentavos: number
  descricao: string
  data: string
  categoria?: string
}) {
  if (!dados.descricao.trim() || dados.valorCentavos <= 0) return
  await db.movimentos.add({
    id: nanoid(),
    ...dados,
    descricao: dados.descricao.trim(),
    criadoEm: Date.now(),
  })
}

export async function atualizarMovimento(id: string, mudancas: Partial<Movimento>) {
  await db.movimentos.update(id, mudancas)
}

export async function excluirMovimento(id: string) {
  await db.movimentos.delete(id)
}

/* ---------- valores ---------- */

/** Converte texto pt-BR ("1.234,56", "50", "12,5") em centavos; null se inválido. */
export function parsearValor(texto: string): number | null {
  let limpo = texto.replace(/[R$\s]/g, '')
  if (!limpo) return null
  if (limpo.includes(',')) {
    limpo = limpo.replace(/\./g, '').replace(',', '.')
  }
  const numero = Number(limpo)
  if (!Number.isFinite(numero) || numero < 0) return null
  return Math.round(numero * 100)
}

const fmtBRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatarBRL(centavos: number): string {
  return fmtBRL.format(centavos / 100)
}

/** Centavos → texto editável simples ("1234,56"). */
export function valorParaTexto(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',')
}

/* ---------- seleção ---------- */

export function filtrarMes(movimentos: Movimento[], mes: string): Movimento[] {
  return movimentos.filter((m) => m.data.startsWith(mes))
}

export function totais(movimentos: Movimento[]) {
  let entradas = 0
  let saidas = 0
  for (const m of movimentos) {
    if (m.tipo === 'entrada') entradas += m.valorCentavos
    else saidas += m.valorCentavos
  }
  return { entradas, saidas, saldo: entradas - saidas }
}

/** Agrupa por dia, dias e itens mais recentes primeiro. */
export function agruparPorDia(movimentos: Movimento[]): [string, Movimento[]][] {
  const mapa = new Map<string, Movimento[]>()
  const ordenados = [...movimentos].sort(
    (a, b) => (a.data === b.data ? b.criadoEm - a.criadoEm : a.data < b.data ? 1 : -1),
  )
  for (const m of ordenados) {
    if (!mapa.has(m.data)) mapa.set(m.data, [])
    mapa.get(m.data)!.push(m)
  }
  return [...mapa.entries()]
}
