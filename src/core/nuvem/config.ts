/**
 * Configuração da nuvem (Supabase).
 *
 * A URL e a chave `publishable` (anon) são PÚBLICAS por design — elas já vão
 * embutidas no JavaScript servido ao navegador, e a segurança de verdade vem
 * das regras por linha (RLS) no banco. Por isso podem ficar no código.
 *
 * Podem ser sobrescritas por variáveis de ambiente do build
 * (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) quando útil.
 */
const URL_PADRAO = 'https://jcvjboqomgrdvigtdjhb.supabase.co'
const CHAVE_PADRAO = 'sb_publishable_rqsp9Z1qNlcMPVqASuQkjQ_B8ExdDru'

export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || URL_PADRAO
export const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || CHAVE_PADRAO

/** A sincronização em nuvem está configurada neste build? */
export function nuvemAtiva(): boolean {
  return SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY.length > 20
}
