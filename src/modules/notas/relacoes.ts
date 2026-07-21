/**
 * Relações de uma nota com outras entidades do Lume.
 *
 * A nota existe UMA vez; ela apenas se relaciona a projetos, eventos, tarefas,
 * livros, pets, lugares ou outras notas. Os módulos relacionados podem então
 * exibir a mesma nota no seu contexto, sem cópia. Guardamos só {tipo, id} — o
 * nome e o link são resolvidos na hora, a partir da entidade viva.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import type { Table } from 'dexie'
import { db } from '../../core/db/db'
import type { RelacaoNota, TipoRelacao } from './types'

export type { RelacaoNota, TipoRelacao }

interface InfoTipo {
  rotulo: string
  emoji: string
  /** Tabela Dexie da entidade. */
  tabela: string
  /** Propriedade que dá o nome legível. */
  campoNome: string
  /** Constrói a rota para abrir a entidade. */
  rota: (id: string) => string
}

export const TIPOS_RELACAO: Record<TipoRelacao, InfoTipo> = {
  projeto: { rotulo: 'Projeto', emoji: '📁', tabela: 'projetos', campoNome: 'nome', rota: (id) => `/projetos/${id}` },
  evento: { rotulo: 'Evento', emoji: '📅', tabela: 'eventos', campoNome: 'titulo', rota: () => '/agenda' },
  tarefa: { rotulo: 'Tarefa', emoji: '✅', tabela: 'tasks', campoNome: 'titulo', rota: () => '/tarefas' },
  livro: { rotulo: 'Livro', emoji: '📖', tabela: 'livros', campoNome: 'titulo', rota: (id) => `/biblioteca/${id}` },
  pet: { rotulo: 'Pet', emoji: '🐾', tabela: 'pets', campoNome: 'nome', rota: (id) => `/pets/${id}` },
  lugar: { rotulo: 'Lugar', emoji: '📍', tabela: 'lugares', campoNome: 'nome', rota: () => '/lugares' },
  nota: { rotulo: 'Nota', emoji: '📝', tabela: 'paginas', campoNome: 'titulo', rota: (id) => `/notas/${id}` },
}

export const ORDEM_TIPOS: TipoRelacao[] = ['projeto', 'evento', 'tarefa', 'livro', 'pet', 'lugar', 'nota']

function tabela(nome: string): Table<Record<string, unknown>, string> {
  return (db as unknown as Record<string, Table<Record<string, unknown>, string>>)[nome]
}

export interface RelacaoResolvida extends RelacaoNota {
  nome: string
  emoji: string
  rota: string
  /** A entidade ainda existe? */
  existe: boolean
}

/** Resolve nome + link de uma relação (undefined enquanto carrega). */
export function useRelacoesResolvidas(relacoes: RelacaoNota[] | undefined): RelacaoResolvida[] | undefined {
  const chave = JSON.stringify(relacoes ?? [])
  return useLiveQuery(async () => {
    const rels = relacoes ?? []
    const out: RelacaoResolvida[] = []
    for (const r of rels) {
      const info = TIPOS_RELACAO[r.tipo]
      if (!info) continue
      const ent = await tabela(info.tabela).get(r.id)
      out.push({
        ...r,
        nome: (ent?.[info.campoNome] as string) || `${info.rotulo} removido`,
        emoji: info.emoji,
        rota: info.rota(r.id),
        existe: !!ent,
      })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])
}

/** Busca entidades de um tipo por nome (para o seletor "Relacionado a"). */
export async function buscarEntidades(tipo: TipoRelacao, termo: string): Promise<{ id: string; nome: string }[]> {
  const info = TIPOS_RELACAO[tipo]
  const q = termo.trim().toLowerCase()
  const todas = await tabela(info.tabela).toArray()
  return todas
    .map((e) => ({ id: e.id as string, nome: (e[info.campoNome] as string) || 'Sem título' }))
    .filter((e) => (q ? e.nome.toLowerCase().includes(q) : true))
    .slice(0, 12)
}

/** Notas relacionadas a uma entidade — para exibição contextual em outros módulos. */
export function useNotasRelacionadas(tipo: TipoRelacao, id: string | undefined) {
  return useLiveQuery(async () => {
    if (!id) return []
    const todas = await db.paginas.toArray()
    return todas
      .filter((p) => !p.arquivado && (p.relacoes ?? []).some((r) => r.tipo === tipo && r.id === id))
      .sort((a, b) => b.atualizadaEm - a.atualizadaEm)
  }, [tipo, id])
}
