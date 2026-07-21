import { nanoid } from 'nanoid'
import { db } from '../../core/db/db'
import type { ItemProjeto, ModuloProjeto, Projeto, Task } from '../tarefas/types'
import { modulosDoTemplate, TEMPLATES } from './modulos'

export const CORES_PROJETO = [
  '#4073ff', '#7c9885', '#884dff', '#eb8909', '#c0405e', '#299438', '#0f9b9b', '#808080',
]

/* ------------------------------ CRUD projetos ----------------------------- */

export async function criarProjetoWorkspace(dados: {
  nome: string
  icone?: string
  cor?: string
  descricao?: string
  categoria?: string
  templateId?: string
  modulos?: string[]
}): Promise<string> {
  const agora = Date.now()
  const max = await db.projetos.orderBy('ordem').last()
  const id = nanoid()
  const idsModulos = dados.modulos ?? TEMPLATES.find((t) => t.id === dados.templateId)?.modulos ?? ['tarefas', 'notas']
  await db.projetos.add({
    id,
    nome: dados.nome.trim() || 'Projeto',
    icone: dados.icone ?? '📁',
    cor: dados.cor ?? CORES_PROJETO[0],
    descricao: dados.descricao?.trim() || undefined,
    categoria: dados.categoria?.trim() || undefined,
    status: 'andamento',
    modulos: modulosDoTemplate(idsModulos),
    ordem: (max?.ordem ?? 0) + 1,
    ultimaAtividade: agora,
    criadoEm: agora,
  })
  return id
}

export const atualizarProjetoWS = (id: string, m: Partial<Projeto>) =>
  db.projetos.update(id, { ...m, atualizadoEm: Date.now() })

/** Exclui o projeto: desvincula tarefas/eventos/movimentos/notas e apaga itens locais. */
export async function excluirProjetoWS(id: string) {
  await db.transaction(
    'rw',
    [db.projetos, db.tasks, db.eventos, db.movimentos, db.paginas, db.projetoItens],
    async () => {
      await db.tasks.where('projetoId').equals(id).modify({ projetoId: undefined })
      await db.eventos.where('projetoId').equals(id).modify({ projetoId: undefined })
      await db.movimentos.where('projetoId').equals(id).modify({ projetoId: undefined })
      await db.paginas.where('projetoId').equals(id).modify({ projetoId: undefined })
      await db.projetoItens.where('projetoId').equals(id).delete()
      await db.projetos.delete(id)
    },
  )
}

export const alternarFavoritoProjeto = (p: Projeto) =>
  atualizarProjetoWS(p.id, { favorito: !p.favorito })

/* ------------------------------ Módulos do WS ----------------------------- */

/** Lista de módulos do projeto (ordenada). */
export function modulosDoProjeto(p: Projeto): ModuloProjeto[] {
  return [...(p.modulos ?? [])].sort((a, b) => a.ordem - b.ordem)
}

export function temModulo(p: Projeto, moduloId: string): boolean {
  return (p.modulos ?? []).some((m) => m.id === moduloId && m.visivel)
}

export async function adicionarModulo(p: Projeto, moduloId: string) {
  const atuais = p.modulos ?? []
  if (atuais.some((m) => m.id === moduloId)) {
    await salvarModulos(p.id, atuais.map((m) => (m.id === moduloId ? { ...m, visivel: true } : m)))
    return
  }
  const ordem = Math.max(0, ...atuais.map((m) => m.ordem + 1))
  await salvarModulos(p.id, [...atuais, { id: moduloId, visivel: true, ordem }])
}

export async function removerModulo(p: Projeto, moduloId: string) {
  await salvarModulos(p.id, (p.modulos ?? []).filter((m) => m.id !== moduloId))
}

export async function alternarRecolhido(p: Projeto, moduloId: string) {
  await salvarModulos(
    p.id,
    (p.modulos ?? []).map((m) => (m.id === moduloId ? { ...m, recolhido: !m.recolhido } : m)),
  )
}

export async function moverModulo(p: Projeto, moduloId: string, dir: -1 | 1) {
  const lista = modulosDoProjeto(p)
  const i = lista.findIndex((m) => m.id === moduloId)
  const j = i + dir
  if (i < 0 || j < 0 || j >= lista.length) return
  ;[lista[i], lista[j]] = [lista[j], lista[i]]
  await salvarModulos(p.id, lista.map((m, k) => ({ ...m, ordem: k })))
}

export const salvarModulos = (projetoId: string, modulos: ModuloProjeto[]) =>
  db.projetos.update(projetoId, { modulos, atualizadoEm: Date.now() })

/* ----------------------------- Itens locais ------------------------------- */

export async function criarItem(dados: Partial<ItemProjeto> & { projetoId: string; modulo: string }): Promise<string> {
  const id = nanoid()
  const agora = Date.now()
  const ult = await db.projetoItens.where({ projetoId: dados.projetoId, modulo: dados.modulo }).last()
  await db.projetoItens.add({
    id,
    projetoId: dados.projetoId,
    modulo: dados.modulo,
    titulo: dados.titulo,
    texto: dados.texto,
    url: dados.url,
    dados: dados.dados,
    concluido: dados.concluido,
    ordem: dados.ordem ?? (ult?.ordem ?? 0) + 1,
    criadoEm: agora,
  })
  await marcarAtividade(dados.projetoId)
  return id
}

export const atualizarItem = (id: string, m: Partial<ItemProjeto>) =>
  db.projetoItens.update(id, { ...m, atualizadoEm: Date.now() })
export const excluirItem = (id: string) => db.projetoItens.delete(id)

export async function marcarAtividade(projetoId: string) {
  await db.projetos.update(projetoId, { ultimaAtividade: Date.now() })
}

/* ------------------------------- Progresso -------------------------------- */

/** Progresso do projeto (0..1) pela fração de tarefas concluídas. */
export function progressoProjeto(tarefas: Task[]): number {
  const doProjeto = tarefas.filter((t) => !t.paiId)
  if (doProjeto.length === 0) return 0
  const feitas = doProjeto.filter((t) => !!t.concluidaEm).length
  return feitas / doProjeto.length
}

export const ROTULO_STATUS: Record<string, string> = {
  ideia: 'Ideia',
  andamento: 'Em andamento',
  pausado: 'Pausado',
  concluido: 'Concluído',
}
export const COR_STATUS: Record<string, string> = {
  ideia: '#808080',
  andamento: '#299438',
  pausado: '#eb8909',
  concluido: '#4073ff',
}
