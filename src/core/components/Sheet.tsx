import { useEffect, type ReactNode } from 'react'
import { IconButton } from './Button'
import { IconFechar } from './Icons'

interface Props {
  aberto: boolean
  titulo: string
  onFechar: () => void
  children: ReactNode
}

/** Painel lateral (direita) — padrão de edição confortável para toque em tablet. */
export function Sheet({ aberto, titulo, onFechar, children }: Props) {
  useEffect(() => {
    if (!aberto) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aberto, onFechar])

  return (
    <div
      className={`fixed inset-0 z-40 ${aberto ? '' : 'pointer-events-none'}`}
      aria-hidden={!aberto}
    >
      <div
        onClick={onFechar}
        className={`absolute inset-0 bg-black/25 transition-opacity duration-200 ${
          aberto ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <aside
        role="dialog"
        aria-label={titulo}
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-line bg-bg shadow-xl transition-transform duration-200 ease-out ${
          aberto ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-sm font-semibold text-muted">{titulo}</h2>
          <IconButton onClick={onFechar} aria-label="Fechar">
            <IconFechar />
          </IconButton>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </aside>
    </div>
  )
}
