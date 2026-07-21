import { useSyncExternalStore } from 'react'

/**
 * Estado global da Captura Rápida — para o botão flutuante, o atalho de
 * teclado e a seção do Hoje abrirem o MESMO launcher, e para o toast de
 * confirmação/desfazer aparecer sobre qualquer página.
 */

export type AbaLauncher = 'grade' | 'universal'

interface Toast {
  id: number
  texto: string
  desfazer?: () => unknown | Promise<unknown>
}

interface Estado {
  aberto: boolean
  aba: AbaLauncher
  /** Texto pré-preenchido (ex.: vindo de um atalho). */
  textoInicial?: string
  /** Caixa de entrada aberta (pode ser aberta do Hoje ou do launcher). */
  caixa: boolean
  toast: Toast | null
}

let estado: Estado = { aberto: false, aba: 'grade', caixa: false, toast: null }
const ouvintes = new Set<() => void>()
let seqToast = 0
let timerToast: ReturnType<typeof setTimeout> | null = null

function emitir(novo: Partial<Estado>) {
  estado = { ...estado, ...novo }
  ouvintes.forEach((o) => o())
}

function assinar(fn: () => void) {
  ouvintes.add(fn)
  return () => ouvintes.delete(fn)
}

export function abrirLauncher(aba: AbaLauncher = 'grade', textoInicial?: string) {
  emitir({ aberto: true, aba, textoInicial })
}

export function fecharLauncher() {
  emitir({ aberto: false, textoInicial: undefined })
}

export function alternarLauncher(aba: AbaLauncher = 'grade') {
  if (estado.aberto) fecharLauncher()
  else abrirLauncher(aba)
}

export function abrirCaixa() {
  emitir({ aberto: false, caixa: true })
}

export function fecharCaixa() {
  emitir({ caixa: false })
}

/** Mostra um toast curto de confirmação, com ação opcional de desfazer. */
export function mostrarToast(texto: string, desfazer?: () => unknown | Promise<unknown>) {
  if (timerToast) clearTimeout(timerToast)
  const id = ++seqToast
  emitir({ toast: { id, texto, desfazer } })
  timerToast = setTimeout(() => {
    if (estado.toast?.id === id) emitir({ toast: null })
  }, 6000)
}

export function esconderToast() {
  if (timerToast) clearTimeout(timerToast)
  emitir({ toast: null })
}

export function useLauncher() {
  return useSyncExternalStore(assinar, () => estado)
}
