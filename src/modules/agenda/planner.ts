import { parseISO } from 'date-fns'
import { blocosFixados, corPrioridade } from '../tarefas/db'
import { sugerirBlocos } from '../tarefas/execucao'
import type { BlocoTarefa, Task } from '../tarefas/types'
import { corEfetiva, iconeEvento } from './categorias'
import { expandirEventos, paraMin } from './db'
import type { Contexto, Evento, Presenca } from './types'

/** Janela de exibição do planner (o dia raramente começa às 00h). */
export const JANELA_INI = 6 * 60 // 06:00
export const JANELA_FIM = 24 * 60 // 24:00
export const DUR_PADRAO = 60

/** Um item posicionado no tempo (evento ou bloco de tarefa). */
export interface ItemPlano {
  id: string
  tipo: 'evento' | 'tarefa'
  ref: Evento | Task
  titulo: string
  inicioMin: number
  fimMin: number
  cor: string
  icone: string
  local?: string
  categoriaId?: string
  presenca?: Presenca
  participantes?: string[]
  ehOcorrencia?: boolean
  concluida?: boolean
  /** Só para `tipo === 'evento'`: a data efetiva desta ocorrência (pode ser
   *  diferente de `ref.data` quando é uma ocorrência gerada de uma série). */
  dataOcorrencia?: string
  /** Só para `tipo === 'tarefa'`: o id do `BlocoTarefa` de origem (fixado ou
   *  sugerido) — necessário pra saber o que fixar/mover ao arrastar. */
  blocoId?: string
  /** Só para `tipo === 'tarefa'`: `true` quando é uma sugestão viva do Motor
   *  (`fixado: false`), ainda não confirmada — visual "fantasma". Ausente/
   *  `false` = bloco já fixado. */
  fantasma?: boolean
}

/** Grupo de itens que se sobrepõem — renderizados como cartas empilhadas. */
export interface GrupoSobreposto {
  id: string
  itens: ItemPlano[]
  inicioMin: number
  fimMin: number
}

/** Prazo (horário-limite de tarefa) — só uma linha fina, não ocupa bloco. */
export interface Deadline {
  id: string
  titulo: string
  horarioMin: number
  cor: string
  ref: Task
}

/** Faixa de contexto (sono/trabalho) — fundo suave atrás dos eventos. */
export interface FaixaContexto {
  id: string
  rotulo: string
  icone: string
  inicioMin: number
  fimMin: number
  cor: string
  opacidade: number
}

export interface PlanoDia {
  dia: string
  /** Todos os itens (eventos + blocos fixados + sugestões fantasma) — usado pra renderizar a grade. */
  grupos: GrupoSobreposto[]
  /** Só os itens REAIS (sem fantasma) — usado pra estatísticas/carga (uma sugestão não é ocupação de verdade). */
  gruposReais: GrupoSobreposto[]
  diaInteiro: ItemPlano[]
  deadlines: Deadline[]
  contextos: FaixaContexto[]
  ocupadoMin: number
  nEventos: number
  nTarefas: number
}

function itemDoEvento(e: Evento, dia: string, ehOcorrencia: boolean): ItemPlano {
  const ini = paraMin(e.inicio)
  return {
    id: `ev:${e.id}:${dia}`,
    tipo: 'evento',
    ref: e,
    dataOcorrencia: dia,
    titulo: e.titulo,
    inicioMin: ini,
    fimMin: Math.max(ini + 15, paraMin(e.fim)),
    cor: corEfetiva(e),
    icone: iconeEvento(e),
    local: e.local,
    categoriaId: e.categoria,
    presenca: e.presenca,
    participantes: e.participantes,
    ehOcorrencia,
  }
}

/**
 * Um `ItemPlano` a partir de um bloco FIXADO específico de uma tarefa (uma
 * tarefa dividida em vários blocos — Item 12 do plano — gera um item por
 * bloco fixado naquele dia).
 */
