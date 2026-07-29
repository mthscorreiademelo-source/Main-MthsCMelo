import { addDays, addMonths, addWeeks, addYears, format, parseISO, startOfWeek } from 'date-fns'
import { nanoid } from 'nanoid'
import { db } from '../../core/db/db'
import { SEMEAR_EXEMPLOS } from '../../core/db/exemplos'
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
    icone: dados.icone,
    local: dados.local,
    participantes: dados.participantes,
    custoCentavos: dados.custoCentavos,
    cronogramaId: dados.cronogramaId,
    petId: dados.petId,
    projetoId: dados.projetoId,
    descricao: dados.descricao,
    recorrencia: dados.recorrencia,
    serieId: dados.serieId,
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
    !e.custoCentavos && !e.diaInteiro && !e.recorrencia && !e.cronogramaId &&
    // Também conta como "conteúdo real" categorizar, vincular a pet/projeto ou
    // pintar o evento — senão fechar sem título apagaria dados que o usuário pôs.
    !e.categoria && !e.petId && !e.projetoId && !e.cor
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
  if (!SEMEAR_EXEMPLOS) return
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
 *
 * `rec.excecoes` (estilo EXDATE do iCalendar): datas que a regra ainda "gasta"
 * pra contar o limite de ocorrências, mas que NÃO são emitidas (viraram uma
 * ocorrência avulsa/excluída em separado — ver `destacarOcorrencia` e afins).
 */
export function* gerarOcorrencias(master: Evento, rec: RecorrenciaEvento, ateISO: string): Generator<string> {
  const n = Math.max(1, rec.intervalo ?? 1)
  const base = parseISO(master.data)
  const limite = rec.ocorrencias && rec.ocorrencias > 0 ? rec.ocorrencias : Infinity
  const fim = rec.ate && rec.ate < ateISO ? rec.ate : ateISO
  const excecoes = new Set(rec.excecoes ?? [])
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
        if (!excecoes.has(iso)) yield iso
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
    if (!excecoes.has(iso)) yield iso
    d = avancar(d)
  }
}

/** Quantas ocorrências a regra "pura" (ignorando exceções) gera em
 *  [master.data, ateISO] — usado para saber quantas já foram "consumidas"
 *  antes de um corte de série (ver `planoDividirSerie`). */
function contarOcorrenciasAte(master: Evento, rec: RecorrenciaEvento, ateISO: string): number {
  return [...gerarOcorrencias(master, { ...rec, excecoes: undefined }, ateISO)].length
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
    // A própria data do master só entra se não tiver virado uma exceção
    // ("só esta" aplicado exatamente na primeira ocorrência da série).
    const masterExcluido = !!e.recorrencia?.excecoes?.includes(e.data)
    if (set.has(e.data) && !masterExcluido) out.push({ evento: e, data: e.data, ehOcorrencia: false })
    if (!e.recorrencia) continue
    for (const data of gerarOcorrencias(e, e.recorrencia, ultimo)) {
      if (data === e.data) continue
      if (set.has(data)) out.push({ evento: e, data, ehOcorrencia: true })
    }
  }
  return out
}

/* ---------- recorrência: editar/excluir por ocorrência (só esta / a partir daqui / todas) ---------- */

/** Data ISO (yyyy-MM-dd) do dia imediatamente anterior. */
function diaAnteriorISO(dataISO: string): string {
  return format(addDays(parseISO(dataISO), -1), 'yyyy-MM-dd')
}

export interface PlanoOcorrenciaUnica {
  /** Exceção a gravar no master (`null` se o evento nem tinha `recorrencia`). */
  mudancasMaster: Partial<Evento> | null
  /** Dados do evento avulso a criar, vinculado à série por `serieId`. */
  avulso: Partial<Evento> & { titulo: string; data: string }
}

/**
 * "Só esta" — plano puro (sem tocar no banco) para destacar UMA ocorrência da
 * série num evento avulso independente. Usado tanto pelo arrastar (sempre
 * "só esta", sem perguntar) quanto pela opção "Só esta" do diálogo de
 * editar/excluir. `mudancas` são os campos alterados (ex.: novo horário); se
 * incluir `data`, o avulso nasce na nova data — a exceção no master continua
 * sendo a data ORIGINAL da ocorrência.
 */
export function planoDestacarOcorrencia(
  master: Evento,
  dataOcorrencia: string,
  mudancas: Partial<Evento> = {},
): PlanoOcorrenciaUnica {
  const rec = master.recorrencia
  let mudancasMaster: Partial<Evento> | null = null
  if (rec) {
    const excecoes = rec.excecoes?.includes(dataOcorrencia) ? rec.excecoes : [...(rec.excecoes ?? []), dataOcorrencia]
    mudancasMaster = { recorrencia: { ...rec, excecoes } }
  }
  const { id: _id, criadoEm: _criadoEm, atualizadoEm: _atualizadoEm, recorrencia: _rec, ...resto } = master
  return {
    mudancasMaster,
    avulso: { ...resto, ...mudancas, data: mudancas.data ?? dataOcorrencia, serieId: master.id },
  }
}

