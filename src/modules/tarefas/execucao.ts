import { addDays, format, parseISO } from 'date-fns'
import { nanoid } from 'nanoid'
import { eventosDoDia, paraHHMM, paraMin } from '../agenda/db'
import type { Contexto, Evento } from '../agenda/types'
import { blocosFixados, estaAtrasada, estaPendente } from './db'
import type { BlocoTarefa, Projeto, Task } from './types'

const ATIVO_INI = 8 * 60
const ATIVO_FIM = 22 * 60
const DUR_PADRAO = 30

/* ------------------------------- dependências ----------------------------- */

/** Uma tarefa está bloqueada se alguma dependência ainda não foi concluída. */
export function tarefaBloqueada(task: Task, todas: Task[]): boolean {
  if (!task.dependeDe?.length) return false
  const porId = new Map(todas.map((t) => [t.id, t]))
  return task.dependeDe.some((id) => {
    const dep = porId.get(id)
    return dep && !dep.concluidaEm
  })
}

/** true se a tarefa tem algum bloco FIXADO (confirmado) naquele dia. */
function temBlocoFixadoNoDia(t: Task, dia: string): boolean {
  return blocosFixados(t).some((b) => b.data === dia)
}

/* ---------------------------- ordenação inteligente ----------------------- */

/**
 * Score de "melhor próximo passo": combina prazo, prioridade e compromisso
 * (bloco reservado hoje). Tarefas bloqueadas afundam. Heurística — sem IA
 * de verdade, mas transparente.
 */
export function scoreInteligente(task: Task, hoje: string, todas: Task[]): number {
  if (tarefaBloqueada(task, todas)) return -1000
  let s = 0
  if (task.data) {
    if (task.data < hoje) s += 120
    else if (task.data === hoje) s += 70
    else {
      const dias = Math.round((new Date(task.data).getTime() - new Date(hoje).getTime()) / 86400000)
      s += Math.max(0, 40 - dias * 6)
    }
  }
  s += (4 - task.prioridade) * 16
  if (temBlocoFixadoNoDia(task, hoje)) s += 45
  if (task.horario) s += 10
  return s
}

export function ordenarInteligente(tasks: Task[], hoje: string, todas: Task[]): Task[] {
  return [...tasks].sort((a, b) => scoreInteligente(b, hoje, todas) - scoreInteligente(a, hoje, todas) || a.prioridade - b.prioridade)
}

/* -------------------------------- indicadores ----------------------------- */

export interface IndicadoresDia {
  feitas: number
  total: number
  tempoRestanteMin: number
}

/** Contagem e tempo do dia. "Total" = planejadas hoje (pendentes de hoje/atrasadas + concluídas hoje). */
export function indicadoresDia(todas: Task[], hoje: string): IndicadoresDia {
  const raiz = todas.filter((t) => !t.paiId)
  const concluidasHoje = raiz.filter((t) => t.concluidaEm && new Date(t.concluidaEm).toISOString().slice(0, 10) === hoje)
  const pendentesHoje = raiz.filter((t) => estaPendente(t) && ((t.data && t.data <= hoje) || temBlocoFixadoNoDia(t, hoje)))
  const total = concluidasHoje.length + pendentesHoje.length
  const tempoRestanteMin = pendentesHoje.reduce((s, t) => s + (t.duracaoMin ?? DUR_PADRAO), 0)
  return { feitas: concluidasHoje.length, total, tempoRestanteMin }
}

/** Projeto que mais pede atenção hoje (por peso de prioridade das pendentes). */
export function focoDoDia(todas: Task[], projetos: Projeto[], hoje: string): { projeto: Projeto; peso: number } | undefined {
  const peso = new Map<string, number>()
  for (const t of todas) {
    if (!estaPendente(t) || !t.projetoId) continue
    if (t.data && t.data > hoje && !temBlocoFixadoNoDia(t, hoje)) continue
    peso.set(t.projetoId, (peso.get(t.projetoId) ?? 0) + (5 - t.prioridade))
  }
  let melhor: { projeto: Projeto; peso: number } | undefined
  for (const [id, p] of peso) {
    const proj = projetos.find((x) => x.id === id)
    if (proj && (!melhor || p > melhor.peso)) melhor = { projeto: proj, peso: p }
  }
  return melhor
}

