import type { SupabaseClient } from '@supabase/supabase-js'
import type { LinhaDoc, Transporte } from './engine'

const PAGINA = 1000

interface LinhaServidor {
  colecao: string
  id: string
  doc: { atualizadoEm?: number } | null
  deleted: boolean
  updated_at: string
}

/** Transporte sobre a tabela `documentos` do Supabase. */
export function transporteSupabase(cliente: SupabaseClient, userId: string): Transporte {
  return {
    async puxar(desde: string) {
      const linhas: LinhaDoc[] = []
      let ate = desde
      let cursor = desde
      // pagina até esgotar (updated_at é tempo do servidor, monotônico)
      for (;;) {
        const { data, error } = await cliente
          .from('documentos')
          .select('colecao,id,doc,deleted,updated_at')
          .gt('updated_at', cursor)
          .order('updated_at', { ascending: true })
          .limit(PAGINA)
        if (error) throw error
        const lote = (data ?? []) as LinhaServidor[]
        for (const r of lote) {
          linhas.push({
            colecao: r.colecao,
            id: r.id,
            doc: r.doc,
            atualizadoEm: r.doc?.atualizadoEm ?? 0,
            excluido: r.deleted,
          })
          if (r.updated_at > ate) ate = r.updated_at
        }
        if (lote.length < PAGINA) break
        cursor = lote[lote.length - 1].updated_at
      }
      return { linhas, ate }
    },

    async empurrar(linhas: LinhaDoc[]) {
      const rows = linhas.map((l) => ({
        user_id: userId,
        colecao: l.colecao,
        id: l.id,
        doc: (l.doc ?? {}) as object,
        deleted: l.excluido,
      }))
      // grava em lotes para não estourar limites de payload
      for (let i = 0; i < rows.length; i += PAGINA) {
        const { error } = await cliente
          .from('documentos')
          .upsert(rows.slice(i, i + PAGINA), { onConflict: 'user_id,colecao,id' })
        if (error) throw error
      }
    },
  }
}
