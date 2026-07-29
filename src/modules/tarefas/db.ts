import { addDays, addMonths, addWeeks, addYears, format, getDay, parseISO } from 'date-fns'
import { nanoid } from 'nanoid'
import { db } from '../../core/db/db'
import { hojeISO } from '../../core/dates'
import type { Contexto } from '../agenda/types'
import type { BlocoTarefa, Prioridade, Projeto, Recorrencia, Task } from './types'

/** Duração padrão (min) quando a tarefa não informa `duracaoMin` (usada só na migração de blocos). */
const DUR_PADRAO_MIGRACAO = 30

/* ---------- contexto ---------- */

const CHAVE_MIGRACAO_CONTEXTO = 'lume:tarefas:contexto-migrado'

function jaMigrouContexto(): boolean {
  return typeof localStorage !== 'undefined' && localStorage.getItem(CHAVE_MIGRACAO_CONTEXTO) === '1'
}

function marcarContextoMigrado(): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(CHAVE_MIGRACAO_CONTEXTO, '1')
}

/**
 * Migração única (rodar 1x no carregamento do módulo): tarefas antigas tinham
 * `contexto` (texto livre, ex.: "Trabalho"). Agora usam `contextoId`,
 * referenciando um Contexto real da Agenda. Casa o texto antigo pelo NOME de
 * um Contexto existente (sem acento/caixa); se não bater com nenhum, a tarefa
 * fica sem contexto (= Casa, horário livre). Idempotente: marca uma chave no
 * `localStorage` pra nunca reprocessar.
 */
export async function migrarContextosTarefas(contextosAgenda: Contexto[]): Promise<void> {
  if (jaMigrouContexto()) return
  marcarContextoMigrado()
  const todas = await db.tasks.toArray()
  for (const t of todas) {
    if (t.contextoId != null) continue
    const legado = (t as unknown as { contexto?: string }).contexto
    if (!legado) continue
    const alvo = semAcentoLower(legado)
    const achado = contextosAgenda.find((c) => semAcentoLower(c.nome) === alvo)
    if (achado) await db.tasks.update(t.id, { contextoId: achado.id })
  }
}

/* ---------- blocos ---------- */

const CHAVE_MIGRACAO_BLOCOS = 'lume:tarefas:blocos-migrados'

function jaMigrouBlocos(): boolean {
  return typeof localStorage !== 'undefined' && localStorage.getItem(CHAVE_MIGRACAO_BLOCOS) === '1'
}

function marcarBlocosMigrados(): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(CHAVE_MIGRACAO_BLOCOS, '1')
}

/**
 * Migração única (idempotente, mesmo padrão de `migrarContextosTarefas`):
 * tarefas antigas tinham bloco único `blocoData`/`blocoInicio`. Agora usam
 * uma lista `blocos: BlocoTarefa[]`. Toda tarefa com um desses campos legados
 * preenchidos vira um único item em `blocos`, já `fixado: true` (já era uma
 * decisão manual do Matheus). Marca uma chave no `localStorage` pra nunca
 * reprocessar.
 */
export async function migrarBlocosTarefas(): Promise<void> {
  if (jaMigrouBlocos()) return
  marcarBlocosMigrados()
  const todas = await db.tasks.toArray()
  for (const t of todas) {
    if (t.blocos?.length) continue
    const legado = t as unknown as { blocoData?: string; blocoInicio?: string }
    if (!legado.blocoData && !legado.blocoInicio) continue
    const bloco: BlocoTarefa = {
      id: nanoid(),
      data: legado.blocoData,
      inicio: legado.blocoInicio,
      duracaoMin: t.duracaoMin ?? DUR_PADRAO_MIGRACAO,
      fixado: true,
    }
    await db.tasks.update(t.id, { blocos: [bloco] })
  }
}

/** Blocos fixados (confirmados pelo Matheus) de uma tarefa, com `data` definida. */
export function blocosFixados(t: Task): BlocoTarefa[] {
  return (t.blocos ?? []).filter((b) => b.fixado && !!b.data)
}

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
  /**
   * Dia planejado (ISO), independente do prazo — atalho de criação: vira um
   * único `BlocoTarefa` já `fixado: true` (dia escolhido manualmente/herdado
   * de um filtro; hora ainda fica em aberto, o Motor sugere depois).
   */
  blocoData?: string
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
    blocos: d.blocoData
      ? [{ id: nanoid(), data: d.blocoData, duracaoMin: DUR_PADRAO_MIGRACAO, fixado: true }]
      : undefined,
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