/** A tarefa de maior prioridade a fazer (uma só). */
export function prioridadeMaxima(todas: Task[], hoje: string): Task | undefined {
  const cand = todas.filter((t) => estaPendente(t) && !t.paiId && !tarefaBloqueada(t, todas))
  return ordenarInteligente(cand, hoje, todas)[0]
}

/* --------------------------------- resumo mês ----------------------------- */

export interface ResumoMes {
  concluidas: number
  emAndamento: number
  atrasadas: number
  naoIniciadas: number
  total: number
}

export function resumoMes(todas: Task[], mes: string): ResumoMes {
  const raiz = todas.filter((t) => !t.paiId)
  let concluidas = 0
  let emAndamento = 0
  let atrasadas = 0
  let naoIniciadas = 0
  for (const t of raiz) {
    if (t.concluidaEm) {
      if (new Date(t.concluidaEm).toISOString().slice(0, 7) === mes) concluidas++
      continue
    }
    // pendente
    const fixados = blocosFixados(t)
    const temBlocoNoMes = fixados.some((b) => b.data!.startsWith(mes))
    if (t.data && !t.data.startsWith(mes) && !temBlocoNoMes) continue
    if (estaAtrasada(t)) atrasadas++
    else if (fixados.length) emAndamento++
    else naoIniciadas++
  }
  const total = concluidas + emAndamento + atrasadas + naoIniciadas
  return { concluidas, emAndamento, atrasadas, naoIniciadas, total }
}

/* ------------------------------ janelas livres ---------------------------- */

export interface Janela {
  inicioMin: number
  fimMin: number
}

/** Espaços livres na agenda de um dia (fora de eventos e blocos de tarefa). */
export function janelasLivres(eventos: Evento[], tarefas: Task[], dia: string): Janela[] {
  const ocupados: Janela[] = []
  for (const e of eventosDoDia(eventos, dia)) {
    if (e.diaInteiro) continue
    ocupados.push({ inicioMin: paraMin(e.inicio), fimMin: Math.max(paraMin(e.inicio) + 15, paraMin(e.fim)) })
  }
  for (const t of tarefas) {
    for (const b of blocosFixados(t)) {
      if (b.data !== dia || !b.inicio) continue
      const i = paraMin(b.inicio)
      ocupados.push({ inicioMin: i, fimMin: i + b.duracaoMin })
    }
  }
  ocupados.sort((a, b) => a.inicioMin - b.inicioMin)
  const livres: Janela[] = []
  let cursor = ATIVO_INI
  for (const o of ocupados) {
    if (o.inicioMin > cursor && o.inicioMin - cursor >= 30) livres.push({ inicioMin: cursor, fimMin: Math.min(o.inicioMin, ATIVO_FIM) })
    cursor = Math.max(cursor, o.fimMin)
  }
  if (ATIVO_FIM - cursor >= 30) livres.push({ inicioMin: cursor, fimMin: ATIVO_FIM })
  return livres.filter((j) => j.fimMin > j.inicioMin)
}

/** Primeira janela livre que comporta a tarefa (para sugerir um bloco). */
export function sugerirBloco(task: Task, janelas: Janela[]): { inicioMin: number } | undefined {
  const dur = task.duracaoMin ?? DUR_PADRAO
  const j = janelas.find((x) => x.fimMin - x.inicioMin >= dur)
  return j ? { inicioMin: j.inicioMin } : undefined
}

/* --------------------------------- insights ------------------------------- */

export interface InsightTarefa {
  id: string
  icone: string
  texto: string
}

function iso(offsetDias: number, base: string): string {
  const d = new Date(`${base}T00:00:00`)
  d.setDate(d.getDate() + offsetDias)
  return d.toISOString().slice(0, 10)
}

