import { useState } from 'react'
import { IconLua, IconSol } from '../components/Icons'
import { useTheme } from '../theme/useTheme'
import { cadastrar, entrar, recuperarSenha, reenviarConfirmacao } from './auth'

type Modo = 'entrar' | 'cadastrar' | 'recuperar' | 'confirmar'

/**
 * Tela de entrada em tela cheia — o app inteiro fica atrás dela até o login.
 * Primeiro de tudo: entrar ou criar conta.
 */
export function TelaLogin() {
  const { tema, alternar } = useTheme()
  const [modo, setModo] = useState<Modo>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  const titulo =
    modo === 'entrar'
      ? 'Bem-vindo de volta'
      : modo === 'cadastrar'
        ? 'Crie sua conta'
        : modo === 'recuperar'
          ? 'Recuperar acesso'
          : 'Confirme seu e-mail'
  const subtitulo =
    modo === 'entrar'
      ? 'Entre para acessar tudo, guardado com segurança na sua conta.'
      : modo === 'cadastrar'
        ? 'Uma conta para guardar seus dados na nuvem e acessar de qualquer aparelho.'
        : modo === 'recuperar'
          ? 'Informe seu e-mail e enviaremos um link para redefinir a senha.'
          : 'Falta um passo para ativar sua conta.'

  async function enviar() {
    setMsg(null)
    setErro(false)
    if (!email.trim()) {
      setErro(true); setMsg('Informe seu e-mail.')
      return
    }
    if (modo !== 'recuperar' && senha.length < 6) {
      setErro(true); setMsg('A senha precisa de ao menos 6 caracteres.')
      return
    }
    setOcupado(true)
    const r =
      modo === 'entrar'
        ? await entrar(email, senha)
        : modo === 'cadastrar'
          ? await cadastrar(email, senha)
          : await recuperarSenha(email)
    setOcupado(false)
    if (!r.ok) {
      setErro(true)
      setMsg(r.mensagem ?? 'Não foi possível continuar.')
      return
    }
    // Cadastro que exige confirmação de e-mail → estado dedicado.
    if (r.precisaConfirmar) {
      setModo('confirmar')
      setErro(false)
      setMsg(null)
      return
    }
    // Sucesso: se veio mensagem (ex.: link enviado), mostra; senão a sessão
    // foi criada e o app aparece sozinho (o gate reage).
    if (r.mensagem) {
      setErro(false)
      setMsg(r.mensagem)
    }
  }

  async function reenviar() {
    setOcupado(true)
    setErro(false)
    const r = await reenviarConfirmacao(email)
    setOcupado(false)
    setErro(!r.ok)
    setMsg(r.mensagem ?? null)
  }

  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-bg px-5 py-10 text-ink">
      {/* brilho suave de fundo */}
      <div
        className="pointer-events-none absolute -top-1/3 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--vida-accent), transparent 70%)' }}
      />

      {/* alternar tema no canto */}
      <button
        onClick={alternar}
        aria-label="Alternar tema"
        className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:text-ink"
      >
        {tema === 'dark' ? <IconSol width={16} height={16} /> : <IconLua width={16} height={16} />}
      </button>

      <div className="relative w-full max-w-sm">
        {/* marca */}
        <div className="mb-7 flex flex-col items-center gap-2 text-center">
          <span className="text-[32px] font-bold tracking-tight">Lume</span>
          <span className="text-[13px] text-muted">Sua vida, organizada com leveza.</span>
        </div>

        <div className="rounded-3xl border border-line bg-surface/70 p-6 shadow-xl backdrop-blur">
          <h1 className="text-[19px] font-bold">{titulo}</h1>
          <p className="mt-1 text-[13px] leading-snug text-muted">{subtitulo}</p>

          {modo === 'confirmar' ? (
            <div className="mt-5 flex flex-col gap-3">
              <div className="flex items-center gap-3 rounded-2xl bg-accent/10 p-3.5">
                <span className="text-[26px]" aria-hidden>📬</span>
                <p className="text-[13px] leading-snug">
                  Enviamos um link de confirmação para <span className="font-semibold">{email}</span>. Abra o e-mail e clique no link para ativar sua conta e entrar.
                </p>
              </div>
              {msg && <p className={`px-1 text-[13px] ${erro ? 'text-danger' : 'text-accent'}`}>{msg}</p>}
              <button
                onClick={reenviar}
                disabled={ocupado}
                className="flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-line text-[14px] font-medium text-muted transition-colors hover:text-ink disabled:opacity-50"
              >
                {ocupado ? 'Reenviando…' : 'Reenviar e-mail de confirmação'}
              </button>
              <button
                onClick={() => { setModo('entrar'); setMsg(null); setErro(false) }}
                className="flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-ink text-[14px] font-semibold text-bg"
              >
                Já confirmei — entrar
              </button>
            </div>
          ) : (
          <div className="mt-5 flex flex-col gap-2.5">
            <label className="flex flex-col gap-1">
              <span className="px-1 text-[12px] font-medium text-muted">E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && enviar()}
                placeholder="seu@email.com"
                autoComplete="email"
                autoCapitalize="none"
                className="w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-[15px] outline-none transition-colors focus:border-accent placeholder:text-muted/60"
              />
            </label>

            {modo !== 'recuperar' && (
              <label className="flex flex-col gap-1">
                <span className="px-1 text-[12px] font-medium text-muted">Senha</span>
                <div className="flex items-center rounded-xl border border-line bg-bg pr-2 transition-colors focus-within:border-accent">
                  <input
                    type={verSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && enviar()}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
                    className="w-full bg-transparent px-3 py-2.5 text-[15px] outline-none placeholder:text-muted/60"
                  />
                  <button
                    type="button"
                    onClick={() => setVerSenha((v) => !v)}
                    className="shrink-0 rounded-lg px-2 py-1 text-[12px] font-medium text-muted hover:text-ink"
                  >
                    {verSenha ? 'ocultar' : 'ver'}
                  </button>
                </div>
              </label>
            )}

            {msg && (
              <p className={`px-1 text-[13px] leading-snug ${erro ? 'text-danger' : 'text-accent'}`}>{msg}</p>
            )}

            <button
              onClick={enviar}
              disabled={ocupado}
              className="mt-1 flex min-h-12 cursor-pointer items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-bg transition-opacity disabled:opacity-50"
            >
              {ocupado
                ? 'Aguarde…'
                : modo === 'entrar'
                  ? 'Entrar'
                  : modo === 'cadastrar'
                    ? 'Criar conta'
                    : 'Enviar link'}
            </button>

            {modo === 'entrar' && (
              <button
                onClick={() => { setModo('recuperar'); setMsg(null); setErro(false) }}
                className="cursor-pointer py-0.5 text-[12.5px] text-muted transition-colors hover:text-ink"
              >
                Esqueci minha senha
              </button>
            )}
          </div>
          )}
        </div>

        {/* alternar entrar / cadastrar */}
        {modo !== 'confirmar' && (
        <div className="mt-4 text-center text-[13px] text-muted">
          {modo === 'recuperar' ? (
            <button onClick={() => { setModo('entrar'); setMsg(null); setErro(false) }} className="cursor-pointer font-medium text-ink hover:underline">
              ← Voltar para o login
            </button>
          ) : modo === 'entrar' ? (
            <>
              Não tem conta?{' '}
              <button onClick={() => { setModo('cadastrar'); setMsg(null); setErro(false) }} className="cursor-pointer font-semibold text-accent hover:underline">
                Criar uma agora
              </button>
            </>
          ) : (
            <>
              Já tem conta?{' '}
              <button onClick={() => { setModo('entrar'); setMsg(null); setErro(false) }} className="cursor-pointer font-semibold text-accent hover:underline">
                Entrar
              </button>
            </>
          )}
        </div>
        )}
      </div>
    </div>
  )
}