function itemDaTarefa(t: Task, bloco: BlocoTarefa): ItemPlano {
  const ini = paraMin(bloco.inicio!)
  return {
    id: `ta:${t.id}:${bloco.id}`,
    tipo: 'tarefa',
    ref: t,
    titulo: t.titulo,
    inicioMin: ini,
    fimMin: ini + (bloco.duracaoMin ?? DUR_PADRAO),
    cor: corPrioridade(t.prioridade),
    icone: '✓',
    concluida: !!t.concluidaEm,
    blocoId: bloco.id,
    fantasma: false,
  }
}

/**
 * Um `ItemPlano` "fantasma" — sugestão viva do Motor de Planejamento
 * (`sugerirBlocos`, ainda não fixada). Visualmente distinto (ver
 * `EventoCard`), some assim que o Matheus arrasta/fixa ou o dia muda.
 */
function itemDaTarefaFantasma(t: Task, bloco: BlocoTarefa): ItemPlano {
  const ini = paraMin(bloco.inicio!)
  return {
    id: `fant:${t.id}:${bloco.id}`,
    tipo: 'tarefa',
    ref: t,
    titulo: t.titulo,
    inicioMin: ini,
    fimMin: ini + bloco.duracaoMin,
    cor: corPrioridade(t.prioridade),
    icone: '✓',
    concluida: false,
    blocoId: bloco.id,
    fantasma: true,
  }
}

/**
 * Sugestões vivas do Motor de Planejamento (Itens 4/9/11/12) para todas as
 * tarefas pendentes e elegíveis — calculada UMA VEZ pra todo o período
 * visível (não por dia: `sugerirBlocos` já varre vários dias internamente
 * quando precisa). Quem chama filtra por dia ao montar `planoDoDia`.
 *
 * Recalcula automaticamente sempre que `tarefas`/`eventos`/`contextos`/`agora`
 * mudam — quem usa esta função normalmente envolve a chamada num `useMemo`
 * dependente desses dados (já vêm de hooks reativos/Dexie).
 */
export function sugestoesVivas(
  tarefas: Task[],
  eventos: Evento[],
  contextos: Contexto[],
  agora: Date,
): Map<string, BlocoTarefa[]> {
  const mapa = new Map<string, BlocoTarefa[]>()
  for (const t of tarefas) {
    if (t.concluidaEm) continue
    const r = sugerirBlocos(t, { tarefas, eventos, contextos, agora })
    if (Array.isArray(r) && r.length) mapa.set(t.id, r)
  }
  return mapa
}

/** Agrupa itens conectados por sobreposição (para empilhar como cartas). */
function agrupar(itens: ItemPlano[]): GrupoSobreposto[] {
  const ordenados = [...itens].sort((a, b) => a.inicioMin - b.inicioMin || a.fimMin - b.fimMin)
  const grupos: GrupoSobreposto[] = []
  let atual: ItemPlano[] = []
  let fim = -1
  const fechar = () => {
    if (!atual.length) return
    grupos.push({
      id: `g:${atual[0].id}`,
      itens: atual,
      inicioMin: Math.min(...atual.map((i) => i.inicioMin)),
      fimMin: Math.max(...atual.map((i) => i.fimMin)),
    })
    atual = []
    fim = -1
  }
  for (const it of ordenados) {
    if (atual.length && it.inicioMin >= fim) fechar()
    atual.push(it)
    fim = Math.max(fim, it.fimMin)
  }
  fechar()
  return grupos
}

/**
 * Faixas de contexto de um dia, a partir dos contextos editáveis do usuário.
 * Respeita dias da semana e exceções; contextos que cruzam a meia-noite viram
 * duas faixas (0→fim e início→24h).
 */