/** Insights heurísticos de execução (correlação/tendência, nunca causalidade). */
export function insightsTarefas(args: {
  todas: Task[]
  hoje: string
  eventos: Evento[]
}): InsightTarefa[] {
  const { todas, hoje, eventos } = args
  const out: InsightTarefa[] = []
  const concluidas = todas.filter((t) => t.concluidaEm)

  // 1) Produtividade desta semana vs. anterior.
  const inicioSemana = iso(-7, hoje)
  const inicioAnterior = iso(-14, hoje)
  const nSemana = concluidas.filter((t) => new Date(t.concluidaEm!).toISOString().slice(0, 10) > inicioSemana).length
  const nAnterior = concluidas.filter((t) => {
    const d = new Date(t.concluidaEm!).toISOString().slice(0, 10)
    return d > inicioAnterior && d <= inicioSemana
  }).length
  if (nAnterior > 0) {
    const dif = Math.round(((nSemana - nAnterior) / nAnterior) * 100)
    if (dif >= 10) out.push({ id: 'prod', icone: '📈', texto: `Você está ${dif}% mais produtivo que na semana passada. Continue assim!` })
    else if (dif <= -20) out.push({ id: 'prod', icone: '📉', texto: `Você concluiu ${-dif}% menos tarefas que na semana passada.` })
  }

  // 2) Melhor horário de foco (hora com mais conclusões nos últimos 30 dias).
  const recentes = concluidas.filter((t) => new Date(t.concluidaEm!).toISOString().slice(0, 10) > iso(-30, hoje))
  if (recentes.length >= 5) {
    const antes11 = recentes.filter((t) => new Date(t.concluidaEm!).getHours() < 11).length
    if (antes11 / recentes.length >= 0.5) out.push({ id: 'horario', icone: '🕐', texto: 'Você costuma concluir tarefas importantes antes das 11h.' })
  }

  // 3) Taxa de conclusão do planejado (últimos 30 dias).
  const planejadas = todas.filter((t) => !t.paiId && ((t.data && t.data > iso(-30, hoje) && t.data <= hoje) || (t.concluidaEm && new Date(t.concluidaEm).toISOString().slice(0, 10) > iso(-30, hoje))))
  const feitas = planejadas.filter((t) => t.concluidaEm).length
  if (planejadas.length >= 5) {
    const taxa = Math.round((feitas / planejadas.length) * 100)
    out.push({ id: 'taxa', icone: '✅', texto: `Você conclui em média ${taxa}% das tarefas planejadas.` })
  }

  // 4) Blocos livres amanhã.
  const amanha = iso(1, hoje)
  const livresAmanha = janelasLivres(eventos, todas, amanha).length
  if (livresAmanha > 0) out.push({ id: 'blocos', icone: '🗓️', texto: `Você tem ${livresAmanha} ${livresAmanha === 1 ? 'bloco livre' : 'blocos livres'} para foco amanhã.` })

  return out.slice(0, 4)
}

/* ============================================================================
 * Motor de Planejamento — sugestão de horário viva (Itens 4, 9, 11, 12)
 * ==========================================================================*/

/** Máximo de dias à frente que a busca avança quando a tarefa não tem prazo (`data`). */
const MAX_DIAS_BUSCA_SEM_PRAZO = 60

function normalizarIntervalos(js: Janela[]): Janela[] {
  return [...js].filter((j) => j.fimMin > j.inicioMin).sort((a, b) => a.inicioMin - b.inicioMin)
}

/** Subtrai (remove) os intervalos `ocupados` da lista `base`. */
function subtrairIntervalos(base: Janela[], ocupados: Janela[]): Janela[] {
  let livres = normalizarIntervalos(base)
  for (const o of normalizarIntervalos(ocupados)) {
    const novo: Janela[] = []
    for (const j of livres) {
      if (o.fimMin <= j.inicioMin || o.inicioMin >= j.fimMin) {
        novo.push(j)
        continue
      }
      if (o.inicioMin > j.inicioMin) novo.push({ inicioMin: j.inicioMin, fimMin: Math.min(o.inicioMin, j.fimMin) })
      if (o.fimMin < j.fimMin) novo.push({ inicioMin: Math.max(o.fimMin, j.inicioMin), fimMin: j.fimMin })
    }
    livres = novo.filter((x) => x.fimMin > x.inicioMin)
  }
  return livres
}

