import { useEffect, useReducer } from 'react'

export type EstadoSync = 'ocioso' | 'sincronizando' | 'ok' | 'erro'

export interface StatusSync {
  estado: EstadoSync
  em?: number
  erro?: string
}

let status: StatusSync = { estado: 'ocioso' }
const ouvintes = new Set<() => void>()

export function definirStatus(s: StatusSync) {
  status = s
  ouvintes.forEach((f) => f())
}

export function useStatusSync(): StatusSync {
  const [, forcar] = useReducer((x) => x + 1, 0)
  useEffect(() => {
    ouvintes.add(forcar)
    return () => {
      ouvintes.delete(forcar)
    }
  }, [])
  return status
}