function faixasDoDia(dia: string, contextos: Contexto[]): FaixaContexto[] {
  const wd = parseISO(dia).getDay()
  const out: FaixaContexto[] = []
  for (const c of contextos) {
    if (c.dias?.length && !c.dias.includes(wd)) continue
    if (c.excecoes?.includes(dia)) continue
    const base = { rotulo: c.nome, icone: c.icone ?? '•', cor: c.cor, opacidade: c.opacidade ?? 0.08 }
    if (c.fimMin > c.inicioMin) {
      out.push({ id: `ctx:${c.id}:${dia}`, inicioMin: c.inicioMin, fimMin: c.fimMin, ...base })
    } else {
      // cruza a meia-noite
      out.push({ id: `ctx:${c.id}a:${dia}`, inicioMin: 0, fimMin: c.fimMin, ...base })
      out.push({ id: `ctx:${c.id}b:${dia}`, inicioMin: c.inicioMin, fimMin: JANELA_FIM, ...base })
    }
  }
  return out
}

export interface OpcoesPlano {
  /** contextos de rotina editáveis (faixas de fundo). */
  contextos?: Contexto[]
  /** sugestões vivas do Motor (ver `sugestoesVivas`) — desenhadas como "fantasma". */
  sugestoes?: Map<string, BlocoTarefa[]>
}

/** Monta o plano de um dia a partir dos eventos e tarefas. */
export function planoDoDia(
  dia: string,
  ocorrencias: ReturnType<typeof expandirEventos>,
  tarefas: Task[],
  opts: OpcoesPlano = {},
): PlanoDia {
  const timados: ItemPlano[] = ocorrencias
    .filter((o) => o.data === dia && !o.evento.diaInteiro)
    .map((o) => itemDoEvento(o.evento, dia, o.ehOcorrencia))

  // Cada tarefa pode ter vários blocos (Item 12) — só os FIXADOS com hora
  // marcada aparecem na grade; um por bloco (uma tarefa dividida gera vários itens).
  const blocosTarefa: ItemPlano[] = tarefas.flatMap((t) =>
    blocosFixados(t)
      .filter((b) => b.data === dia && b.inicio)
      .map((b) => itemDaTarefa(t, b)),
  )

  // Sugestões vivas (fantasmas, Item 4): mesma lógica, mas nunca fixadas —
  // não contam pra ocupação/estatísticas, só aparecem visualmente na grade.
  const blocosFantasma: ItemPlano[] = tarefas.flatMap((t) => {
    const sug = opts.sugestoes?.get(t.id)
    if (!sug) return []
    return sug.filter((b) => b.data === dia && b.inicio).map((b) => itemDaTarefaFantasma(t, b))
  })

  const itensReais = [...timados, ...blocosTarefa]
  const itens = [...itensReais, ...blocosFantasma]

  const diaInteiro: ItemPlano[] = ocorrencias
    .filter((o) => o.data === dia && o.evento.diaInteiro)
    .map((o) => itemDoEvento(o.evento, dia, o.ehOcorrencia))

  const deadlines: Deadline[] = tarefas
    .filter((t) => t.data === dia && t.horario && !blocosFixados(t).some((b) => b.inicio) && !t.concluidaEm)
    .map((t) => ({
      id: `dl:${t.id}`,
      titulo: t.titulo,
      horarioMin: paraMin(t.horario!),
      cor: corPrioridade(t.prioridade),
      ref: t,
    }))

  // Ocupação: união dos intervalos dos eventos (não conta blocos concluídos
  // nem sugestões fantasma — não são compromissos reais ainda).
  const intervalos = itensReais
    .filter((i) => !i.concluida)
    .map((i) => [i.inicioMin, i.fimMin] as [number, number])
  const ocupadoMin = uniaoMinutos(intervalos)

  return {
    dia,
    grupos: agrupar(itens),
    gruposReais: agrupar(itensReais),
    diaInteiro,
    deadlines,
    contextos: faixasDoDia(dia, opts.contextos ?? []),
    ocupadoMin,
    nEventos: timados.length,
    nTarefas: blocosTarefa.length,
  }
}

