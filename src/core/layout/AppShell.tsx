import { useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { IconButton } from '../components/Button'
import {
  IconDownload,
  IconLua,
  IconMenu,
  IconSol,
  IconUpload,
} from '../components/Icons'
import { exportarBackup, importarBackup } from '../db/db'
import { MODULOS } from '../modules'
import { useTheme } from '../theme/useTheme'

const CHAVE_SIDEBAR = 'vida:sidebar'

export function AppShell() {
  const [aberta, setAberta] = useState(
    () => localStorage.getItem(CHAVE_SIDEBAR) !== 'fechada',
  )
  const [overlay, setOverlay] = useState(false)
  const { pathname } = useLocation()

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
            <Outlet />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 pb-24 md:px-10">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  )
}

function Sidebar({ aoNavegar }: { aoNavegar?: () => void }) {
  const { tema, alternar } = useTheme()
  const [status, setStatus] = useState('')
  const inputArquivo = useRef<HTMLInputElement>(null)

  function avisar(msg: string) {
    setStatus(msg)
    setTimeout(() => setStatus(''), 4000)
  }

  async function exportar() {
    const dados = await exportarBackup()
    const blob = new Blob([JSON.stringify(dados, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lume-backup-${dados.exportadoEm.slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    avisar('Backup exportado')
  }

  async function importar(arquivo: File) {
    try {
      const json = JSON.parse(await arquivo.text())
      const { tasks, paginas } = await importarBackup(json)
      avisar(`Restaurado: ${tasks} tarefa(s), ${paginas} página(s)`)
    } catch {
      avisar('Arquivo de backup inválido')
    }
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-line bg-surface">
      <div className="px-4 pt-5 pb-3">
        <span className="text-lg font-bold tracking-tight">Lume</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2" aria-label="Módulos">
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

      <footer className="flex flex-col gap-0.5 border-t border-line px-2 py-3">
        <button
          onClick={alternar}
          className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-hover/70"
        >
          {tema === 'dark' ? <IconSol width={17} height={17} /> : <IconLua width={17} height={17} />}
          {tema === 'dark' ? 'Modo claro' : 'Modo escuro'}
        </button>
        <button
          onClick={exportar}
          className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-hover/70"
        >
          <IconDownload width={17} height={17} />
          Exportar backup
        </button>
        <button
          onClick={() => inputArquivo.current?.click()}
          className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-hover/70"
        >
          <IconUpload width={17} height={17} />
          Importar backup
        </button>
        <input
          ref={inputArquivo}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const arquivo = e.target.files?.[0]
            if (arquivo) importar(arquivo)
            e.target.value = ''
          }}
        />
        {status && <p className="px-3 pt-1 text-xs text-muted">{status}</p>}
      </footer>
    </aside>
  )
}
