/**
 * Ponte opcional com a IA (Edge Function `interpretar`, Google Gemini).
 *
 * Fica DESLIGADA (`IA_CAPTURA_ATIVA=false`) até a Edge Function ser publicada.
 * Quando ligada, melhora a interpretação da Captura Rápida; se falhar (offline,
 * erro, sem chave), devolve null e o app cai na heurística local. Nunca grava
 * nada sozinha — o usuário confirma, como sempre.
 */
import { obterCliente } from '../nuvem/cliente'
import type { Interpretacao, TipoCaptura } from './types'

/** Ligue após publicar a Edge Function `interpretar` (ver SETUP-SUPABASE.md). */
export const IA_CAPTURA_ATIVA = false

const TIPOS_VALIDOS: TipoCaptura[] = ['tarefa', 'evento', 'nota', 'compra', 'despesa', 'receita', 'lembrete']

/** Interpreta um texto pela IA. Devolve null em qualquer falha (→ fallback heurístico). */
export async function interpretarIA(texto: string, hoje: string): Promise<Interpretacao[] | null> {
  if (!IA_CAPTURA_ATIVA) return null
  try {
    const cliente = await obterCliente()
    if (!cliente) return null
    const { data, error } = await cliente.functions.invoke('interpretar', { body: { texto, hoje } })
    if (error || !data || !Array.isArray(data.candidatos)) return null
    const candidatos = (data.candidatos as Interpretacao[])
      .filter((c) => c && TIPOS_VALIDOS.includes(c.tipo) && c.campos)
      .map((c) => ({
        tipo: c.tipo,
        campos: c.campos,
        confianca: c.confianca ?? 'media',
        rotulo: c.rotulo ?? 'Sugerido pela IA',
      }))
    return candidatos.length ? candidatos : null
  } catch {
    return null
  }
}
