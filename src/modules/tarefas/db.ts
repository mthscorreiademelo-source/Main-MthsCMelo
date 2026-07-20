import { addDays, addMonths, addWeeks, addYears, format, getDay, parseISO } from 'date-fns'
import { nanoid } from 'nanoid'
import { db } from '../../core/db/db'
import { hojeISO } from '../../core/dates'
import type { NivelEnergia, Prioridade, Projeto, Recorrencia, Task } from './types'

/* ---------- energia & contexto ---------- */

export interface InfoEnergia {
  valor: NivelEnergia
  rotulo: string
  cor: string
  icone: string
}

export const ENERGIAS: InfoEnergia[] = [
  { valor: 'alta', rotulo: 'Alta', cor: '#d1453b', icone: '🔥' },
  { valor: 'media', rotulo: 'Média', cor: '#eb8909', icone: '⚡' },
  { valor: 'baixa', rotulo: 'Baixa', cor: '#299438', icone: '🍃' },
]

export function infoEnergia(e: NivelEnergia | undefined): InfoEnergia | undefined {
  return e ? ENERGIAS.find((x) => x.valor === e) : undefined
}

/** Contextos sugeridos (o campo é livre — o usuário pode digitar outros). */
export const CONTEXTOS = ['Casa', 'Trabalho', 'Computador', 'Celular', 'Rua', 'Mercado', 'Faculdade']

/* ---------- prioridades ---------- */

export interface InfoPrioridade {
  valor: Prioridade
  rotulo: string
  cor: string
}

export const PRIORIDADES: InfoPrioridade[] = [
  { valor: 1, rotulo: 'Prioridade 1', cor: '#d1453b' },
  { valor: 2, rotulo: 'Prioridade 2', cor: '#eb8909' },
  { valor: 3, rotulo: 'Prioridade 3', cor: '#246fe0' },
  { valor: 4, rotulo: 'Prioridade 4', cor: 'var(--vida-muted)' },
]

export function corPrioridade(p: Prioridade | undefined): string {
  return PRIORIDADES.find((x) => x.valor === (p ?? 4))?.cor ?? 'var(--vida-muted)'
}

/* ---------- paleta de projetos ---------- */

export const CORES_PROJETO = [
  '#d1453b',
  '#eb8909',
  '#f9c000',
  '#7ecc49',
  '#299438',
  '#6accbc',
  '#4073ff',
  '#884dff',
  '#eb96eb',
  '#808080',
]

/* ---------- interpretação do quick-add ---------- */

const PALAVRAS_DIA: Record<string, number> = {
  domingo: 0, dom: 0,
  segunda: 1, seg: 1,
  terca: 2, ['terça']: 2, ter: 2,
  quarta: 3, qua: 3,
  quinta: 4, qui: 4,
  sexta: 5, sex: 5,
  sabado: 6, ['sábado']: 6, sab: 6,
}

/** Próxima data (>= amanhã) cujo dia-da-semana bate. */
function proximoDiaSemana(alvo: number): string {
  let d = addDays(parseISO(hojeISO()), 1)
  for (let i = 0; i < 7; i++) {
    if (getDay(d) === alvo) break
    d = addDays(d, 1)
  }
  return format(d, 'yyyy-MM-dd')
}

export interface Interpretado {
  titulo: string
  data?: string
  prioridade?: Prioridade
  projetoId?: string
}

/**
 * Lê tokens no estilo Todoist do texto do quick-add e devolve os campos
 * separados do título limpo: `p1..p4`, `hoje`/`amanhã`/dias da semana e
 * `#Projeto` (casa pelo nome, sem acento/caixa).
 */
