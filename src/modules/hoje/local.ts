/**
 * Persistência LOCAL do Hoje (localStorage), separada por dia quando faz sentido.
 * Usada pelos cards cujo estado é "do dia" e não precisa (ainda) de sync:
 * pomodoro, checklist de dormir, gratidão, reflexão, propósito de amanhã, ideia.
 *
 * ⚠️ Local-only: não sincroniza entre aparelhos. O que for "diário do dia"
 * (gratidão/reflexão/propósito) fica aqui por simplicidade — se um dia virar
 * memória permanente, o Gerente cria a coleção de sync (anotado no relatório).
 */

import { useCallback, useEffect, useState } from 'react'

const PREFIXO = 'lume:hoje:'

/** Lê um valor JSON do localStorage; devolve `padrao` se ausente/inválido. */
export function lerLocal<T>(chave: string, padrao: T): T {
  if (typeof window === 'undefined') return padrao
  try {
    const bruto = window.localStorage.getItem(PREFIXO + chave)
    if (bruto == null) return padrao
    return JSON.parse(bruto) as T
  } catch {
    return padrao
  }
}

/** Grava um valor JSON no localStorage (silencioso em caso de erro/quota). */
export function salvarLocal<T>(chave: string, valor: T): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PREFIXO + chave, JSON.stringify(valor))
  } catch {
    /* quota cheia ou modo privado: ignora */
  }
}

/**
 * Hook de estado espelhado no localStorage. Reidrata na montagem e grava a cada
 * mudança. A `chave` deve conter o dia quando o dado é "do dia" (ex.: incluir o
 * ISO), para o valor se renovar naturalmente à meia-noite.
 */
export function useLocal<T>(chave: string, padrao: T): [T, (v: T | ((anterior: T) => T)) => void] {
  const [valor, setValorState] = useState<T>(() => lerLocal(chave, padrao))

  // Se a chave mudar (ex.: virou o dia), recarrega o valor da nova chave.
  useEffect(() => {
    setValorState(lerLocal(chave, padrao))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])

  const setValor = useCallback(
    (v: T | ((anterior: T) => T)) => {
      setValorState((anterior) => {
        const novo = typeof v === 'function' ? (v as (a: T) => T)(anterior) : v
        salvarLocal(chave, novo)
        return novo
      })
    },
    [chave],
  )

  return [valor, setValor]
}
