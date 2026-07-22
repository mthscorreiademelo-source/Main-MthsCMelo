import { nanoid } from 'nanoid'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../core/db/db'
import { hojeISO } from '../../../core/dates'
import { criarEvento } from '../../agenda/db'
import type { EtapaRotina, ExecucaoRotina, PeriodoDia, Rotina, TipoEtapa } from './types'

export const CORES_ROTINA = ['#7c9885', '#4073ff', '#884dff', '#eb8909', '#0f9b9b', '#c0405e']
export const ICONES_ROTINA = ['🌅', '🌙', '🏋️', '📚', '🐾', '🧹', '☕', '💼', '🧘', '🚿', '📋', '✨']

/** Deriva o período do dia a partir de um horário HH:mm. */
export function periodoDeHorario(hhmm?: string): PeriodoDia {
  if (!hhmm) return 'qualquer'
  const h = Number(hhmm.slice(0, 2))
  if (Number.isNaN(h)) return 'qualquer'
  if (h < 12) return 'manha'
  if (h < 18) return 'tarde'
  return 'noite'
}

/* ------------------------------- Templates ------------------------------- */

interface TemplateRotina {
  id: string
  nome: string
  icone: string
  cor: string
  periodo: PeriodoDia
  etapas: { tipo: TipoEtapa; titulo: string; duracaoMin?: number }[]
}

export const TEMPLATES_ROTINA: TemplateRotina[] = [
  { id: 'vazia', nome: 'Em branco', icone: '📋', cor: CORES_ROTINA[0], periodo: 'qualquer', etapas: [] },
  {
    id: 'manha', nome: 'Rotina matinal', icone: '🌅', cor: '#eb8909', periodo: 'manha',
    etapas: [
      { tipo: 'checklist', titulo: 'Levantar e abrir a janela' },
      { tipo: 'checklist', titulo: 'Beber um copo de água' },
      { tipo: 'checklist', titulo: 'Revisar a agenda do dia' },
      { tipo: 'timer', titulo: 'Alongar', duracaoMin: 5 },
      { tipo: 'checklist', titulo: 'Preparar o café' },
    ],
  },
  {
    id: 'noite', nome: 'Rotina noturna', icone: '🌙', cor: '#884dff', periodo: 'noite',
    etapas: [
      { tipo: 'checklist', titulo: 'Guardar a cozinha' },
      { tipo: 'checklist', titulo: 'Preparar a água do dia seguinte' },
      { tipo: 'checklist', titulo: 'Revisar o amanhã' },
      { tipo: 'timer', titulo: 'Ler', duracaoMin: 20 },
      { tipo: 'checklist', titulo: 'Ativar o modo dormir' },
    ],
  },
  {
    id: 'treino', nome: 'Pré-treino', icone: '🏋️', cor: '#4073ff', periodo: 'qualquer',
    etapas: [
      { tipo: 'checklist', titulo: 'Separar a roupa' },
      { tipo: 'checklist', titulo: 'Encher a garrafa' },
      { tipo: 'timer', titulo: 'Aquecer', duracaoMin: 8 },
    ],
  },
]

/* -------------------------------- Rotinas -------------------------------- */

export async function criarRotina(dados: Partial<Rotina> & { nome: string }): Promise<string> {
  const id = dados.id ?? nanoid()
  const n = await db.rotinas.count()
  await db.rotinas.add({
    icone: '📋',
    cor: CORES_ROTINA[0],
    etapas: [],
    periodo: 'qualquer',
    ...dados,
    id,
    ordem: dados.ordem ?? n,
    criadoEm: dados.criadoEm ?? Date.now(),
    atualizadoEm: Date.now(),
  })
  return id
}

export async function criarRotinaDeTemplate(templateId: string): Promise<string> {
  const t = TEMPLATES_ROTINA.find((x) => x.id === templateId) ?? TEMPLATES_ROTINA[0]
  return criarRotina({
    nome: t.id === 'vazia' ? 'Nova rotina' : t.nome,
    icone: t.icone,
    cor: t.cor,
    periodo: t.periodo,
    etapas: t.etapas.map((e) => ({ id: nanoid(), ...e })),
  })
}

export const atualizarRotina = (id: string, m: Partial<Rotina>) =>
  db.rotinas.update(id, { ...m, atualizadoEm: Date.now() })

/** Rotina recém-criada que ficou sem etapas e com o nome padrão. */
export function rotinaVazia(r: Rotina): boolean {
  const semNome = !r.nome?.trim() || r.nome.trim() === 'Nova rotina'
  return semNome && (r.etapas?.length ?? 0) === 0 && !r.horario && !(r.dias?.length)
}

/** Apaga a rotina se estiver vazia. Retorna `true` se descartou. */
export async function descartarRotinaSeVazia(id: string): Promise<boolean> {
  const r = await db.rotinas.get(id)
  if (r && rotinaVazia(r)) {
    await db.rotinas.delete(id)
    return true
  }
  return false
}

