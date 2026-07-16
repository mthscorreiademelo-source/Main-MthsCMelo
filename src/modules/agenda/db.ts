import { differenceInCalendarDays, differenceInCalendarMonths, getDate, getDay, parseISO } from 'date-fns'
import { nanoid } from 'nanoid'
import { db } from '../../core/db/db'
import type { Evento, RecorrenciaEvento } from './types'

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
    recorrencia: dados.recorrencia,
    presenca: dados.presenca ?? 'confirmado',
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

/** Uma ocorrência de evento num dia (o master + a data efetiva). */
export interface OcorrenciaEvento {
  evento: Evento
  data: string
  ehOcorrencia: boolean
}

/** A recorrência de `master` (que começa em D0) cai no dia `data`? */
function recorreNoDia(master: Evento, rec: RecorrenciaEvento, data: string): boolean {
  if (data <= master.data) return false
  if (rec.ate && data > rec.ate) return false
  const d0 = parseISO(master.data)
  const d = parseISO(data)
  const n = Math.max(1, rec.intervalo ?? 1)
  switch (rec.tipo) {
    case 'diaria':
      return differenceInCalendarDays(d, d0) % n === 0
    case 'semanal':
      return getDay(d) === getDay(d0) && (differenceInCalendarDays(d, d0) / 7) % n === 0
    case 'mensal':
      return getDate(d) === getDate(d0) && differenceInCalendarMonths(d, d0) % n === 0
    case 'anual':
      return (
        getDate(d) === getDate(d0) &&
        d.getMonth() === d0.getMonth() &&
        (d.getFullYear() - d0.getFullYear()) % n === 0
      )
    default:
      return false
  }
}

/**
 * Expande eventos recorrentes em ocorrências para os dias informados.
 * O evento na sua própria data é o "master" (editável/arrastável); as demais
 * ocorrências são geradas (abrir edita a série).
 */
export function expandirEventos(eventos: Evento[], dias: string[]): OcorrenciaEvento[] {
  const set = new Set(dias)
  const out: OcorrenciaEvento[] = []
  for (const e of eventos) {
    if (set.has(e.data)) out.push({ evento: e, data: e.data, ehOcorrencia: false })
    if (e.recorrencia) {
      for (const dia of dias) {
        if (dia === e.data) continue
        if (recorreNoDia(e, e.recorrencia, dia)) out.push({ evento: e, data: dia, ehOcorrencia: true })
      }
    }
  }
  return out
}

export function eventosDoDia(eventos: Evento[], data: string): Evento[] {
  return expandirEventos(eventos, [data])
    .map((o) => (o.ehOcorrencia ? { ...o.evento, data } : o.evento))
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
