import { nanoid } from 'nanoid'
import { db } from '../../core/db/db'
import { hojeISO } from '../../core/dates'
import type { Task } from './types'

export async function criarTarefa(titulo: string, data?: string) {
  const texto = titulo.trim()
  if (!texto) return
  const agora = Date.now()
  await db.tasks.add({
    id: nanoid(),
    titulo: texto,
    data,
    criadaEm: agora,
    ordem: agora,
  })
}

export async function alternarConclusao(task: Task) {
  await db.tasks.update(task.id, {
    concluidaEm: task.concluidaEm ? undefined : Date.now(),
  })
}

export async function atualizarTarefa(id: string, mudancas: Partial<Task>) {
  await db.tasks.update(id, mudancas)
}

export async function excluirTarefa(id: string) {
  await db.tasks.delete(id)
}

/* ---------- seleção e ordenação ---------- */

export function estaPendente(t: Task) {
  return !t.concluidaEm
}

export function estaAtrasada(t: Task) {
  return estaPendente(t) && !!t.data && t.data < hojeISO()
}

/** Pendentes: com data primeiro (ascendente), sem data por último; empate por criação. */
export function ordenarPendentes(tarefas: Task[]): Task[] {
  return [...tarefas].sort((a, b) => {
    const da = a.data ?? '9999-99-99'
    const dbb = b.data ?? '9999-99-99'
    if (da !== dbb) return da < dbb ? -1 : 1
    return a.criadaEm - b.criadaEm
  })
}

export function filtrarHoje(tarefas: Task[]): Task[] {
  const hoje = hojeISO()
  return ordenarPendentes(
    tarefas.filter((t) => estaPendente(t) && !!t.data && t.data <= hoje),
  )
}

export function filtrarProximas(tarefas: Task[]): Task[] {
  const hoje = hojeISO()
  return ordenarPendentes(
    tarefas.filter((t) => estaPendente(t) && !!t.data && t.data > hoje),
  )
}

export function filtrarPendentes(tarefas: Task[]): Task[] {
  return ordenarPendentes(tarefas.filter(estaPendente))
}

export function filtrarConcluidas(tarefas: Task[]): Task[] {
  return tarefas
    .filter((t) => !estaPendente(t))
    .sort((a, b) => (b.concluidaEm ?? 0) - (a.concluidaEm ?? 0))
}

export function concluidasHoje(tarefas: Task[]): Task[] {
  const inicioDoDia = new Date()
  inicioDoDia.setHours(0, 0, 0, 0)
  return filtrarConcluidas(tarefas).filter(
    (t) => (t.concluidaEm ?? 0) >= inicioDoDia.getTime(),
  )
}
