/**
 * Estado global do "tem versão nova do app" (PWA).
 *
 * O `main.tsx` registra o service worker em modo 'prompt': quando uma nova
 * versão fica pronta, ele chama `sinalizarAtualizacao(aplicar)` em vez de
 * recarregar sozinho. Um aviso discreto deixa o usuário escolher a hora —
 * evita recarregar no meio de uma edição.
 */
import { useSyncExternalStore } from 'react'

let precisa = false
let aplicar: (() => void) | null = null
const inscritos = new Set<() => void>()

function emitir() {
  for (const fn of inscritos) fn()
}

/** Chamado pelo registro do SW quando há uma nova versão aguardando. */
export function sinalizarAtualizacao(fn: () => void) {
  precisa = true
  aplicar = fn
  emitir()
}

/** Ativa a nova versão (o SW assume e a página recarrega). */
export function aplicarAtualizacao() {
  aplicar?.()
}

function inscrever(fn: () => void) {
  inscritos.add(fn)
  return () => inscritos.delete(fn)
}

export function usePrecisaAtualizar(): boolean {
  return useSyncExternalStore(inscrever, () => precisa, () => false)
}
