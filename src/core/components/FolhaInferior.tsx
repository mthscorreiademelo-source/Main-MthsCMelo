import { useEffect, type ReactNode } from 'react'

/** Folha inferior (bottom sheet) reutilizável — backdrop + painel deslizante. */
export function FolhaInferior({
  titulo,
  onFechar,
  children,
}: {
  titulo?: string
  onFechar: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onFechar])

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onFechar} />
      <div className="animar-passo relative max-h-[88%] overflow-y-auto rounded-t-3xl bg-bg px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
          {titulo && <h3 className="text-[16px] font-bold">{titulo}</h3>}
          {children}
        </div>
      </div>
    </div>
  )
}
