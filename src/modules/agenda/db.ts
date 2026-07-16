import { nanoid } from 'nanoid'
import { db } from '../../core/db/db'
import type { Evento } from './types'

/** Paleta de cores dos eventos (estilo Google Calendar). */
export const CORES_EVENTO = [
  '#4073ff',
  '#d1453b',
  '#eb8909',
  '#299438',
  '#6accbc',
  '#884dff',
  '#eb96eb',
  '#e8590c',
  '#0b8043',
  '#808080',
]

export const COR_PADRAO = CORES_EVENTO[0]

/* ---------- tempo ---------- */

export function paraMin(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm)
  if (!m) return 0
  return Math.min(1440, Number(m[1]) * 60 + Number(m[2]))
}

export function paraHHMM(min: number): string {
  const m = Math.max(0, Math.min(1440, Math.round(min)))
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/** Arredonda minutos para o passo (padrão 15 min). */
export function arredondar(min: number, passo = 15): number {
  return Math.round(min / passo) * passo
}

/* ---------- CRUD ---------- */

export async function criarEvento(dados: Partial<Evento> & { titulo: string; data: string }): Promise<string> {
  const id = dados.id ?? nanoid()
  await db.eventos.add({
    id,
    titulo: dados.titulo.trim() || 'Novo evento',
    data: dados.data,
    inicio: dados.inicio ?? '09:00',
    fim: dados.fim ?? '10:00',
    diaInteiro: dados.diaInteiro,
    cor: dados.cor ?? COR_PADRAO,
    local: dados.local,
    descricao: dados.descricao,
    criadoEm: Date.now(),
  })
  return id
}

export async function atualizarEvento(id: string, mudancas: Partial<Evento>) {
  await db.eventos.update(id, mudancas)
}

export async function excluirEvento(id: string) {
  await db.eventos.delete(id)
}

/* ---------- seleção ---------- */

export function eventosDoDia(eventos: Evento[], data: string): Evento[] {
  return eventos
    .filter((e) => e.data === data)
    .sort((a, b) => paraMin(a.inicio) - paraMin(b.inicio))
}

/* ---------- layout de sobreposição ---------- */

export interface ItemTempo {
  id: string
  inicioMin: number
  fimMin: number
}

export interface Posicao {
  coluna: number
  colunas: number
}

/**
 * Dispõe itens que se sobrepõem em colunas lado a lado (como o Google Calendar).
 * Agrupa em "clusters" de itens conectados por sobreposição e, dentro de cada
 * cluster, empacota em colunas; todos no cluster compartilham o nº de colunas.
 */
export function disporSobreposicao(itens: ItemTempo[]): Map<string, Posicao> {
  const ordenados = [...itens].sort(
    (a, b) => a.inicioMin - b.inicioMin || a.fimMin - b.fimMin,
  )
  const pos = new Map<string, Posicao>()
  let cluster: ItemTempo[] = []
  let fimCluster = -1

  const fechar = () => {
    if (cluster.length === 0) return
    // colunas: fim (min) de cada coluna
    const colunas: number[] = []
    const colDoItem = new Map<string, number>()
    for (const it of cluster) {
      let c = colunas.findIndex((fim) => fim <= it.inicioMin)
      if (c === -1) {
        c = colunas.length
        colunas.push(it.fimMin)
      } else {
        colunas[c] = it.fimMin
      }
      colDoItem.set(it.id, c)
    }
    const total = colunas.length
    for (const it of cluster) pos.set(it.id, { coluna: colDoItem.get(it.id)!, colunas: total })
    cluster = []
    fimCluster = -1
  }

  for (const it of ordenados) {
    if (cluster.length > 0 && it.inicioMin >= fimCluster) fechar()
    cluster.push(it)
    fimCluster = Math.max(fimCluster, it.fimMin)
  }
  fechar()
  return pos
}
