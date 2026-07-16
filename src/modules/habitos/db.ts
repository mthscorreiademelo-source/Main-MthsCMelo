import { format, parseISO, subDays } from 'date-fns'
import { nanoid } from 'nanoid'
import { db } from '../../core/db/db'
import { hojeISO } from '../../core/dates'
import type {
  CategoriaHabito,
  Frequencia,
  Habito,
  HabitoRegistro,
  TipoHabito,
} from './types'

/** Paleta de cores dos hábitos/categorias. */
export const PALETA = [
  '#c46a5e',
  '#d89b6c',
  '#cba34e',
  '#8cae7b',
  '#5b9c86',
  '#6d8bc4',
  '#9b7bc4',
  '#c98bb0',
  '#7a8290',
]

export interface TipoInfo {
  tipo: TipoHabito
  rotulo: string
  /** unidade sugerida (vazio = sem unidade). */
  unidade: string
  medido: boolean
}

export const TIPOS: TipoInfo[] = [
  { tipo: 'sim_nao', rotulo: 'Sim / Não', unidade: '', medido: false },
  { tipo: 'contador', rotulo: 'Contador', unidade: 'vezes', medido: true },
  { tipo: 'valor', rotulo: 'Valor acumulado', unidade: 'ml', medido: true },
  { tipo: 'tempo', rotulo: 'Tempo', unidade: 'min', medido: true },
  { tipo: 'distancia', rotulo: 'Distância', unidade: 'km', medido: true },
  { tipo: 'quantidade', rotulo: 'Quantidade', unidade: 'un', medido: true },
  { tipo: 'checklist', rotulo: 'Checklist', unidade: '', medido: false },
]

export function tipoInfo(tipo: TipoHabito): TipoInfo {
  return TIPOS.find((t) => t.tipo === tipo) ?? TIPOS[0]
}

export function ehMedido(tipo: TipoHabito): boolean {
  return tipoInfo(tipo).medido
}

// ---------- Categorias ----------

const CATEGORIAS_PADRAO: Omit<CategoriaHabito, 'criadoEm'>[] = [
  { id: 'seed-saude', nome: 'Saúde', cor: '#c46a5e', icone: 'coracao', ordem: 1 },
  { id: 'seed-estudos', nome: 'Estudos', cor: '#6d8bc4', icone: 'livro', ordem: 2 },
  { id: 'seed-exercicios', nome: 'Exercícios', cor: '#8cae7b', icone: 'corrida', ordem: 3 },
  { id: 'seed-alimentacao', nome: 'Alimentação', cor: '#d89b6c', icone: 'garfo', ordem: 4 },
  { id: 'seed-trabalho', nome: 'Trabalho', cor: '#7a8290', icone: 'maleta', ordem: 5 },
  { id: 'seed-desenvolvimento', nome: 'Desenvolvimento Pessoal', cor: '#9b7bc4', icone: 'chama', ordem: 6 },
]

const CHAVE_SEED = 'lume:habitos:cat-seed'

/** Cria as categorias padrão uma única vez (ids fixos → sem duplicar entre aparelhos). */
export async function garantirSeedsHabitos(): Promise<void> {
  if (localStorage.getItem(CHAVE_SEED)) return
  localStorage.setItem(CHAVE_SEED, '1')
  const existentes = await db.categoriasHabito.count()
  if (existentes > 0) return
  const agora = Date.now()
  await db.categoriasHabito.bulkAdd(CATEGORIAS_PADRAO.map((c) => ({ ...c, criadoEm: agora })))
}

export async function criarCategoria(dados: Partial<CategoriaHabito> & { nome: string }) {
  const agora = Date.now()
  const max = await db.categoriasHabito.orderBy('ordem').last()
  await db.categoriasHabito.add({
    id: nanoid(),
    ordem: (max?.ordem ?? 0) + 1,
    cor: PALETA[0],
    icone: 'folha',
    criadoEm: agora,
    ...dados,
  })
}

export async function atualizarCategoria(id: string, mudancas: Partial<CategoriaHabito>) {
  await db.categoriasHabito.update(id, mudancas)
}

export async function excluirCategoria(id: string) {
  await db.transaction('rw', db.categoriasHabito, db.habitos, async () => {
    await db.habitos.where('categoriaId').equals(id).modify({ categoriaId: undefined })
    await db.categoriasHabito.delete(id)
  })
}

export async function alternarRecolhida(id: string, recolhida: boolean) {
  await db.categoriasHabito.update(id, { recolhida })
}

// ---------- Hábitos ----------

export function novaFrequencia(): Frequencia {
  return { tipo: 'diario' }
}