/** Interseção entre duas listas de intervalos. */
function intersectarIntervalos(a: Janela[], b: Janela[]): Janela[] {
  const out: Janela[] = []
  for (const x of normalizarIntervalos(a)) {
    for (const y of normalizarIntervalos(b)) {
      const ini = Math.max(x.inicioMin, y.inicioMin)
      const fim = Math.min(x.fimMin, y.fimMin)
      if (fim > ini) out.push({ inicioMin: ini, fimMin: fim })
    }
  }
  return normalizarIntervalos(out)
}

/**
 * Faixas [inicioMin,fimMin) de UM Contexto num dia específico — respeita
 * `dias`/`excecoes` e cruzamento de meia-noite (mesma regra de
 * `agenda/planner.ts:faixasDoDia`, reimplementada aqui pra o Motor ficar puro
 * e não depender do módulo de renderização da Agenda).
 */
function faixasContextoNoDia(c: Contexto, dia: string): Janela[] {
  const wd = parseISO(dia).getDay()
  if (c.dias?.length && !c.dias.includes(wd)) return []
  if (c.excecoes?.includes(dia)) return []
  if (c.fimMin > c.inicioMin) return [{ inicioMin: c.inicioMin, fimMin: c.fimMin }]
  if (c.fimMin === c.inicioMin) return []
  // cruza a meia-noite
  return [
    { inicioMin: 0, fimMin: c.fimMin },
    { inicioMin: c.inicioMin, fimMin: 1440 },
  ]
}

/**
 * Janelas permitidas por contexto num dia (Item 9): se `contextoId` existe,
 * só as faixas daquele Contexto; se ausente ("Casa"), o dia inteiro MENOS
 * todas as faixas de todos os Contextos (o "resto do dia" sem rótulo — ex.:
 * nunca inclui o horário de um contexto "Sono").
 */
function janelasDoContextoNoDia(dia: string, contextos: Contexto[], contextoId: string | undefined): Janela[] {
  if (contextoId) {
    const c = contextos.find((x) => x.id === contextoId)
    // Contexto referenciado não existe mais (ex.: apagado na Agenda) — sem
    // faixa própria pra respeitar, não há como restringir: não bloqueia.
    if (!c) return [{ inicioMin: 0, fimMin: 1440 }]
    return faixasContextoNoDia(c, dia)
  }
  const deContextos = contextos.flatMap((c) => faixasContextoNoDia(c, dia))
  return subtrairIntervalos([{ inicioMin: 0, fimMin: 1440 }], deContextos)
}

type DiaMin = { dia: string; min: number }

/** O instante mais tardio entre vários pares {dia,min} (comparação lexicográfica de `dia`, depois `min`). */
function maisTarde(...xs: DiaMin[]): DiaMin {
  return xs.reduce((m, x) => (x.dia > m.dia || (x.dia === m.dia && x.min > m.min) ? x : m))
}

/** Fim (dia+min-do-dia) do bloco fixado mais tardio de uma tarefa, ou `undefined` se não tem nenhum com hora marcada. */
function fimDoBlocoFixadoMaisTardio(t: Task): DiaMin | undefined {
  let melhor: DiaMin | undefined
  for (const b of blocosFixados(t)) {
    if (!b.inicio) continue
    const fimMinTotal = paraMin(b.inicio) + b.duracaoMin
    const diasExtra = Math.floor(fimMinTotal / 1440)
    const dia = diasExtra > 0 ? format(addDays(parseISO(b.data!), diasExtra), 'yyyy-MM-dd') : b.data!
    const cand: DiaMin = { dia, min: fimMinTotal % 1440 }
    if (!melhor || maisTarde(melhor, cand) === cand) melhor = cand
  }
  return melhor
}

/**
 * Tenta encaixar `duracao` minutos numa única janela, varrendo os dias de
 * `janelasPorDia` em ordem cronológica. Retorna a primeira que couber.
 */
function primeiraJanelaQueCabe(
  janelasPorDia: { dia: string; janelas: Janela[] }[],
  duracao: number,
): { dia: string; inicioMin: number } | undefined {
  for (const { dia, janelas } of janelasPorDia) {
    const j = janelas.find((x) => x.fimMin - x.inicioMin >= duracao)
    if (j) return { dia, inicioMin: j.inicioMin }
  }
  return undefined
}

