import { eventosDoDia, paraMin } from '../agenda/db'
import type { Evento } from '../agenda/types'
import { estaAtrasada, estaPendente } from './db'
import type { Projeto, Task } from './types'

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

/* ---------------------------- ordenação inteligente ----------------------- */

/**
 * Score de "melhor próximo passo": combina prazo, prioridade, compromisso
 * (bloco reservado hoje) e energia. Tarefas bloqueadas afundam. Heurística —
 * sem IA de verdade, mas transparente.
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
  if (task.blocoData === hoje) s += 45
  if (task.horario) s += 10
  if (task.energia === 'alta') s += 6
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
  const pendentesHoje = raiz.filter((t) => estaPendente(t) && ((t.data && t.data <= hoje) || t.blocoData === hoje))
  const total = concluidasHoje.length + pendentesHoje.length
  const tempoRestanteMin = pendentesHoje.reduce((s, t) => s + (t.duracaoMin ?? DUR_PADRAO), 0)
  return { feitas: concluidasHoje.length, total, tempoRestanteMin }
}

/** Projeto que mais pede atenção hoje (por peso de prioridade das pendentes). */
export function focoDoDia(todas: Task[], projetos: Projeto[], hoje: string): { projeto: Projeto; peso: number } | undefined {
  const peso = new Map<string, number>()
  for (const t of todas) {
    if (!estaPendente(t) || !t.projetoId) continue
    if (t.data && t.data > hoje && t.blocoData !== hoje) continue
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
    if (t.data && !t.data.startsWith(mes) && !t.blocoData?.startsWith(mes)) continue
    if (estaAtrasada(t)) atrasadas++
    else if (t.blocoData) emAndamento++
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
    if (t.blocoData === dia && t.blocoInicio) {
      const i = paraMin(t.blocoInicio)
      ocupados.push({ inicioMin: i, fimMin: i + (t.duracaoMin ?? DUR_PADRAO) })
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
