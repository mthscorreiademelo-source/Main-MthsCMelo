import type { SupabaseClient } from '@supabase/supabase-js'
import { nuvemAtiva, SUPABASE_ANON_KEY, SUPABASE_URL } from './config'

let clientePromessa: Promise<SupabaseClient> | null = null

/**
 * Cliente Supabase carregado sob demanda (só quando a nuvem está ativa).
 * Carregar de forma tardia evita puxar a biblioteca no arranque local.
 */
export async function obterCliente(): Promise<SupabaseClient | null> {
  if (!nuvemAtiva()) return null
  if (!clientePromessa) {
    clientePromessa = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }),
    )
  }
  return clientePromessa
}