/**
 * Divide `restante` minutos em pedaços ≥ `minPedaco`, preenchendo o máximo
 * possível de cada janela disponível (a maior primeira, em ordem
 * cronológica) — "menos pedaços possível" depois de já ter tentado um bloco
 * único. Retorna `null` se não conseguir alocar tudo (alguma sobra ficaria
 * menor que `minPedaco`, ou as janelas disponíveis acabaram).
 */
function dividirEmBlocos(
  janelasPorDia: { dia: string; janelas: Janela[] }[],
  restanteInicial: number,
  minPedaco: number,
): { dia: string; inicioMin: number; duracaoMin: number }[] | null {
  const pedacos: { dia: string; inicioMin: number; duracaoMin: number }[] = []
  let restante = restanteInicial
  for (const { dia, janelas } of janelasPorDia) {
    for (const j of janelas) {
      if (restante <= 0) break
      const cap = j.fimMin - j.inicioMin
      if (cap < minPedaco) continue
      const pedaco = Math.min(cap, restante)
      if (pedaco < minPedaco) continue // sobra final menor que o mínimo cabe nesta janela — tenta a próxima
      pedacos.push({ dia, inicioMin: j.inicioMin, duracaoMin: pedaco })
      restante -= pedaco
    }
    if (restante <= 0) break
  }
  return restante <= 0 ? pedacos : null
}

export interface ParamsSugestao {
  tarefas: Task[]
  eventos: Evento[]
  contextos: Contexto[]
  /** Instante atual — passado como parâmetro (nunca `Date.now()` interno) pra a função ser pura/testável. */
  agora: Date
}

/**
 * O Motor de Planejamento: sugere onde encaixar o tempo que falta de uma
 * tarefa (`task.duracaoMin` menos o que já está em bloco(s) fixado(s)),
 * respeitando contexto (Item 9), dependências (Item 11) e prazo, tentando
 * primeiro um único bloco e só dividindo em vários se precisar (Item 12).
 *
 * Retorna:
 * - `null` — sem gatilho pra sugerir (falta `duracaoMin`, já está toda
 *   coberta por bloco(s) fixado(s), ou está esperando uma dependência não
 *   concluída).
 * - `'sem-horario-possivel'` — tem gatilho, mas não há espaço válido antes
 *   do prazo (ou antes do fim da dependência, ou dentro do dia já fixado).
 * - `BlocoTarefa[]` — a sugestão viva (sempre `fixado: false`); NÃO é
 *   persistida por esta função — quem chama decide o que fazer com ela (ex.:
 *   desenhar como "fantasma" na Agenda, ou `fixarBlocoTarefa` se o Matheus
 *   arrastar/confirmar).
 *
 * Pura: só olha os parâmetros recebidos, nunca lê o relógio/banco direto —
 * chamável tanto por testes quanto pela Agenda.
 */
