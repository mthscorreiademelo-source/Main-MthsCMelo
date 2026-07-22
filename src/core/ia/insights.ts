/**
 * Motor de insights por IA — reutilizável em qualquer módulo.
 *
 * Ideia: o app calcula os NÚMEROS REAIS (heurística de sempre), passa para a IA
 * só REDIGIR uma observação honesta, e guarda o resultado em cache para não
 * chamar a rede toda hora (mantém o uso dentro do free tier do Gemini). Se a IA
 * estiver desligada/offline/sem cota, cai no texto heurístico — nada quebra.
 *
 * Fica DESLIGADO (`IA_INSIGHTS_ATIVA=false`) até a Edge Function `insights` ser
 * publicada no Supabase (ver SETUP-SUPABASE.md).
 */
import { useCallback, useEffect, useState } from 'react'
import { hojeISO } from '../dates'
import { obterCliente } from '../nuvem/cliente'

/** Ligue após publicar a Edge Function `insights`. */
export const IA_INSIGHTS_ATIVA = true

/** Por quanto tempo um insight de IA fica em cache antes de poder regenerar. */
const TTL_MS = 24 * 60 * 60 * 1000

/**
 * Teto diário de chamadas de IA por aparelho — folga de sobra para o uso
 * pessoal (as observações ficam em cache por 24h), mas evita estourar o free
 * tier do Gemini em rajadas. Ao atingir, cai na heurística até o dia virar.
 */
const LIMITE_DIA = 100

function contadorHoje(): { dia: string; n: number } {
  const hoje = hojeISO()
  try {
    const c = JSON.parse(localStorage.getItem('lume:insight:contador') || 'null')
    if (c && c.dia === hoje) return c
  } catch { /* ignora */ }
  return { dia: hoje, n: 0 }
}
function podeChamarIA(): boolean {
  return contadorHoje().n < LIMITE_DIA
}
function registrarChamadaIA() {
  const c = contadorHoje()
  try {
    localStorage.setItem('lume:insight:contador', JSON.stringify({ dia: c.dia, n: c.n + 1 }))
  } catch { /* ignora */ }
}

export type FonteInsight = 'ia' | 'heuristica' | 'carregando'

export interface ResultadoInsight {
  texto: string | null
  fonte: FonteInsight
  regenerar: () => void
  /** Diagnóstico do último motivo de não usar a IA (temporário, para depurar). */
  erro: string | null
}

interface Cache {
  texto: string
  assinatura: string
  geradoEm: number
}

function lerCache(chave: string): Cache | null {
  try {
    return JSON.parse(localStorage.getItem(`lume:insight:v3:${chave}`) || 'null')
  } catch {
    return null
  }
}
function gravarCache(chave: string, c: Cache) {
  try {
    localStorage.setItem(`lume:insight:v3:${chave}`, JSON.stringify(c))
  } catch {
    /* ignora localStorage cheio */
  }
}

/**
 * Gera (ou reaproveita do cache) uma observação por IA para uma superfície.
 * @param chave       identificador estável da superfície (ex.: 'hoje').
 * @param contexto    o que estamos observando (vai no prompt).
 * @param dados       números reais já calculados (payload honesto para a IA).
 * @param assinatura  string que muda quando os dados mudam (controla o cache).
 * @param heuristico  texto de fallback (a observação heurística de sempre).
 */
export function useInsightIA({
  chave,
  contexto,
  dados,
  assinatura,
  heuristico,
  habilitado = true,
}: {
  chave: string
  contexto: string
  dados: unknown
  assinatura: string
  heuristico: string | null
  /** Quando false, nem chama a IA (ex.: dados insuficientes) — usa a heurística. */
  habilitado?: boolean
}): ResultadoInsight {
  const [texto, setTexto] = useState<string | null>(heuristico)
  const [fonte, setFonte] = useState<FonteInsight>('heuristica')
  const [erro, setErro] = useState<string | null>(null)

  const gerar = useCallback(
    async (forcar: boolean) => {
      setErro(null)
      if (!IA_INSIGHTS_ATIVA || !habilitado) {
        setTexto(heuristico)
        setFonte('heuristica')
        return
      }
      const cache = lerCache(chave)
      if (!forcar && cache && cache.assinatura === assinatura && Date.now() - cache.geradoEm < TTL_MS) {
        setTexto(cache.texto)
        setFonte('ia')
        return
      }
      if (!podeChamarIA()) {
        setErro('teto diário de IA atingido (poupando cota) — usando heurística')
        setTexto(heuristico)
        setFonte('heuristica')
        return
      }
      setFonte('carregando')
      try {
        const cliente = await obterCliente()
        if (!cliente) { setErro('sem cliente (login/nuvem)'); setTexto(heuristico); setFonte('heuristica'); return }
        registrarChamadaIA()
        const { data, error } = await cliente.functions.invoke('insights', {
          body: { contexto, dados, hoje: hojeISO() },
        })
        if (error) {
          let extra = ''
          try {
            const ctx = (error as { context?: Response }).context
            if (ctx) extra = ` [${ctx.status} ${(await ctx.text()).slice(0, 200)}]`
          } catch { /* ignora */ }
          setErro(`${(error as Error).message ?? 'erro'}${extra}`)
          setTexto(heuristico)
          setFonte('heuristica')
          return
        }
        const t = data && typeof data.texto === 'string' ? data.texto.trim() : ''
        if (t) {
          gravarCache(chave, { texto: t, assinatura, geradoEm: Date.now() })
          setTexto(t)
          setFonte('ia')
        } else {
          setErro(`resposta vazia: ${JSON.stringify(data).slice(0, 180)}`)
          setTexto(heuristico)
          setFonte('heuristica')
        }
      } catch (e) {
        setErro(`exceção: ${String(e).slice(0, 180)}`)
        setTexto(heuristico)
        setFonte('heuristica')
      }
    },
    // `dados` é representado por `assinatura` de propósito (evita re-render infinito).
    [chave, contexto, assinatura, heuristico, habilitado], // eslint-disable-line react-hooks/exhaustive-deps
  )

  useEffect(() => {
    void gerar(false)
  }, [gerar])

  return { texto, fonte, regenerar: () => void gerar(true), erro }
}