export function interpretarEntrada(texto: string, projetos: Projeto[]): Interpretado {
  let titulo = texto
  let data: string | undefined
  let prioridade: Prioridade | undefined
  let projetoId: string | undefined

  const semAcento = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

  // #Projeto (nome pode ter espaços? mantemos simples: uma palavra)
  const mProj = titulo.match(/(?:^|\s)#([\p{L}\p{N}_-]+)/u)
  if (mProj) {
    const alvo = semAcento(mProj[1])
    const p = projetos.find((x) => semAcento(x.nome).replace(/\s+/g, '') === alvo || semAcento(x.nome) === alvo)
    if (p) {
      projetoId = p.id
      titulo = titulo.replace(mProj[0], ' ')
    }
  }

  // p1..p4
  const mPri = titulo.match(/(?:^|\s)!?p([1-4])\b/i)
  if (mPri) {
    prioridade = Number(mPri[1]) as Prioridade
    titulo = titulo.replace(mPri[0], ' ')
  }

  // datas naturais
  const tokens = titulo.split(/\s+/)
  for (const tok of tokens) {
    const t = semAcento(tok)
    if (t === 'hoje') { data = hojeISO(); titulo = titulo.replace(tok, ' '); break }
    if (t === 'amanha') { data = format(addDays(parseISO(hojeISO()), 1), 'yyyy-MM-dd'); titulo = titulo.replace(tok, ' '); break }
    if (t in PALAVRAS_DIA) { data = proximoDiaSemana(PALAVRAS_DIA[t]); titulo = titulo.replace(tok, ' '); break }
  }

  return { titulo: titulo.replace(/\s+/g, ' ').trim(), data, prioridade, projetoId }
}

/* ---------- CRUD de tarefas ---------- */

export interface DadosTarefa {
  titulo: string
  descricao?: string
  data?: string
  horario?: string
  prioridade?: Prioridade
  projetoId?: string
  paiId?: string
  labels?: string[]
  recorrencia?: Recorrencia
}

export async function criarTarefa(dados: DadosTarefa | string, dataLegado?: string): Promise<string | undefined> {
  const d: DadosTarefa = typeof dados === 'string' ? { titulo: dados, data: dataLegado } : dados
  const texto = d.titulo.trim()
  if (!texto) return
  const agora = Date.now()
  const id = nanoid()
  await db.tasks.add({
    id,
    titulo: texto,
    descricao: d.descricao?.trim() || undefined,
    data: d.data,
    horario: d.horario,
    prioridade: d.prioridade ?? 4,
    projetoId: d.projetoId,
    paiId: d.paiId,
    labels: d.labels?.length ? d.labels : undefined,
    recorrencia: d.recorrencia,
    criadaEm: agora,
    ordem: agora,
  })
  return id
}

export async function atualizarTarefa(id: string, mudancas: Partial<Task>) {
  await db.tasks.update(id, mudancas)
}

/** Próxima ocorrência de uma recorrência a partir de uma data-base. */
export function proximaData(base: string, rec: Recorrencia): string {
  const d = parseISO(base)
  const n = Math.max(1, rec.intervalo ?? 1)
  switch (rec.tipo) {
    case 'diaria':
      return format(addDays(d, n), 'yyyy-MM-dd')
    case 'semanal': {
      if (rec.dias?.length) {
        // próximo dia da semana marcado, depois de `base`
        for (let i = 1; i <= 7 * n; i++) {
          const c = addDays(d, i)
          if (rec.dias.includes(getDay(c))) return format(c, 'yyyy-MM-dd')
        }
      }
      return format(addWeeks(d, n), 'yyyy-MM-dd')
    }
    case 'mensal':
      return format(addMonths(d, n), 'yyyy-MM-dd')
    case 'anual':
      return format(addYears(d, n), 'yyyy-MM-dd')
    default:
      return format(addDays(d, n), 'yyyy-MM-dd')
  }
}

/**
 * Alterna conclusão. Se a tarefa é recorrente e está sendo concluída, em vez de
 * finalizar, avança a data para a próxima ocorrência (comportamento Todoist).
 */
export async function alternarConclusao(task: Task) {
  if (!task.concluidaEm && task.recorrencia) {
    const base = task.data ?? hojeISO()
    await db.tasks.update(task.id, { data: proximaData(base, task.recorrencia) })
    return
  }
  await db.tasks.update(task.id, {
    concluidaEm: task.concluidaEm ? undefined : Date.now(),
  })
}

/** Exclui a tarefa e todas as subtarefas descendentes. */
export async function excluirTarefa(id: string) {
  const todas = await db.tasks.toArray()
  const paraExcluir = new Set<string>([id])
  let cresceu = true
  while (cresceu) {
    cresceu = false
    for (const t of todas) {
      if (t.paiId && paraExcluir.has(t.paiId) && !paraExcluir.has(t.id)) {
        paraExcluir.add(t.id)
        cresceu = true
      }
    }
  }
  await db.tasks.bulkDelete([...paraExcluir])
}

/* ---------- CRUD de projetos ---------- */

export async function criarProjeto(dados: Partial<Projeto> & { nome: string }): Promise<string> {
  const agora = Date.now()
  const max = await db.projetos.orderBy('ordem').last()
  const id = dados.id ?? nanoid()
  await db.projetos.add({
    id,
    nome: dados.nome.trim(),
    cor: dados.cor ?? CORES_PROJETO[6],
    favorito: dados.favorito,
    ordem: dados.ordem ?? (max?.ordem ?? 0) + 1,
    criadoEm: agora,
  })
  return id
}

export async function atualizarProjeto(id: string, mudancas: Partial<Projeto>) {
  await db.projetos.update(id, mudancas)
}

/** Exclui o projeto e move suas tarefas para a Entrada (sem projeto). */
export async function excluirProjeto(id: string) {
  await db.transaction('rw', db.projetos, db.tasks, async () => {
    await db.tasks.where('projetoId').equals(id).modify({ projetoId: undefined })
    await db.projetos.delete(id)
  })
}

/* ---------- seleção e ordenação ---------- */

export function estaPendente(t: Task) {
  return !t.concluidaEm
}

export function estaAtrasada(t: Task) {
  return estaPendente(t) && !!t.data && t.data < hojeISO()
}

/** Ordena por prioridade (P1 primeiro), depois data, depois ordem manual. */
export function ordenar(tarefas: Task[]): Task[] {
  return [...tarefas].sort((a, b) => {
    if (a.prioridade !== b.prioridade) return a.prioridade - b.prioridade
    const da = a.data ?? '9999-99-99'
    const dbb = b.data ?? '9999-99-99'
    if (da !== dbb) return da < dbb ? -1 : 1
    return a.ordem - b.ordem
  })
}

/** Ordem manual (para listas reordenáveis: Entrada e Projeto). */
export function ordenarManual(tarefas: Task[]): Task[] {
  return [...tarefas].sort((a, b) => a.ordem - b.ordem)
}

/** Só data primeiro (para as visões por data), depois prioridade. */
export function ordenarPorData(tarefas: Task[]): Task[] {
  return [...tarefas].sort((a, b) => {
    const da = a.data ?? '9999-99-99'
    const dbb = b.data ?? '9999-99-99'
    if (da !== dbb) return da < dbb ? -1 : 1
    if (a.prioridade !== b.prioridade) return a.prioridade - b.prioridade
    return a.ordem - b.ordem
  })
}

/** Subtarefas diretas de uma tarefa, ordenadas. */
export function subtarefas(tarefas: Task[], paiId: string): Task[] {
  return ordenar(tarefas.filter((t) => t.paiId === paiId))
}

export function contarSubtarefas(tarefas: Task[], paiId: string): { total: number; feitas: number } {
  const filhas = tarefas.filter((t) => t.paiId === paiId)
  return { total: filhas.length, feitas: filhas.filter((t) => !estaPendente(t)).length }
}

/* Visões (todas consideram só pendentes, exceto Concluídas) */

export function filtrarHoje(tarefas: Task[]): Task[] {
  const hoje = hojeISO()
  return ordenarPorData(tarefas.filter((t) => estaPendente(t) && !!t.data && t.data <= hoje))
}

export function filtrarProximas(tarefas: Task[]): Task[] {
  const hoje = hojeISO()
  return ordenarPorData(tarefas.filter((t) => estaPendente(t) && !!t.data && t.data > hoje))
}

/** Entrada: pendentes sem projeto. Ordem manual (arrastável). */
export function filtrarEntrada(tarefas: Task[]): Task[] {
  return ordenarManual(tarefas.filter((t) => estaPendente(t) && !t.projetoId && !t.paiId))
}

/** Raízes pendentes de um projeto. Ordem manual (arrastável). */
export function filtrarProjeto(tarefas: Task[], projetoId: string): Task[] {
  return ordenarManual(tarefas.filter((t) => estaPendente(t) && t.projetoId === projetoId && !t.paiId))
}

export function filtrarConcluidas(tarefas: Task[]): Task[] {
  return tarefas
    .filter((t) => !estaPendente(t))
    .sort((a, b) => (b.concluidaEm ?? 0) - (a.concluidaEm ?? 0))
}

export function concluidasHoje(tarefas: Task[]): Task[] {
  const inicioDoDia = new Date()
  inicioDoDia.setHours(0, 0, 0, 0)
  return filtrarConcluidas(tarefas).filter((t) => (t.concluidaEm ?? 0) >= inicioDoDia.getTime())
}

/* ---------- etiquetas, busca e filtros ---------- */

/** Todas as etiquetas em uso (pendentes) com contagem, ordenadas por nome. */
export function todasLabels(tarefas: Task[]): { label: string; qtd: number }[] {
  const mapa = new Map<string, number>()
  for (const t of tarefas) {
    if (!estaPendente(t)) continue
    for (const l of t.labels ?? []) mapa.set(l, (mapa.get(l) ?? 0) + 1)
  }
  return [...mapa.entries()]
    .map(([label, qtd]) => ({ label, qtd }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

/** Pendentes (raízes) com determinada etiqueta. */
export function filtrarLabel(tarefas: Task[], label: string): Task[] {
  return ordenar(tarefas.filter((t) => estaPendente(t) && (t.labels ?? []).includes(label) && !t.paiId))
}

/** Pendentes (raízes) de uma prioridade. */
export function filtrarPrioridade(tarefas: Task[], p: Prioridade): Task[] {
  return ordenar(tarefas.filter((t) => estaPendente(t) && t.prioridade === p && !t.paiId))
}

const semAcentoLower = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Busca por título, descrição e etiquetas (pendentes e concluídas). */
export function buscar(tarefas: Task[], termo: string): Task[] {
  const q = semAcentoLower(termo.trim())
  if (!q) return []
  return tarefas
    .filter((t) => {
      const alvo = semAcentoLower(
        `${t.titulo} ${t.descricao ?? ''} ${(t.labels ?? []).join(' ')}`,
      )
      return alvo.includes(q)
    })
    .sort((a, b) => Number(estaPendente(b)) - Number(estaPendente(a)))
    .slice(0, 50)
}

/* ---------- reordenar e reagendar ---------- */

/** Persiste a nova ordem manual (índice = ordem). */
export async function reordenar(ids: string[]): Promise<void> {
  await db.transaction('rw', db.tasks, async () => {
    for (let i = 0; i < ids.length; i++) {
      await db.tasks.update(ids[i], { ordem: i })
    }
  })
}

/** Datas rápidas para o "planejar". */
export function dataRelativa(quando: 'hoje' | 'amanha' | 'fim_semana' | 'prox_semana'): string {
  const base = parseISO(hojeISO())
  switch (quando) {
    case 'hoje':
      return hojeISO()
    case 'amanha':
      return format(addDays(base, 1), 'yyyy-MM-dd')
    case 'fim_semana': {
      // próximo sábado (ou hoje se já for sábado)
      let d = base
      for (let i = 0; i < 7; i++) {
        if (getDay(d) === 6) break
        d = addDays(d, 1)
      }
      return format(d, 'yyyy-MM-dd')
    }
    case 'prox_semana': {
      // próxima segunda-feira
      let d = addDays(base, 1)
      for (let i = 0; i < 7; i++) {
        if (getDay(d) === 1) break
        d = addDays(d, 1)
      }
      return format(d, 'yyyy-MM-dd')
    }
  }
}

export async function reagendar(id: string, data: string | undefined) {
  await atualizarTarefa(id, { data })
}