/** IDs de todas as tarefas de um projeto, incluindo subtarefas descendentes. */
export async function idsTarefasDoProjeto(projetoId: string): Promise<string[]> {
  const todas = await db.tasks.toArray()
  const paraExcluir = new Set<string>()
  for (const t of todas) if (t.projetoId === projetoId) paraExcluir.add(t.id)
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
  return [...paraExcluir]
}

/** Exclui o projeto e TODAS as tarefas dele (incluindo subtarefas). */
export async function excluirProjeto(id: string) {
  await db.transaction('rw', db.projetos, db.tasks, async () => {
    await db.tasks.bulkDelete(await idsTarefasDoProjeto(id))
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

/**
 * Dia "efetivo" de uma tarefa, pra classificar/agrupar (Próximas/Calendário):
 * a data do bloco FIXADO mais próximo/cedo quando existir 1+ blocos fixados,
 * senão o prazo (`data`). Só blocos com `fixado: true` contam — uma sugestão
 * viva (ainda recalculando) nunca entra aqui, só aparece na Agenda como
 * "fantasma". Duas datas distintas — ver Item 4 do plano.
 */
export function diaEfetivo(t: Task): string | undefined {
  const datas = blocosFixados(t)
    .map((b) => b.data!)
    .sort()
  return datas[0] ?? t.data
}

/**
 * Hoje = QUALQUER bloco fixado com `data` = hoje (mesmo que outros blocos da
 * mesma tarefa dividida estejam em outros dias), OU — sem nenhum bloco
 * fixado — o prazo (`data`) é hoje. Nunca conta se já está atrasada ou
 * concluída.
 */
export function ehHoje(t: Task, hoje: string = hojeISO()): boolean {
  if (!estaPendente(t) || estaAtrasada(t)) return false
  const fixados = blocosFixados(t)
  if (fixados.length) return fixados.some((b) => b.data === hoje)
  return t.data === hoje
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

/** Dia efetivo primeiro (para as visões por data: Hoje/Próximas), depois prioridade. */
export function ordenarPorData(tarefas: Task[]): Task[] {
  return [...tarefas].sort((a, b) => {
    const da = diaEfetivo(a) ?? '9999-99-99'
    const dbb = diaEfetivo(b) ?? '9999-99-99'
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

/** Hoje = dia efetivo (bloco planejado, senão prazo) é hoje. Nunca inclui atrasadas. */
export function filtrarHoje(tarefas: Task[]): Task[] {
  const hoje = hojeISO()
  return ordenarPorData(tarefas.filter((t) => ehHoje(t, hoje)))
}

/** Próximas = pendentes, não atrasadas, não "hoje", agrupadas pelo dia efetivo. */
export function filtrarProximas(tarefas: Task[]): Task[] {
  const hoje = hojeISO()
  return ordenarPorData(
    tarefas.filter((t) => estaPendente(t) && !estaAtrasada(t) && !!diaEfetivo(t) && !ehHoje(t, hoje)),
  )
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

/** Concluídas num dia específico (ISO yyyy-MM-dd), pelo carimbo `concluidaEm`. */
export function concluidasNoDia(tarefas: Task[], dia: string): Task[] {
  const inicio = new Date(`${dia}T00:00:00`).getTime()
  const fim = inicio + 24 * 60 * 60 * 1000
  return filtrarConcluidas(tarefas).filter((t) => (t.concluidaEm ?? 0) >= inicio && (t.concluidaEm ?? 0) < fim)
}

export function concluidasHoje(tarefas: Task[]): Task[] {
  return concluidasNoDia(tarefas, hojeISO())
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

/* ---------- API de blocos (usada pela Agenda: arrastar/fixar/destravar) ---------- */

/**
 * Grava/atualiza um bloco de tempo como `fixado: true` (confirmado pelo
 * Matheus) na tarefa `taskId`.
 *
 * - Se `bloco.id` corresponde a um bloco já existente naquela tarefa,
 *   ATUALIZA esse bloco (dia/início/duração) e garante `fixado: true`.
 * - Senão, ADICIONA um novo bloco (gera um `id` novo se `bloco.id` não foi
 *   informado).
 *
 * Uso típico: ao arrastar um bloco/sugestão na Agenda para um horário, ou ao
 * criar/editar um bloco manualmente no editor de tarefa.
 */
export async function fixarBlocoTarefa(
  taskId: string,
  bloco: { id?: string; data: string; inicio: string; duracaoMin: number },
): Promise<void> {
  const task = await db.tasks.get(taskId)
  if (!task) return
  const atuais = task.blocos ?? []
  const idx = bloco.id ? atuais.findIndex((b) => b.id === bloco.id) : -1
  const atualizado: BlocoTarefa = {
    id: idx >= 0 ? atuais[idx].id : (bloco.id ?? nanoid()),
    data: bloco.data,
    inicio: bloco.inicio,
    duracaoMin: bloco.duracaoMin,
    fixado: true,
  }
  const novos = idx >= 0 ? atuais.map((b, i) => (i === idx ? atualizado : b)) : [...atuais, atualizado]
  await db.tasks.update(taskId, { blocos: novos })
}

/**
 * Destrava um bloco específico (`blocoId`) de uma tarefa: seta `fixado:
 * false`. A partir daí, esse bloco volta a ser uma sugestão viva — o Motor
 * de Planejamento (`sugerirBlocos`, em `execucao.ts`) recalcula o melhor
 * horário pra ele na próxima leitura, considerando o resto do dia.
 *
 * Não remove o bloco nem apaga dia/hora/duração antigos (eles só deixam de
 * "contar" como fixados; o próximo `sugerirBlocos` decide o que fazer).
 */
export async function destravarBlocoTarefa(taskId: string, blocoId: string): Promise<void> {
  const task = await db.tasks.get(taskId)
  if (!task) return
  const novos = (task.blocos ?? []).map((b) => (b.id === blocoId ? { ...b, fixado: false } : b))
  await db.tasks.update(taskId, { blocos: novos })
}

/**
 * Tenta mover um bloco JÁ FIXADO (`blocoId`, da tarefa `taskId`) pra um novo
 * dia/hora — usado pelo arrastar-pra-mover na Agenda.
 *
 * Antes de gravar, valida a regra de dependência (Item 11 do plano):
 * - Se a tarefa tem `dependeDe` com alguma dependência ainda NÃO concluída,
 *   rejeita (nenhuma tarefa dependente pode ter horário antes da dependência
 *   terminar — nem manualmente).
 * - Se alguma dependência concluída tem bloco(s) fixado(s), o novo horário
 *   não pode ser ANTES do fim do bloco fixado mais tardio daquela
 *   dependência.
 *
 * `contexto.tarefas` deve trazer a lista completa de tarefas (pra resolver
 * os ids de `dependeDe` sem precisar reler o banco todo).
 *
 * Retorna `{ ok: true }` e já persiste a mudança quando a validação passa, ou
 * `{ ok: false, motivo }` SEM gravar nada quando rejeita — quem chama (ex.: o
 * `aoSoltar` do arrastar) deve desfazer visualmente o movimento.
 */
export async function moverBlocoFixado(
  taskId: string,
  blocoId: string,
  novaData: string,
  novoInicio: string,
  contexto: { tarefas: Task[] },
): Promise<{ ok: true } | { ok: false; motivo: string }> {
  const task = await db.tasks.get(taskId)
  if (!task) return { ok: false, motivo: 'Tarefa não encontrada.' }
  const bloco = (task.blocos ?? []).find((b) => b.id === blocoId)
  if (!bloco) return { ok: false, motivo: 'Bloco não encontrado.' }

  const deps = (task.dependeDe ?? [])
    .map((id) => contexto.tarefas.find((t) => t.id === id))
    .filter((t): t is Task => !!t)
  if (deps.some((d) => !d.concluidaEm)) {
    return { ok: false, motivo: 'Esta tarefa depende de outra ainda não concluída.' }
  }

  const novoInicioInstante = new Date(`${novaData}T${novoInicio}:00`).getTime()
  for (const dep of deps) {
    for (const b of blocosFixados(dep)) {
      if (!b.inicio) continue
      const fimInstante = new Date(`${b.data}T${b.inicio}:00`).getTime() + b.duracaoMin * 60000
      if (novoInicioInstante < fimInstante) {
        return { ok: false, motivo: `Só pode começar depois do fim do bloco de "${dep.titulo}".` }
      }
    }
  }

  const novos = (task.blocos ?? []).map((b) => (b.id === blocoId ? { ...b, data: novaData, inicio: novoInicio } : b))
  await db.tasks.update(taskId, { blocos: novos })
  return { ok: true }
}