export const arquivarRotina = (id: string, arquivada = true) => atualizarRotina(id, { arquivada })

export async function excluirRotina(id: string) {
  await db.rotinas.delete(id)
  const execs = await db.rotinaExecucoes.where('rotinaId').equals(id).primaryKeys()
  await db.rotinaExecucoes.bulkDelete(execs as string[])
}

/* --------------------------------- Etapas -------------------------------- */

export async function adicionarEtapa(rotina: Rotina, etapa: Omit<EtapaRotina, 'id'>) {
  const nova: EtapaRotina = { id: nanoid(), ...etapa }
  await atualizarRotina(rotina.id, { etapas: [...rotina.etapas, nova] })
  return nova.id
}

export const atualizarEtapa = (rotina: Rotina, etapaId: string, m: Partial<EtapaRotina>) =>
  atualizarRotina(rotina.id, { etapas: rotina.etapas.map((e) => (e.id === etapaId ? { ...e, ...m } : e)) })

export const removerEtapa = (rotina: Rotina, etapaId: string) =>
  atualizarRotina(rotina.id, { etapas: rotina.etapas.filter((e) => e.id !== etapaId) })

export function moverEtapa(rotina: Rotina, etapaId: string, dir: -1 | 1) {
  const arr = [...rotina.etapas]
  const i = arr.findIndex((e) => e.id === etapaId)
  const j = i + dir
  if (i < 0 || j < 0 || j >= arr.length) return
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
  return atualizarRotina(rotina.id, { etapas: arr })
}

/* ------------------------------- Execução -------------------------------- */

/** Abre (ou retoma) a execução de hoje de uma rotina. */
export async function iniciarExecucao(rotinaId: string): Promise<string> {
  const hoje = hojeISO()
  const aberta = await db.rotinaExecucoes
    .where('rotinaId').equals(rotinaId)
    .filter((e) => e.data === hoje && !e.concluidoEm)
    .first()
  if (aberta) return aberta.id
  const id = nanoid()
  await db.rotinaExecucoes.add({
    id, rotinaId, data: hoje, iniciadoEm: Date.now(), feitas: [], puladas: [], atualizadoEm: Date.now(),
  })
  return id
}

async function alterarExec(id: string, fn: (e: ExecucaoRotina) => Partial<ExecucaoRotina>) {
  const e = await db.rotinaExecucoes.get(id)
  if (!e) return
  await db.rotinaExecucoes.update(id, { ...fn(e), atualizadoEm: Date.now() })
}

export const marcarEtapa = (execId: string, etapaId: string, feito: boolean) =>
  alterarExec(execId, (e) => ({
    feitas: feito ? [...new Set([...e.feitas, etapaId])] : e.feitas.filter((x) => x !== etapaId),
    puladas: (e.puladas ?? []).filter((x) => x !== etapaId),
  }))

export const pularEtapa = (execId: string, etapaId: string) =>
  alterarExec(execId, (e) => ({
    puladas: [...new Set([...(e.puladas ?? []), etapaId])],
    feitas: e.feitas.filter((x) => x !== etapaId),
  }))

export const encerrarExecucao = (execId: string) =>
  alterarExec(execId, () => ({ concluidoEm: Date.now() }))

/* --------------------------- Reserva na Agenda --------------------------- */

const HORA_PADRAO: Record<PeriodoDia, string> = { manha: '07:00', tarde: '14:00', noite: '21:00', qualquer: '09:00' }

/** Cria um evento na Agenda reservando o tempo da rotina (hoje). */
export async function agendarRotina(rotina: Rotina): Promise<string> {
  const dur = Math.max(15, rotina.etapas.reduce((s, e) => s + (e.duracaoMin ?? 0), 0) || 30)
  const inicio = rotina.horario || HORA_PADRAO[rotina.periodo ?? 'qualquer']
  const [h, m] = inicio.split(':').map(Number)
  const fimMin = h * 60 + m + dur
  const fim = `${String(Math.floor(fimMin / 60) % 24).padStart(2, '0')}:${String(fimMin % 60).padStart(2, '0')}`
  return criarEvento({ titulo: `Rotina: ${rotina.nome}`, data: hojeISO(), inicio, fim, cor: rotina.cor })
}

/* --------------------------------- Hooks --------------------------------- */

export function useRotinas(): Rotina[] | undefined {
  return useLiveQuery(async () => {
    const todas = await db.rotinas.toArray()
    return todas.sort((a, b) => a.ordem - b.ordem)
  }, [])
}

export function useRotina(id?: string): Rotina | undefined | null {
  return useLiveQuery(async () => (id ? (await db.rotinas.get(id)) ?? null : null), [id])
}

export function useExecucaoHoje(rotinaId?: string): ExecucaoRotina | undefined | null {
  return useLiveQuery(async () => {
    if (!rotinaId) return null
    const hoje = hojeISO()
    return (await db.rotinaExecucoes.where('rotinaId').equals(rotinaId).filter((e) => e.data === hoje).reverse().first()) ?? null
  }, [rotinaId])
}
