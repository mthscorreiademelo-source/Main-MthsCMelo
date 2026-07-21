import { useCallback, useEffect, useState } from 'react'
import { aplicarPapel } from './papel'

type Tema = 'light' | 'dark'
const CHAVE = 'vida:tema'

function temaInicial(): Tema {
  const salvo = localStorage.getItem(CHAVE)
  if (salvo === 'light' || salvo === 'dark') return salvo
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function useTheme() {
  const [tema, setTema] = useState<Tema>(temaInicial)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'dark')
    localStorage.setItem(CHAVE, tema)
    aplicarPapel(tema)
  }, [tema])

  const alternar = useCallback(() => {
    setTema((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  return { tema, alternar }
}
