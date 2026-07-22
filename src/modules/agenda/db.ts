import { addDays, addMonths, addWeeks, addYears, format, parseISO, startOfWeek } from 'date-fns'
import { nanoid } from 'nanoid'
import { db } from '../../core/db/db'
import type { Contexto, Cronograma, Evento, RecorrenciaEvento } from './types'

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
    dataFim: dados.dataFim,
    diaInteiro: dados.diaInteiro,
    cor: dados.cor ?? COR_PADRAO,
    categoria: dados.categoria,
    local: dados.local,
    participantes: dados.participantes,
    custoCentavos: dados.custoCentavos,
    cronogramaId: dados.cronogramaId,
    petId: dados.petId,
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

/** Evento recém-criado sem nenhuma informação real (só o nome padrão). */
export function eventoVazio(e: Evento): boolean {
  return (
    (!e.titulo || e.titulo.trim() === '' || e.titulo === 'Novo evento') &&
    !e.local && !e.descricao && !(e.participantes?.length) &&
    !e.custoCentavos && !e.diaInteiro && !e.recorrencia && !e.cronogramaId
  )
}

/** Apaga o evento se estiver vazio. Retorna `true` se descartou. */
export async function descartarEventoSeVazio(id: string): Promise<boolean> {
  const e = await db.eventos.get(id)
  if (e && eventoVazio(e)) {
    await db.eventos.delete(id)
    return true
  }
  return false
}

/* ---------- cronogramas ---------- */

export async function criarCronograma(dados: Partial<Cronograma> & { nome: string }): Promise<string> {
  const id = dados.id ?? nanoid()
  const max = await db.cronogramas.orderBy('ordem').last()
  await db.cronogramas.add({
    id,
    nome: dados.nome.trim() || 'Cronograma',
    cor: dados.cor ?? CORES_EVENTO[3],
    ordem: dados.ordem ?? (max?.ordem ?? 0) + 1,
    criadoEm: Date.now(),
  })
  return id
}

export async function atualizarCronograma(id: string, mudancas: Partial<Cronograma>) {
  await db.cronogramas.update(id, mudancas)
}

/** Exclui o cronograma e desvincula seus eventos (não apaga os eventos). */
export async function excluirCronograma(id: string) {
  await db.transaction('rw', db.cronogramas, db.eventos, async () => {
    await db.eventos.where('cronogramaId').equals(id).modify({ cronogramaId: undefined })
    await db.cronogramas.delete(id)
  })
}

/* ---------- contextos ---------- */

/** Categorias sugeridas de contexto (o nome é livre). */
export const CATEGORIAS_CONTEXTO = ['Sono', 'Trabalho', 'Home Office', 'Estudos', 'Academia', 'Viagem', 'Férias', 'Lazer']

export async function criarContexto(dados: Partial<Contexto> & { nome: string }): Promise<string> {
  const id = dados.id ?? nanoid()
  const max = await db.contextos.orderBy('ordem').last()
  await db.contextos.add({
    id,
    nome: dados.nome.trim() || 'Contexto',
    cor: dados.cor ?? '#5a6b8c',
    opacidade: dados.opacidade ?? 0.08,
    inicioMin: dados.inicioMin ?? 9 * 60,
    fimMin: dados.fimMin ?? 18 * 60,
    dias: dados.dias,
    excecoes: dados.excecoes,
    categoria: dados.categoria,
    icone: dados.icone,
    ordem: dados.ordem ?? (max?.ordem ?? 0) + 1,
    criadoEm: Date.now(),
  })
  return id
}
export const atualizarContexto = (id: string, m: Partial<Contexto>) => db.contextos.update(id, m)
export const excluirContexto = (id: string) => db.contextos.delete(id)

/** Semeia contextos padrão na primeira visita (Sono + Trabalho), editáveis. */
export async function semearContextosSePreciso() {
  if ((await db.contextos.count()) > 0) return
  if (localStorage.getItem('lume:contextos:semeado') === '1') return
  localStorage.setItem('lume:contextos:semeado', '1')
  await db.contextos.bulkAdd([
    { id: nanoid(), nome: 'Sono', cor: '#5a6b8c', opacidade: 0.1, inicioMin: 23 * 60, fimMin: 7 * 60, icone: '🌙', categoria: 'Sono', ordem: 1, criadoEm: Date.now() },
    { id: nanoid(), nome: 'Trabalho', cor: '#299438', opacidade: 0.07, inicioMin: 9 * 60, fimMin: 18 * 60, dias: [1, 2, 3, 4, 5], icone: '💼', categoria: 'Trabalho', ordem: 2, criadoEm: Date.now() },
  ])
}

