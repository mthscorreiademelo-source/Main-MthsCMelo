import { useEffect, useState } from 'react'
import { IconFechar, IconNuvem } from '../components/Icons'
import { cadastrar, entrar } from './auth'

/** Modal simples de e-mail + senha para entrar ou criar conta. */
export function EntrarModal({ onFechar }: { onFechar: () => void }) {
  const [modo, setModo] = useState<'entrar' | 'cadastrar'>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onFechar])

  async function enviar() {
    if (!email.trim() || senha.length < 6) {
      setMsg('Informe e-mail e uma senha de ao menos 6 caracteres.')
      return
    }
    setOcupado(true)
    setMsg(null)
    const r = modo === 'entrar' ? await entrar(email, senha) : await cadastrar(email, senha)
    setOcupado(false)
    if (!r.ok) {
      setMsg(r.mensagem ?? 'Não foi possível continuar.')
      return
    }
    if (r.mensagem) setMsg(r.mensagem) // ex.: confirme o e-mail
    else onFechar() // sessão criada — o app reage sozinho
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-black/40" onClick={onFechar} />
      <div className="animar-passo relative w-full max-w-sm rounded-3xl bg-bg p-6 shadow-xl">
        <button
          onClick={onFechar}
          aria-label="Fechar"
          className="absolute top-4 right-4 flex size-8 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-hover"
        >
          <IconFechar width={18} height={18} />
        </button>

        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-hover">
            <IconNuvem width={24} height={24} className="text-accent" />
          </span>
          <h2 className="text-lg font-bold">
            {modo === 'entrar' ? 'Entrar na sua conta' : 'Criar sua conta'}
          </h2>
          <p className="text-[13px] text-muted">Sincronize o Lume entre seus aparelhos.</p>
        </div>

        <div className="flex flex-col gap-2.5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            autoComplete="email"
            className="w-full rounded-xl border border-line bg-surface/60 px-3 py-2.5 text-[15px] outline-none transition-colors focus:border-muted/50 placeholder:text-muted/60"
          />
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && enviar()}
            placeholder="Senha (mín. 6)"
            autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
            className="w-full rounded-xl border border-line bg-surface/60 px-3 py-2.5 text-[15px] outline-none transition-colors focus:border-muted/50 placeholder:text-muted/60"
          />

          {msg && <p className="px-1 text-[13px] text-muted">{msg}</p>}

          <button
            onClick={enviar}
            disabled={ocupado}
            className="mt-1 flex min-h-12 cursor-pointer items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-bg transition-opacity disabled:opacity-50"
          >
            {ocupado ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
          </button>

          <button
            onClick={() => {
              setModo((m) => (m === 'entrar' ? 'cadastrar' : 'entrar'))
              setMsg(null)
            }}
            className="cursor-pointer py-1 text-[13px] text-muted transition-colors hover:text-ink"
          >
            {modo === 'entrar' ? 'Não tem conta? Criar uma' : 'Já tem conta? Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
