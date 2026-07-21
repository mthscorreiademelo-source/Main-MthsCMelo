import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './core/layout/AppShell'
import { ErrorBoundary } from './core/components/ErrorBoundary'
import { MODULOS } from './core/modules'
import { nuvemAtiva } from './core/nuvem/config'
import { useSessao } from './core/nuvem/auth'
import { TelaLogin } from './core/nuvem/TelaLogin'
import { useTheme } from './core/theme/useTheme'

/** Splash enquanto verificamos se já existe uma sessão salva. */
function Splash() {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-bg">
      <span className="animate-pulse text-[28px] font-bold tracking-tight text-ink/80">Lume</span>
    </div>
  )
}

/**
 * Portão de entrada: com a nuvem ativa, o app inteiro só aparece depois do
 * login. Primeiro de tudo, o usuário entra ou cria uma conta.
 */
function Portao() {
  // Aplica o tema globalmente (inclusive na tela de login, antes do app).
  useTheme()
  const { pronta, sessao } = useSessao()

  if (nuvemAtiva()) {
    if (!pronta) return <Splash />
    if (!sessao) return <TelaLogin />
  }

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          {MODULOS.map((m) => [
            m.rota === '/' ? (
              <Route key={m.id} index element={<m.Pagina />} />
            ) : (
              <Route key={m.id} path={m.rota} element={<m.Pagina />} />
            ),
            ...(m.subRotas?.map((s) => (
              <Route key={s.caminho} path={s.caminho} element={<s.Pagina />} />
            )) ?? []),
          ])}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <Portao />
    </ErrorBoundary>
  )
}