/* ---------- seleção ---------- */

/** Uma ocorrência de evento num dia (o master + a data efetiva). */
export interface OcorrenciaEvento {
  evento: Evento
  data: string
  ehOcorrencia: boolean
}

const CAP_OCORRENCIAS = 1000

/**
 * Gera as datas (ISO) das ocorrências da série, em ordem crescente, incluindo a
 * primeira (a do master). Respeita intervalo, dias da semana, término por data
 * ou por nº de ocorrências. Limitado por `ateISO` (fim da janela visível) e por
 * um teto de segurança.
 */
function* gerarOcorrencias(master: Evento, rec: RecorrenciaEvento, ateISO: string): Generator<string> {
  const n = Math.max(1, rec.intervalo ?? 1)
  const base = parseISO(master.data)
  const limite = rec.ocorrencias && rec.ocorrencias > 0 ? rec.ocorrencias : Infinity
  const fim = rec.ate && rec.ate < ateISO ? rec.ate : ateISO
  let count = 0

  if (rec.tipo === 'semanal' && rec.dias?.length) {
    const diasOrd = [...new Set(rec.dias)].sort((a, b) => a - b)
    let semana = startOfWeek(base, { weekStartsOn: 0 })
    for (let guarda = 0; guarda < CAP_OCORRENCIAS; guarda++) {
      for (const wd of diasOrd) {
        const iso = format(addDays(semana, wd), 'yyyy-MM-dd')
        if (iso < master.data) continue
        if (iso > fim || count >= limite) return
        count++
        yield iso
      }
      semana = addWeeks(semana, n)
      if (format(semana, 'yyyy-MM-dd') > fim) return
    }
    return
  }

  const avancar = (d: Date) =>
    rec.tipo === 'diaria' ? addDays(d, n) : rec.tipo === 'mensal' ? addMonths(d, n) : rec.tipo === 'anual' ? addYears(d, n) : addWeeks(d, n)

  let d = base
  for (let guarda = 0; guarda < CAP_OCORRENCIAS; guarda++) {
    const iso = format(d, 'yyyy-MM-dd')
    if (iso > fim || count >= limite) return
    count++
    yield iso
    d = avancar(d)
  }
}

/**
 * Expande eventos recorrentes em ocorrências para os dias informados.
 * O evento na sua própria data é o "master" (editável/arrastável); as demais
 * ocorrências são geradas (abrir edita a série).
 */
export function expandirEventos(eventos: Evento[], dias: string[]): OcorrenciaEvento[] {
  if (dias.length === 0) return []
  const set = new Set(dias)
  const ultimo = dias[dias.length - 1]
  const out: OcorrenciaEvento[] = []
  for (const e of eventos) {
    if (set.has(e.data)) out.push({ evento: e, data: e.data, ehOcorrencia: false })
    if (!e.recorrencia) continue
    for (const data of gerarOcorrencias(e, e.recorrencia, ultimo)) {
      if (data === e.data) continue
      if (set.has(data)) out.push({ evento: e, data, ehOcorrencia: true })
    }
  }
  return out
}

const NOMES_DIA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/** Resumo legível da recorrência (ex.: "A cada 2 semanas em seg, qua · 10×"). */
export function rotuloRecorrencia(rec: RecorrenciaEvento | undefined): string {
  if (!rec) return 'Não repete'
  const n = Math.max(1, rec.intervalo ?? 1)
  const unid = {
    diaria: { art: 'Todo', s: 'dia', p: 'dias' },
    semanal: { art: 'Toda', s: 'semana', p: 'semanas' },
    mensal: { art: 'Todo', s: 'mês', p: 'meses' },
    anual: { art: 'Todo', s: 'ano', p: 'anos' },
  }[rec.tipo]
  let s = n === 1 ? `${unid.art} ${unid.s}` : `A cada ${n} ${unid.p}`
  if (rec.tipo === 'semanal' && rec.dias?.length) {
    const dd = [...rec.dias].sort((a, b) => a - b)
    const uteis = dd.length === 5 && dd.every((d) => d >= 1 && d <= 5)
    s += uteis ? ' (dias úteis)' : ' em ' + dd.map((d) => NOMES_DIA[d]).join(', ')
  }
  if (rec.ocorrencias) s += ` · ${rec.ocorrencias}×`
  else if (rec.ate) s += ` · até ${format(parseISO(rec.ate), 'dd/MM/yyyy')}`
  return s
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