export type PlanoEdicaoSerie =
  | { tipo: 'atualizarMaster'; mudancas: Partial<Evento> }
  | { tipo: 'dividir'; mudancasMasterAntigo: Partial<Evento>; novoMaster: Partial<Evento> & { titulo: string; data: string } }

/**
 * "Esta e as próximas" (editar) — plano puro para dividir a série: o master
 * antigo passa a terminar um dia antes do corte (`recorrencia.ate`), e um
 * NOVO master nasce na data de corte com os campos alterados e a MESMA regra
 * restante (herda o que sobrar de `ocorrencias`, mantém `ate` se houver).
 * Se a data de corte for a própria data do master (não existe "antes"),
 * equivale a editar a série inteira — sem divisão.
 */
export function planoDividirSerie(master: Evento, dataCorte: string, mudancas: Partial<Evento> = {}): PlanoEdicaoSerie {
  const rec = master.recorrencia
  if (!rec || dataCorte <= master.data) {
    return { tipo: 'atualizarMaster', mudancas }
  }

  const diaAnterior = diaAnteriorISO(dataCorte)
  const consumidas = contarOcorrenciasAte(master, rec, diaAnterior)
  const novaRec: RecorrenciaEvento = { ...rec, excecoes: rec.excecoes?.filter((d) => d >= dataCorte) }
  if (rec.ocorrencias) novaRec.ocorrencias = Math.max(1, rec.ocorrencias - consumidas)

  const { id: _id, criadoEm: _criadoEm, atualizadoEm: _atualizadoEm, ...resto } = master
  return {
    tipo: 'dividir',
    mudancasMasterAntigo: { recorrencia: { ...rec, ate: diaAnterior, ocorrencias: undefined } },
    novoMaster: { ...resto, ...mudancas, data: mudancas.data ?? dataCorte, recorrencia: novaRec, serieId: undefined },
  }
}

export type PlanoExclusaoSerie = { tipo: 'excluirMaster' } | { tipo: 'truncarMaster'; mudancas: Partial<Evento> }

/**
 * "Esta e as próximas" (excluir) — plano puro: a série simplesmente para na
 * data de corte (um dia antes), sem criar continuação nenhuma. Se a data de
 * corte for a própria data do master, exclui a série inteira.
 */
export function planoExcluirApartirDe(master: Evento, dataCorte: string): PlanoExclusaoSerie {
  const rec = master.recorrencia
  if (!rec || dataCorte <= master.data) return { tipo: 'excluirMaster' }
  const diaAnterior = diaAnteriorISO(dataCorte)
  return { tipo: 'truncarMaster', mudancas: { recorrencia: { ...rec, ate: diaAnterior, ocorrencias: undefined } } }
}

/** "Só esta" (excluir) — plano puro: vira exceção no master, sem criar avulso. */
export function planoExcluirSoEsta(master: Evento, dataOcorrencia: string): Partial<Evento> {
  const rec = master.recorrencia
  const excecoes = rec?.excecoes?.includes(dataOcorrencia) ? rec.excecoes : [...(rec?.excecoes ?? []), dataOcorrencia]
  return { recorrencia: { ...(rec as RecorrenciaEvento), excecoes } }
}

/**
 * "Só esta" — move/edita SÓ esta ocorrência da série, criando um evento
 * avulso vinculado por `serieId` e marcando a data original como exceção no
 * master. Usado tanto pelo arrastar (sem perguntar) quanto pela opção
 * "Só esta" do diálogo de editar/excluir.
 */
export async function destacarOcorrencia(master: Evento, dataOcorrencia: string, mudancas: Partial<Evento> = {}): Promise<string> {
  const plano = planoDestacarOcorrencia(master, dataOcorrencia, mudancas)
  if (plano.mudancasMaster) await atualizarEvento(master.id, plano.mudancasMaster)
  return criarEvento(plano.avulso)
}

/** "Esta e as próximas" (editar) — encerra a série antiga e cria um novo
 *  master a partir da data de corte, com os campos alterados aplicados. */
export async function editarSerieApartirDe(master: Evento, dataCorte: string, mudancas: Partial<Evento> = {}): Promise<string> {
  const plano = planoDividirSerie(master, dataCorte, mudancas)
  if (plano.tipo === 'atualizarMaster') {
    await atualizarEvento(master.id, plano.mudancas)
    return master.id
  }
  await atualizarEvento(master.id, plano.mudancasMasterAntigo)
  return criarEvento(plano.novoMaster)
}

/** "Só esta" (excluir) — vira exceção no master; some da agenda, sem avulso. */
export async function excluirSoEstaOcorrencia(master: Evento, dataOcorrencia: string): Promise<void> {
  await atualizarEvento(master.id, planoExcluirSoEsta(master, dataOcorrencia))
}

/** "Esta e as próximas" (excluir) — a série simplesmente para na data de corte. */
export async function excluirApartirDe(master: Evento, dataCorte: string): Promise<void> {
  const plano = planoExcluirApartirDe(master, dataCorte)
  if (plano.tipo === 'excluirMaster') await excluirEvento(master.id)
  else await atualizarEvento(master.id, plano.mudancas)
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
