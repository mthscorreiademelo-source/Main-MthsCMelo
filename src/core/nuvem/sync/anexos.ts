/**
 * Sincronização dos BINÁRIOS de anexos via Supabase Storage.
 *
 * Os metadados (nome, tipo, tamanho…) viajam pela tabela `documentos` como
 * qualquer outro registro; aqui cuidamos só do conteúdo binário, que não cabe
 * bem num JSON. Cada blob vira um objeto em `anexos/{userId}/{tabela}/{id}`.
 *
 * Tudo é DEFENSIVO e isolado: qualquer falha é engolida (log + segue), para
 * nunca derrubar a sincronização de documentos. Fica inativo até
 * `ANEXOS_ATIVO` ser ligado e o bucket existir (ver SETUP-SUPABASE.md).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { db } from '../../db/db'
import { comAplicacaoRemota } from './bandeira'
import { ANEXOS_ATIVO, TABELAS_BLOB } from './colecoes'

const BUCKET = 'anexos'
const TABELAS = Object.keys(TABELAS_BLOB)

type LinhaBlob = { id: string } & Record<string, unknown>

/** Ids de blobs já enviados neste aparelho, para evitar reupload a cada ciclo. */
function chaveEnviados(uid: string) {
  return `lume:anexos:enviados:${uid}`
}
function carregarEnviados(uid: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(chaveEnviados(uid)) || '[]'))
  } catch {
    return new Set()
  }
}
function salvarEnviados(uid: string, s: Set<string>) {
  try {
    localStorage.setItem(chaveEnviados(uid), JSON.stringify([...s]))
  } catch {
    /* localStorage cheio/indisponível — só perde o cache, reenvia depois */
  }
}

/** O bucket existe e está acessível? (gate silencioso quando não configurado.) */
async function bucketPronto(cliente: SupabaseClient, uid: string): Promise<boolean> {
  const { error } = await cliente.storage.from(BUCKET).list(uid, { limit: 1 })
  return !error
}

/**
 * Envia binários novos e baixa os que faltam localmente. Idempotente e seguro
 * para rodar a cada ciclo de sync. Nunca lança — apenas registra e segue.
 */
export async function sincronizarAnexos(cliente: SupabaseClient | null, uid: string): Promise<void> {
  if (!ANEXOS_ATIVO || !cliente) return
  try {
    if (!(await bucketPronto(cliente, uid))) return
    const enviados = carregarEnviados(uid)

    for (const tabela of TABELAS) {
      const campo = TABELAS_BLOB[tabela]
      const tab = (db as unknown as Record<string, { toArray: () => Promise<LinhaBlob[]>; update: (id: string, m: Record<string, unknown>) => Promise<number> }>)[tabela]
      if (!tab) continue
      const linhas = await tab.toArray()

      // PUSH: sobe binários locais ainda não enviados.
      for (const r of linhas) {
        const blob = r[campo] as Blob | undefined
        if (!blob) continue
        const caminho = `${uid}/${tabela}/${r.id}`
        if (enviados.has(caminho)) continue
        const { error } = await cliente.storage
          .from(BUCKET)
          .upload(caminho, blob, { upsert: true, contentType: blob.type || 'application/octet-stream' })
        if (!error) enviados.add(caminho)
      }

      // PULL: baixa binários de registros que chegaram sem o blob.
      for (const r of linhas) {
        if (r[campo]) continue
        const caminho = `${uid}/${tabela}/${r.id}`
        const { data, error } = await cliente.storage.from(BUCKET).download(caminho)
        if (error || !data) continue
        // Preenche o blob sem reestampar `atualizadoEm` (não é uma edição do usuário).
        await comAplicacaoRemota(async () => {
          await tab.update(r.id, { [campo]: data })
        })
        enviados.add(caminho) // já está na nuvem; não precisa reenviar
      }
    }

    salvarEnviados(uid, enviados)
  } catch (e) {
    console.warn('[lume anexos] ciclo falhou (ignorado):', e)
  }
}