/** Total de minutos cobertos pela união de intervalos [ini,fim]. */
export function uniaoMinutos(intervalos: [number, number][]): number {
  const ord = [...intervalos].sort((a, b) => a[0] - b[0])
  let total = 0
  let curIni = -1
  let curFim = -1
  for (const [a, b] of ord) {
    if (a > curFim) {
      if (curFim > curIni) total += curFim - curIni
      curIni = a
      curFim = b
    } else {
      curFim = Math.max(curFim, b)
    }
  }
  if (curFim > curIni) total += curFim - curIni
  return total
}

/* ----------------------------- Janela dinâmica ---------------------------- */

/** Faixa de horas exibida: o dia inteiro (00h–24h) em todas as visualizações. */
export function faixaHoras(_planos: PlanoDia[]): { ini: number; fim: number } {
  return { ini: 0, fim: JANELA_FIM }
}

/* ------------------------------- Estatísticas ----------------------------- */

export interface EstatisticasPeriodo {
  totalEventos: number
  totalTarefas: number
  ocupadoMin: number
  livreMin: number
  /** dia (ISO) mais cheio e seus minutos ocupados. */
  diaMaisCheio?: { dia: string; ocupadoMin: number }
  /** maior janela livre encontrada dentro do horário ativo. */
  maiorJanelaLivre?: { dia: string; inicioMin: number; fimMin: number }
}

const ATIVO_INI = 8 * 60
const ATIVO_FIM = 22 * 60

/** Estatísticas agregadas dos 3 dias (horário ativo 08–22 para tempo livre). */
export function estatisticas(planos: PlanoDia[]): EstatisticasPeriodo {
  let totalEventos = 0
  let totalTarefas = 0
  let ocupadoMin = 0
  let diaMaisCheio: { dia: string; ocupadoMin: number } | undefined
  let maiorJanelaLivre: { dia: string; inicioMin: number; fimMin: number } | undefined

  for (const p of planos) {
    totalEventos += p.nEventos
    totalTarefas += p.nTarefas
    ocupadoMin += p.ocupadoMin
    if (!diaMaisCheio || p.ocupadoMin > diaMaisCheio.ocupadoMin) diaMaisCheio = { dia: p.dia, ocupadoMin: p.ocupadoMin }

    // Maior lacuna livre no horário ativo (sugestões fantasma não contam como ocupação).
    const ocup = p.gruposReais.map((g) => [g.inicioMin, g.fimMin] as [number, number]).sort((a, b) => a[0] - b[0])
    let cursor = ATIVO_INI
    for (const [a, b] of ocup) {
      const gapIni = cursor
      const gapFim = Math.min(a, ATIVO_FIM)
      if (gapFim - gapIni >= 30 && (!maiorJanelaLivre || gapFim - gapIni > maiorJanelaLivre.fimMin - maiorJanelaLivre.inicioMin)) {
        maiorJanelaLivre = { dia: p.dia, inicioMin: gapIni, fimMin: gapFim }
      }
      cursor = Math.max(cursor, b)
    }
    if (ATIVO_FIM - cursor >= 30 && (!maiorJanelaLivre || ATIVO_FIM - cursor > maiorJanelaLivre.fimMin - maiorJanelaLivre.inicioMin)) {
      maiorJanelaLivre = { dia: p.dia, inicioMin: cursor, fimMin: ATIVO_FIM }
    }
  }

  const janelaAtiva = (ATIVO_FIM - ATIVO_INI) * planos.length
  const livreMin = Math.max(0, janelaAtiva - ocupadoMin)
  return { totalEventos, totalTarefas, ocupadoMin, livreMin, diaMaisCheio, maiorJanelaLivre }
}

/* --------------------------- Próximo compromisso -------------------------- */

export interface Proximo {
  evento: Evento
  dia: string
  inicioMin: number
  /** minutos até começar (>=0) ou negativo se em andamento. */
  faltamMin: number
  emAndamento: boolean
}

