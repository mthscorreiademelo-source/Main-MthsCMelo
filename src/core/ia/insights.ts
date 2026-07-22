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
const TTL_MS = 6 * 60 * 60 * 1000

export type FonteInsight = 'ia' | 'heuristica' | 'carregando'

export interface ResultadoInsight {
  texto: string | null
  fonte: FonteInsight
  regenerar: () => void
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

  const gerar = useCallback(
    async (forcar: boolean) => {
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
      setFonte('carregando')
      try {
        const cliente = await obterCliente()
        if (!cliente) throw new Error('sem cliente')
        const { data, error } = await cliente.functions.invoke('insights', {
          body: { contexto, dados, hoje: hojeISO() },
        })
        const t = !error && data && typeof data.texto === 'string' ? data.texto.trim() : ''
        if (t) {
          gravarCache(chave, { texto: t, assinatura, geradoEm: Date.now() })
          setTexto(t)
          setFonte('ia')
        } else {
          // IA achou que não há nada digno de nota, ou falhou → heurística.
          setTexto(heuristico)
          setFonte('heuristica')
        }
      } catch {
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

  return { texto, fonte, regenerar: () => void gerar(true) }
}