export function sugerirBlocos(task: Task, params: ParamsSugestao): BlocoTarefa[] | 'sem-horario-possivel' | null {
  const { tarefas, eventos, contextos, agora } = params
  if (task.duracaoMin == null) return null

  // Dependências incompletas: sem sugestão nenhuma (Item 11).
  const porId = new Map(tarefas.map((t) => [t.id, t]))
  const deps = (task.dependeDe ?? []).map((id) => porId.get(id)).filter((t): t is Task => !!t)
  if (deps.some((d) => !d.concluidaEm)) return null

  // Já coberta por bloco(s) fixado(s) com hora marcada? nada a sugerir.
  const somaResolvida = blocosFixados(task)
    .filter((b) => !!b.inicio)
    .reduce((s, b) => s + b.duracaoMin, 0)
  const restante = task.duracaoMin - somaResolvida
  if (restante <= 0) return null

  // Gatilho: precisa de uma "indicação de quando fazer".
  const semente = (task.blocos ?? []).find((b) => !!b.data && (!b.fixado || !b.inicio))
  const semBlocoAlgum = !task.blocos?.length
  if (!semente && !semBlocoAlgum) return null

  const hojeStr = format(agora, 'yyyy-MM-dd')
  const agoraMin = agora.getHours() * 60 + agora.getMinutes()
  const pastCutoff: DiaMin = { dia: hojeStr, min: agoraMin }

  // Início mais cedo permitido pelas dependências (fim do bloco fixado mais
  // tardio de cada uma; concluída sem bloco = sem restrição de horário).
  const depCutoffs = deps.map(fimDoBlocoFixadoMaisTardio).filter((x): x is DiaMin => !!x)
  const cursorMinimo = depCutoffs.length ? maisTarde(pastCutoff, ...depCutoffs) : pastCutoff

  // Dia(s) de busca: se o Matheus já FIXOU o dia (só falta a hora), a busca
  // fica restrita a esse dia só — não empurra pra outro dia por conta própria.
  const diaFixadoPeloMatheus = semente?.fixado ? semente.data! : undefined

  let diaIni: string
  let diaFim: string
  if (diaFixadoPeloMatheus) {
    if (cursorMinimo.dia > diaFixadoPeloMatheus) return 'sem-horario-possivel'
    diaIni = diaFixadoPeloMatheus
    diaFim = diaFixadoPeloMatheus
  } else {
    diaIni = maisTarde(cursorMinimo, { dia: semente?.data ?? hojeStr, min: 0 }).dia
    diaFim = task.data ?? format(addDays(parseISO(diaIni), MAX_DIAS_BUSCA_SEM_PRAZO), 'yyyy-MM-dd')
    if (diaIni > diaFim) return 'sem-horario-possivel'
  }

  // Monta a lista de dias candidatos, cada um já filtrado por
  // ocupação (eventos + blocos fixados de qualquer tarefa) e por contexto.
  const janelasPorDia: { dia: string; janelas: Janela[] }[] = []
  let cursor = parseISO(diaIni)
  const limite = parseISO(diaFim)
  while (cursor.getTime() <= limite.getTime()) {
    const dia = format(cursor, 'yyyy-MM-dd')
    const baseDoDia: Janela =
      dia === cursorMinimo.dia ? { inicioMin: cursorMinimo.min, fimMin: 1440 } : { inicioMin: 0, fimMin: 1440 }

    const ocupados: Janela[] = []
    for (const e of eventosDoDia(eventos, dia)) {
      if (e.diaInteiro) continue
      ocupados.push({ inicioMin: paraMin(e.inicio), fimMin: Math.max(paraMin(e.inicio) + 15, paraMin(e.fim)) })
    }
    for (const t of tarefas) {
      for (const b of blocosFixados(t)) {
        if (b.data !== dia || !b.inicio) continue
        const i = paraMin(b.inicio)
        ocupados.push({ inicioMin: i, fimMin: i + b.duracaoMin })
      }
    }
    const livre = subtrairIntervalos([baseDoDia], ocupados)
    const doContexto = janelasDoContextoNoDia(dia, contextos, task.contextoId)
    janelasPorDia.push({ dia, janelas: intersectarIntervalos(livre, doContexto) })

    cursor = addDays(cursor, 1)
  }

  // 1) Tenta a duração inteira num único bloco (menos pedaços possível).
  const unico = primeiraJanelaQueCabe(janelasPorDia, restante)
  if (unico) {
    return [{ id: nanoid(), data: unico.dia, inicio: paraHHMM(unico.inicioMin), duracaoMin: restante, fixado: false }]
  }

  // 2) Não coube inteira: divide, respeitando o tamanho mínimo do pedaço.
  // Padrão (sem `duracaoMinBloco` customizado) = a duração cheia da tarefa —
  // ou seja, NÃO divide automaticamente, a menos que o Matheus tenha baixado
  // esse mínimo (Item 12).
  const minPedaco = task.duracaoMinBloco ?? task.duracaoMin
  const pedacos = dividirEmBlocos(janelasPorDia, restante, minPedaco)
  if (!pedacos) return 'sem-horario-possivel'
  return pedacos.map((p) => ({
    id: nanoid(),
    data: p.dia,
    inicio: paraHHMM(p.inicioMin),
    duracaoMin: p.duracaoMin,
    fixado: false,
  }))
}
