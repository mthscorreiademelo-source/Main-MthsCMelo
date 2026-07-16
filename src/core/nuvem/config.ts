/**
 * Configuração da nuvem (Supabase). Lida de variáveis de ambiente do build
 * (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Quando ausentes, a nuvem fica
 * desligada e o Lume roda 100% local, idêntico a antes.
 */
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || ''
export const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || ''

/** A sincronização em nuvem está configurada neste build? */
export function nuvemAtiva(): boolean {
  return SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY.length > 20
}