/** Próximo evento a partir de agora (varre alguns dias à frente). */
export function proximoCompromisso(
  eventos: Evento[],
  dias: string[],
  hojeISO: string,
  agoraMin: number,
): Proximo | undefined {
  const ocor = expandirEventos(eventos, dias)
    .filter((o) => !o.evento.diaInteiro)
    .map((o) => ({ o, ini: paraMin(o.evento.inicio), fim: Math.max(paraMin(o.evento.inicio) + 15, paraMin(o.evento.fim)) }))
    .sort((a, b) => (a.o.data < b.o.data ? -1 : a.o.data > b.o.data ? 1 : a.ini - b.ini))

  // Em andamento hoje.
  const emand = ocor.find((x) => x.o.data === hojeISO && x.ini <= agoraMin && agoraMin < x.fim)
  if (emand) {
    return { evento: emand.o.evento, dia: emand.o.data, inicioMin: emand.ini, faltamMin: emand.ini - agoraMin, emAndamento: true }
  }
  // Próximo futuro.
  const fut = ocor.find((x) => x.o.data > hojeISO || (x.o.data === hojeISO && x.ini > agoraMin))
  if (fut) {
    const faltam = fut.o.data === hojeISO ? fut.ini - agoraMin : (parseISO(fut.o.data).getTime() - parseISO(hojeISO).getTime()) / 60000 + fut.ini - agoraMin
    return { evento: fut.o.evento, dia: fut.o.data, inicioMin: fut.ini, faltamMin: Math.round(faltam), emAndamento: false }
  }
  return undefined
}

/* --------------------------- Foco / análise (heurística) ------------------ */

/**
 * Mensagens de foco do período — puramente heurísticas (sem IA), calculadas
 * dos dados. A primeira é o "foco"; as demais, observações.
 */
export function analisePeriodo(planos: PlanoDia[], est: EstatisticasPeriodo, nomesDia: (iso: string) => string): { foco: string; observacoes: string[] } {
  const obs: string[] = []
  const mediaOcup = est.ocupadoMin / Math.max(1, planos.length)

  let foco: string
  if (mediaOcup >= 5 * 60) {
    foco = 'Estes três dias estão cheios de compromissos. Evite começar grandes projetos e proteja suas pausas.'
  } else if (mediaOcup <= 90) {
    foco = 'Os próximos três dias têm bastante tempo livre — bom momento para trabalho profundo.'
  } else {
    foco = 'Um ritmo equilibrado pela frente: há espaço para focar sem se sobrecarregar.'
  }

  if (est.diaMaisCheio && est.diaMaisCheio.ocupadoMin > 0) {
    obs.push(`${nomesDia(est.diaMaisCheio.dia)} é o dia mais cheio desta janela.`)
  }
  if (est.maiorJanelaLivre) {
    const h = Math.floor((est.maiorJanelaLivre.fimMin - est.maiorJanelaLivre.inicioMin) / 60)
    const m = (est.maiorJanelaLivre.fimMin - est.maiorJanelaLivre.inicioMin) % 60
    const dur = h ? `${h}h${m ? String(m).padStart(2, '0') : ''}` : `${m} min`
    obs.push(`${nomesDia(est.maiorJanelaLivre.dia)} tem ${dur} livres entre compromissos.`)
  }
  if (est.totalTarefas > 0) {
    obs.push(`${est.totalTarefas} ${est.totalTarefas === 1 ? 'tarefa agendada' : 'tarefas agendadas'} neste período.`)
  }
  return { foco, observacoes: obs }
}

/* ------------------------------- Carga por hora --------------------------- */

/** Minutos ocupados em cada hora [ini..fim) de um dia — para a linha de carga. */
export function cargaPorHora(plano: PlanoDia, iniH: number, fimH: number): number[] {
  const horas: number[] = []
  const intervalos = plano.gruposReais.map((g) => [g.inicioMin, g.fimMin] as [number, number])
  for (let h = iniH; h < fimH; h++) {
    const a = h * 60
    const b = a + 60
    let ocup = 0
    for (const [x, y] of intervalos) ocup += Math.max(0, Math.min(b, y) - Math.max(a, x))
    horas.push(Math.min(60, ocup))
  }
  return horas
}
