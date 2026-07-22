import { useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { obterCliente } from '../cliente'
import { cursorLocalStorage, localDexie } from './dexieLocal'
import { sincronizar } from './engine'
import { definirStatus } from './estado'
import { sincronizarAnexos } from './anexos'
import { transporteSupabase } from './supabaseTransporte'

const INTERVALO_MS = 12000

// Exposto para diagnóstico/teste do motor no navegador (inofensivo).
if (typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__lumeSync = { sincronizar, localDexie }
}

function iniciar(clienteUid: { cliente: Awaited<ReturnType<typeof obterCliente>>; uid: string }) {
  const { cliente, uid } = clienteUid
  if (!cliente) return () => {}
  const transporte = transporteSupabase(cliente, uid)
  const cursor = cursorLocalStorage(uid)

  let rodando = false
  let pendente = false
  let parado = false

  async function rodar() {
    if (parado || !navigator.onLine) return
    if (rodando) {
      pendente = true
      return
    }
    rodando = true
    definirStatus({ estado: 'sincronizando' })
    try {
      await sincronizar(localDexie, transporte, cursor)
      // Binários dos anexos (Storage) — isolado e defensivo, nunca derruba o sync.
      await sincronizarAnexos(cliente, uid)
      definirStatus({ estado: 'ok', em: Date.now() })
    } catch (e) {
      console.error('[lume sync] falha:', e)
      definirStatus({ estado: 'erro', em: Date.now(), erro: (e as Error)?.message ?? String(e) })
    } finally {
      rodando = false
      if (pendente && !parado) {
        pendente = false
        void rodar()
      }
    }
  }

  const intervalo = setInterval(rodar, INTERVALO_MS)
  const aoAtivar = () => void rodar()
  const aoVisivel = () => {
    if (!document.hidden) void rodar()
  }
  window.addEventListener('focus', aoAtivar)
  window.addEventListener('online', aoAtivar)
  document.addEventListener('visibilitychange', aoVisivel)
  void rodar()

  return () => {
    parado = true
    clearInterval(intervalo)
    window.removeEventListener('focus', aoAtivar)
    window.removeEventListener('online', aoAtivar)
    document.removeEventListener('visibilitychange', aoVisivel)
  }
}

/** Liga a sincronização enquanto houver sessão. */
export function useSincronizacao(session: Session | null) {
  const uid = session?.user.id
  useEffect(() => {
    if (!uid) return
    let vivo = true
    let parar = () => {}
    obterCliente().then((cliente) => {
      if (!vivo) return
      parar = iniciar({ cliente, uid })
    })
    return () => {
      vivo = false
      parar()
    }
  }, [uid])
}
