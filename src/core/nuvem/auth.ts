import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { nuvemAtiva } from './config'
import { obterCliente } from './cliente'

/** Entra com Google — redireciona de volta para o próprio app. */
export async function entrarComGoogle() {
  const cliente = await obterCliente()
  if (!cliente) return
  await cliente.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
  })
}

export async function sair() {
  const cliente = await obterCliente()
  await cliente?.auth.signOut()
}

export interface EstadoSessao {
  pronta: boolean
  sessao: Session | null
  email: string | null
}

/** Observa a sessão do usuário (null quando deslogado ou nuvem desligada). */
export function useSessao(): EstadoSessao {
  const [estado, setEstado] = useState<EstadoSessao>({
    pronta: !nuvemAtiva(),
    sessao: null,
    email: null,
  })

  useEffect(() => {
    if (!nuvemAtiva()) return
    let vivo = true
    let cancelar: (() => void) | undefined

    obterCliente().then((cliente) => {
      if (!cliente || !vivo) return
      cliente.auth.getSession().then(({ data }) => {
        if (!vivo) return
        setEstado({
          pronta: true,
          sessao: data.session,
          email: data.session?.user.email ?? null,
        })
      })
      const { data } = cliente.auth.onAuthStateChange((_evento, sessao) => {
        setEstado({ pronta: true, sessao, email: sessao?.user.email ?? null })
      })
      cancelar = () => data.subscription.unsubscribe()
    })

    return () => {
      vivo = false
      cancelar?.()
    }
  }, [])

  return estado
}
