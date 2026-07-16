import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { nuvemAtiva } from './config'
import { obterCliente } from './cliente'

export interface Resultado {
  ok: boolean
  /** Mensagem amigável quando algo falha, ou aviso (ex.: confirme o e-mail). */
  mensagem?: string
}

function traduzir(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login')) return 'E-mail ou senha incorretos.'
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Este e-mail já tem conta. Tente entrar.'
  if (m.includes('password') && m.includes('6')) return 'A senha precisa de ao menos 6 caracteres.'
  if (m.includes('email') && m.includes('valid')) return 'E-mail inválido.'
  return msg
}

export async function entrar(email: string, senha: string): Promise<Resultado> {
  const cliente = await obterCliente()
  if (!cliente) return { ok: false, mensagem: 'Nuvem não configurada.' }
  const { error } = await cliente.auth.signInWithPassword({ email: email.trim(), password: senha })
  return error ? { ok: false, mensagem: traduzir(error.message) } : { ok: true }
}

export async function cadastrar(email: string, senha: string): Promise<Resultado> {
  const cliente = await obterCliente()
  if (!cliente) return { ok: false, mensagem: 'Nuvem não configurada.' }
  const { data, error } = await cliente.auth.signUp({ email: email.trim(), password: senha })
  if (error) return { ok: false, mensagem: traduzir(error.message) }
  // Sem sessão = o projeto exige confirmação por e-mail.
  if (!data.session) {
    return { ok: true, mensagem: 'Conta criada! Confirme o e-mail que enviamos para entrar.' }
  }
  return { ok: true }
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
        setEstado({ pronta: true, sessao: data.session, email: data.session?.user.email ?? null })
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
