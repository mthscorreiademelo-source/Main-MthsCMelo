import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconFechar } from './Icons'

/**
 * Janela flutuante centralizada (modal) com fundo escurecido. Usada para ações
 * rápidas — adicionar tarefa, registrar movimentação — de forma minimalista.
 */
export function ModalCentral({
  titulo,
  onFechar,
  children,
  larguraMax = 'max-w-md',
}: {
  titulo?: string
  onFechar: () => void
  children: ReactNode
  larguraMax?: string
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onFechar])

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onFechar} />
      <div className={`lume-pop relative w-full ${larguraMax} rounded-3xl border border-line bg-bg p-5 shadow-2xl`}>
        {titulo && (
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[16px] font-bold">{titulo}</h2>
            <button
              onClick={onFechar}
              aria-label="Fechar"
              className="flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-hover"
            >
              <IconFechar width={17} height={17} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}
