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
export const IA_CAPTURA_ATIVA = true

const TIPOS_VALIDOS: TipoCaptura[] = ['tarefa', 'evento', 'nota', 'compra', 'despesa', 'receita', 'lembrete']

/** Último motivo de a IA não ter respondido (diagnóstico, mostrado na UI). */
export let ultimoErroIA: string | null = null

/** Interpreta um texto pela IA. Devolve null em qualquer falha (→ fallback heurístico). */
export async function interpretarIA(texto: string, hoje: string): Promise<Interpretacao[] | null> {
  ultimoErroIA = null
  if (!IA_CAPTURA_ATIVA) return null
  try {
    const cliente = await obterCliente()
    if (!cliente) { ultimoErroIA = 'sem cliente (login/nuvem)'; return null }
    const { data, error } = await cliente.functions.invoke('interpretar', { body: { texto, hoje } })
    if (error) {
      let extra = ''
      try {
        const ctx = (error as { context?: Response }).context
        if (ctx) extra = ` [${ctx.status} ${(await ctx.text()).slice(0, 220)}]`
      } catch { /* ignora */ }
      ultimoErroIA = `${(error as Error).message ?? 'erro'}${extra}`
      return null
    }
    if (data && (data as { erro?: unknown }).erro) {
      ultimoErroIA = `função: ${JSON.stringify(data).slice(0, 220)}`
      return null
    }
    if (!data || !Array.isArray(data.candidatos)) {
      ultimoErroIA = `resposta inesperada: ${JSON.stringify(data).slice(0, 180)}`
      return null
    }
    const candidatos = (data.candidatos as Interpretacao[])
      .filter((c) => c && TIPOS_VALIDOS.includes(c.tipo) && c.campos)
      .map((c) => ({
        tipo: c.tipo,
        campos: c.campos,
        confianca: c.confianca ?? 'media',
        rotulo: c.rotulo ?? 'Sugerido pela IA',
      }))
    if (!candidatos.length) { ultimoErroIA = 'IA não retornou candidatos válidos'; return null }
    return candidatos
  } catch (e) {
    ultimoErroIA = `exceção: ${String(e).slice(0, 180)}`
    return null
  }
}
