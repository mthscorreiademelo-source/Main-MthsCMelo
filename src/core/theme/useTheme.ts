import { useCallback, useSyncExternalStore } from 'react'
import { aplicarPapel } from './papel'

type Tema = 'light' | 'dark'
const CHAVE = 'vida:tema'

function temaInicial(): Tema {
  const salvo = localStorage.getItem(CHAVE)
  if (salvo === 'light' || salvo === 'dark') return salvo
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Estado GLOBAL do tema: um único valor compartilhado por todos os componentes.
// Assim, alternar o tema em qualquer lugar atualiza a tela inteira na hora
// (capas de notas, etc.), sem precisar recarregar ou trocar de aba.
let temaAtual: Tema = temaInicial()
const ouvintes = new Set<() => void>()

function aplicarNoDocumento(t: Tema) {
  document.documentElement.classList.toggle('dark', t === 'dark')
  aplicarPapel(t)
}

// Aplica assim que o módulo carrega (antes da primeira pintura do app).
aplicarNoDocumento(temaAtual)

function definirTema(t: Tema) {
  if (t === temaAtual) return
  temaAtual = t
  localStorage.setItem(CHAVE, t)
  aplicarNoDocumento(t)
  ouvintes.forEach((l) => l())
}

function subscrever(l: () => void) {
  ouvintes.add(l)
  return () => ouvintes.delete(l)
}
function ler(): Tema {
  return temaAtual
}

export function useTheme() {
  const tema = useSyncExternalStore(subscrever, ler, ler)
  const alternar = useCallback(() => definirTema(temaAtual === 'dark' ? 'light' : 'dark'), [])
  const definir = useCallback((t: Tema) => definirTema(t), [])
  return { tema, alternar, definir }
}
