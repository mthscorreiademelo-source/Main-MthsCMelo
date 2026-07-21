import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/db'
import type { Aquisicao, ComprasConfig, ItemCompra, ItemDespensa, ListaCompra, MovDespensa, PrecoAquisicao } from './types'

export function useListas(): ListaCompra[] | undefined {
  return useLiveQuery(() => db.comprasListas.orderBy('ordem').toArray(), [])
}
export function useItens(): ItemCompra[] | undefined {
  return useLiveQuery(() => db.comprasItens.toArray(), [])
}
export function useItensDaLista(listaId: string | undefined): ItemCompra[] | undefined {
  return useLiveQuery(() => (listaId ? db.comprasItens.where('listaId').equals(listaId).toArray() : []), [listaId])
}
export function useDespensa(): ItemDespensa[] | undefined {
  return useLiveQuery(() => db.despensa.toArray(), [])
}
export function useItemDespensa(id: string | undefined): ItemDespensa | undefined {
  return useLiveQuery(() => (id ? db.despensa.get(id) : undefined), [id])
}
export function useHistoricoDespensa(despensaId: string | undefined): MovDespensa[] | undefined {
  return useLiveQuery(() => (despensaId ? db.despensaHistorico.where('despensaId').equals(despensaId).toArray() : []), [despensaId])
}
/** Todos os históricos, agrupados por despensaId (para gerar sugestões). */
export function useHistoricosTodos(): Record<string, MovDespensa[]> | undefined {
  return useLiveQuery(async () => {
    const todos = await db.despensaHistorico.toArray()
    const mapa: Record<string, MovDespensa[]> = {}
    for (const m of todos) (mapa[m.despensaId] ??= []).push(m)
    return mapa
  }, [])
}
export function useAquisicoes(): Aquisicao[] | undefined {
  return useLiveQuery(() => db.aquisicoes.orderBy('ordem').toArray(), [])
}
export function useAquisicao(id: string | undefined): Aquisicao | undefined {
  return useLiveQuery(() => (id ? db.aquisicoes.get(id) : undefined), [id])
}
export function usePrecosAquisicao(aquisicaoId: string | undefined): PrecoAquisicao[] | undefined {
  return useLiveQuery(() => (aquisicaoId ? db.aquisicaoPrecos.where('aquisicaoId').equals(aquisicaoId).toArray() : []), [aquisicaoId])
}
export function useComprasConfig(): ComprasConfig | undefined {
  return useLiveQuery(() => db.comprasConfig.get('default'), [])
}