export async function criarHabito(dados: Partial<Habito> & { nome: string }): Promise<string> {
  const agora = Date.now()
  const max = await db.habitos.orderBy('ordem').last()
  const id = dados.id ?? nanoid()
  await db.habitos.add({
    id,
    tipo: 'sim_nao',
    frequencia: novaFrequencia(),
    icone: 'folha',
    cor: PALETA[3],
    ordem: (max?.ordem ?? 0) + 1,
    criadoEm: agora,
    ...dados,
  })
  return id
}

export async function atualizarHabito(id: string, mudancas: Partial<Habito>) {
  await db.habitos.update(id, mudancas)
}

export async function excluirHabito(id: string) {
  await db.transaction('rw', db.habitos, db.habitoRegistros, async () => {
    await db.habitoRegistros.where('habitoId').equals(id).delete()
    await db.habitos.delete(id)
  })
}

export function ordenarHabitos(habitos: Habito[]): Habito[] {
  return [...habitos].sort((a, b) => a.ordem - b.ordem)
}

// ---------- Registros (progresso do dia) ----------

function idReg(habitoId: string, data: string) {
  return `${habitoId}:${data}`
}

/** Sim/Não: ciclo pendente → feito → não fez → pendente. */
export async function cicloSimNao(habitoId: string, data: string) {
  const id = idReg(habitoId, data)
  const existe = await db.habitoRegistros.get(id)
  const estado = existe?.estado ?? (existe && (existe.valor ?? 0) >= 1 ? 'feito' : undefined)
  if (!existe) {
    await db.habitoRegistros.add({ id, habitoId, data, estado: 'feito', valor: 1 })
  } else if (estado === 'feito') {
    await db.habitoRegistros.update(id, { estado: 'falhou', valor: 0 })
  } else {
    await db.habitoRegistros.delete(id)
  }
}

/** Define diretamente um estado do dia (usado no histórico/detalhe). */
export async function definirEstadoSimNao(
  habitoId: string,
  data: string,
  estado: 'feito' | 'falhou' | 'pendente',
) {
  const id = idReg(habitoId, data)
  if (estado === 'pendente') {
    await db.habitoRegistros.delete(id)
    return
  }
  const existe = await db.habitoRegistros.get(id)
  const doc = { estado, valor: estado === 'feito' ? 1 : 0 }
  if (existe) await db.habitoRegistros.update(id, doc)
  else await db.habitoRegistros.add({ id, habitoId, data, ...doc })
}

/** Tipos medidos: soma `delta` (pode ser negativo). Remove o registro se zerar. */
export async function ajustarValor(habito: Habito, data: string, delta: number) {
  const id = idReg(habito.id, data)
  const existe = await db.habitoRegistros.get(id)
  const atual = existe?.valor ?? 0
  const novo = Math.max(0, Math.round((atual + delta) * 100) / 100)
  if (novo <= 0) {
    if (existe) await db.habitoRegistros.delete(id)
    return
  }
  if (existe) await db.habitoRegistros.update(id, { valor: novo })
  else await db.habitoRegistros.add({ id, habitoId: habito.id, data, valor: novo })
}

/** Tipos medidos: define um valor exato. */
export async function definirValor(habito: Habito, data: string, valor: number) {
  const id = idReg(habito.id, data)
  const existe = await db.habitoRegistros.get(id)
  const novo = Math.max(0, valor)
  if (novo <= 0) {
    if (existe) await db.habitoRegistros.delete(id)
    return
  }
  if (existe) await db.habitoRegistros.update(id, { valor: novo })
  else await db.habitoRegistros.add({ id, habitoId: habito.id, data, valor: novo })
}

/** Checklist: marca/desmarca um item no dia. */
export async function alternarItem(habito: Habito, data: string, itemId: string) {
  const id = idReg(habito.id, data)
  const existe = await db.habitoRegistros.get(id)
  const feitos = new Set(existe?.itens ?? [])
  if (feitos.has(itemId)) feitos.delete(itemId)
  else feitos.add(itemId)
  const itens = [...feitos]
  if (itens.length === 0) {
    if (existe) await db.habitoRegistros.delete(id)
    return
  }
  if (existe) await db.habitoRegistros.update(id, { itens })
  else await db.habitoRegistros.add({ id, habitoId: habito.id, data, itens })
}

/** Últimos n dias (mais antigo primeiro), terminando hoje. */
export function ultimosDias(n: number): string[] {
  const hoje = parseISO(hojeISO())
  return Array.from({ length: n }, (_, i) => format(subDays(hoje, n - 1 - i), 'yyyy-MM-dd'))
}

export type { CategoriaHabito, Habito, HabitoRegistro }
