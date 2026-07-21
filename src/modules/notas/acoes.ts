/**
 * Ações e busca sobre notas — favoritar, arquivar, fixar, tags e relações.
 * Os campos novos são apenas propriedades da Pagina (sem bump de schema); a
 * tabela `paginas` já sincroniza e entra no backup.
 */
import { db } from '../../core/db/db'
import type { Pagina, RelacaoNota } from './types'

export const atualizarPagina = (id: string, m: Partial<Pagina>) =>
  db.paginas.update(id, { ...m, atualizadaEm: Date.now() })

export const alternarFavorito = (p: Pagina) => atualizarPagina(p.id, { favorito: !p.favorito })
export const alternarFixado = (p: Pagina) => atualizarPagina(p.id, { fixado: !p.fixado })
export const alternarArquivado = (p: Pagina) => atualizarPagina(p.id, { arquivado: !p.arquivado })

const mesma = (a: RelacaoNota, b: RelacaoNota) => a.tipo === b.tipo && a.id === b.id

export async function adicionarRelacao(p: Pagina, rel: RelacaoNota) {
  if ((p.relacoes ?? []).some((r) => mesma(r, rel))) return
  const relacoes = [...(p.relacoes ?? []), rel]
  // Espelha a relação com projeto no projetoId, para o Workspace de Projetos
  // (que consulta por projetoId) continuar mostrando a nota.
  const extra = rel.tipo === 'projeto' ? { projetoId: rel.id } : {}
  await atualizarPagina(p.id, { relacoes, ...extra })
}

export async function removerRelacao(p: Pagina, rel: RelacaoNota) {
  const relacoes = (p.relacoes ?? []).filter((r) => !mesma(r, rel))
  const aindaTemProjeto = relacoes.some((r) => r.tipo === 'projeto')
  const extra = rel.tipo === 'projeto' && p.projetoId === rel.id && !aindaTemProjeto ? { projetoId: undefined } : {}
  await atualizarPagina(p.id, { relacoes, ...extra })
}

export async function definirTags(p: Pagina, tags: string[]) {
  await atualizarPagina(p.id, { tags: tags.length ? tags : undefined })
}

/* --------------------------------- Busca --------------------------------- */

export interface FiltroNotas {
  texto?: string
  tipo?: 'texto' | 'desenho' | 'arquivos'
  grupoId?: string
  favorito?: boolean
  arquivado?: boolean
  comAnexo?: boolean
  tag?: string
}

const tipoDe = (p: Pagina) => p.tipo ?? 'texto'

function casaTexto(p: Pagina, q: string): boolean {
  if (p.titulo.toLowerCase().includes(q)) return true
  if ((p.tags ?? []).some((t) => t.toLowerCase().includes(q))) return true
  return (p.blocos ?? []).some((b) => b.texto.toLowerCase().includes(q))
}

/** Aplica os filtros de busca a uma lista de notas. */
export function buscarNotas(paginas: Pagina[], f: FiltroNotas): Pagina[] {
  const q = (f.texto ?? '').trim().toLowerCase()
  return paginas.filter((p) => {
    // Por padrão (arquivado indefinido) escondemos as arquivadas.
    if (f.arquivado === undefined) { if (p.arquivado) return false }
    else if (!!p.arquivado !== f.arquivado) return false
    if (f.tipo && tipoDe(p) !== f.tipo) return false
    if (f.grupoId && p.grupoId !== f.grupoId) return false
    if (f.favorito && !p.favorito) return false
    if (f.comAnexo && !(p.arquivos && p.arquivos.length > 0)) return false
    if (f.tag && !(p.tags ?? []).includes(f.tag)) return false
    if (q && !casaTexto(p, q)) return false
    return true
  })
}

/** Ordena com fixadas primeiro, depois por atualização. */
export function ordenarNotas(paginas: Pagina[]): Pagina[] {
  return [...paginas].sort((a, b) => Number(!!b.fixado) - Number(!!a.fixado) || b.atualizadaEm - a.atualizadaEm)
}
