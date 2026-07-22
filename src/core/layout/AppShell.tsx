import { Suspense, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { IconButton } from '../components/Button'
import { IconMenu } from '../components/Icons'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { MODULOS } from '../modules'
import { useSessao } from '../nuvem/auth'
import { useSincronizacao } from '../nuvem/sync'
import { RodapeConta } from './RodapeConta'
import { BotaoGlobal } from '../captura/BotaoGlobal'
import { LauncherCaptura } from '../captura/LauncherCaptura'
import { ToastCaptura } from '../captura/ToastCaptura'

const CHAVE_SIDEBAR = 'vida:sidebar'

export function AppShell() {
  const [aberta, setAberta] = useState(
    () => localStorage.getItem(CHAVE_SIDEBAR) !== 'fechada',
  )
  const [overlay, setOverlay] = useState(false)
  const { pathname } = useLocation()
  const { sessao } = useSessao()
  useSincronizacao(sessao)

  const moduloAtual =
    MODULOS.find((m) =>
      m.rota === '/'
        ? pathname === '/'
        : pathname === m.rota || pathname.startsWith(`${m.rota}/`),
    ) ?? MODULOS[0]

  function alternarSidebar() {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setAberta((v) => {
        localStorage.setItem(CHAVE_SIDEBAR, v ? 'fechada' : 'aberta')
        return !v
      })
    } else {
      setOverlay((v) => !v)
    }
  }

  return (
    <div className="flex h-full">
      {/* Sidebar fixa (paisagem / telas grandes) */}
      <div
        className={`hidden shrink-0 overflow-hidden transition-[width] duration-200 ease-out lg:block ${
          aberta ? 'w-64' : 'w-0'
        }`}
      >
        <Sidebar />
      </div>

      {/* Sidebar overlay (retrato / telas pequenas) */}
      <div className={`fixed inset-0 z-30 lg:hidden ${overlay ? '' : 'pointer-events-none'}`}>
        <div
          onClick={() => setOverlay(false)}
          className={`absolute inset-0 bg-black/25 transition-opacity duration-200 ${
            overlay ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div
          className={`absolute inset-y-0 left-0 transition-transform duration-200 ease-out ${
            overlay ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar aoNavegar={() => setOverlay(false)} />
        </div>
      </div>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-1 px-3">
          <IconButton onClick={alternarSidebar} aria-label="Alternar menu">
            <IconMenu />
          </IconButton>
          <span className="text-sm font-semibold">{moduloAtual.nome}</span>
        </header>
        {moduloAtual.telaCheia ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <ErrorBoundary resetKey={pathname}>
              <Suspense fallback={<CarregandoTela />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 pb-24 md:px-10">
            <ErrorBoundary resetKey={pathname}>
              <Suspense fallback={<CarregandoTela />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>
        )}
      </main>

      {/* Captura Rápida (Quick Actions) — global em todas as páginas. */}
      <BotaoGlobal />
      <LauncherCaptura />
      <ToastCaptura />
    </div>
  )
}

/** Fallback discreto enquanto o chunk da rota carrega (code-splitting). */
function CarregandoTela() {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center">
      <span className="size-6 animate-spin rounded-full border-2 border-line border-t-muted" aria-label="Carregando" />
    </div>
  )
}

function Sidebar({ aoNavegar }: { aoNavegar?: () => void }) {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-line bg-surface">
      <div className="px-4 pt-5 pb-3">
        <span className="text-lg font-bold tracking-tight">Lume</span>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2" aria-label="Módulos">
        {MODULOS.map((m) => (
          <NavLink
            key={m.id}
            to={m.rota}
            end={m.rota === '/'}
            onClick={aoNavegar}
            className={({ isActive }) =>
              `flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors ${
                isActive ? 'bg-hover text-ink' : 'text-muted hover:bg-hover/70'
              }`
            }
          >
            <m.Icone width={17} height={17} />
            {m.nome}
          </NavLink>
        ))}
      </nav>

      <RodapeConta />
    </aside>
  )
}
