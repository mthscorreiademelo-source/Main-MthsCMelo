/**
 * Fluxos de criação da Captura Rápida.
 *
 * Centraliza "criar a entidade certa a partir de uma interpretação" e o
 * "desfazer" correspondente, reutilizando as funções de cada módulo. Assim a
 * regra de negócio (ex.: excluir um movimento estorna o saldo) fica com o dono.
 */
import { hojeISO } from '../dates'
import { db } from '../db/db'
import { criarTarefa, excluirTarefa } from '../../modules/tarefas/db'
import { criarEvento, excluirEvento } from '../../modules/agenda/db'
import { criarPagina, excluirPagina, novoBloco } from '../../modules/notas/db'
import { criarItemCompra, criarLista, excluirItem } from '../../modules/compras/db'
import { criarMovimento, excluirMovimento, formatarBRL } from '../../modules/financas/db'
import type { Interpretacao } from './types'

export type Colecao = 'tasks' | 'eventos' | 'paginas' | 'comprasItens' | 'movimentos'

export interface Resultado {
  colecao: Colecao
  id: string
  /** Texto curto de confirmação (ex.: "Tarefa criada para amanhã"). */
  confirmacao: string
}

/** Desfaz uma criação chamando a exclusão do módulo dono (mantém invariantes). */
export function desfazer(colecao: Colecao, id: string): Promise<unknown> {
  switch (colecao) {
    case 'tasks': return excluirTarefa(id)
    case 'eventos': return excluirEvento(id)
    case 'paginas': return excluirPagina(id)
    case 'comprasItens': return Promise.resolve(excluirItem(id))
    case 'movimentos': return excluirMovimento(id)
  }
}

/** Garante uma lista de compras padrão (primeira existente ou cria "Compras"). */
async function listaPadrao(): Promise<string> {
  const primeira = await db.comprasListas.orderBy('ordem').first()
  if (primeira) return primeira.id
  return criarLista({ nome: 'Compras', icone: '🛒' })
}

/** Cria uma nota de texto com o conteúdo capturado e retorna o id. */
export async function criarNotaComTexto(texto: string): Promise<string> {
  const id = await criarPagina()
  const t = texto.trim()
  const titulo = t.split('\n')[0].slice(0, 80)
  await db.paginas.update(id, {
    titulo,
    blocos: [novoBloco('paragrafo', t)],
    atualizadaEm: Date.now(),
  })
  return id
}

/**
 * Cria a entidade correspondente a uma interpretação confirmada.
 * Devolve a coleção + id (para desfazer) e um texto de confirmação.
 */
export async function aplicarInterpretacao(interp: Interpretacao): Promise<Resultado | null> {
  const c = interp.campos
  const titulo = (c.titulo ?? '').trim()

  switch (interp.tipo) {
    case 'tarefa':
    case 'lembrete': {
      const id = await criarTarefa({ titulo, data: c.data, horario: c.horaInicio })
      if (!id) return null
      return { colecao: 'tasks', id, confirmacao: `Tarefa criada${c.data ? '' : ''}` }
    }
    case 'evento': {
      const id = await criarEvento({
        titulo: titulo || 'Novo evento',
        data: c.data ?? hojeISO(),
        inicio: c.horaInicio ?? '09:00',
        local: c.local,
      })
      return { colecao: 'eventos', id, confirmacao: 'Evento criado na agenda' }
    }
    case 'despesa':
    case 'receita': {
      const id = await criarMovimento({
        tipo: interp.tipo === 'receita' ? 'entrada' : 'saida',
        valorCentavos: c.valorCentavos ?? 0,
        descricao: titulo,
        data: c.data ?? hojeISO(),
        categoria: c.categoria,
      })
      if (!id) return null
      return {
        colecao: 'movimentos',
        id,
        confirmacao: `${interp.tipo === 'receita' ? 'Receita' : 'Despesa'} de ${formatarBRL(c.valorCentavos ?? 0)} registrada`,
      }
    }
    case 'compra': {
      const listaId = await listaPadrao()
      const id = await criarItemCompra({ listaId, nome: titulo, origem: 'manual' })
      return { colecao: 'comprasItens', id, confirmacao: 'Item adicionado à lista' }
    }
    case 'nota':
    case 'desenho':
    default: {
      const id = await criarNotaComTexto(titulo)
      return { colecao: 'paginas', id, confirmacao: 'Nota salva' }
    }
  }
}
