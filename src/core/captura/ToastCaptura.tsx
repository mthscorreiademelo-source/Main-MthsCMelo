import { createPortal } from 'react-dom'
import { esconderToast, useLauncher } from './store'

/** Toast global de confirmação com ação de desfazer. */
export function ToastCaptura() {
  const { toast } = useLauncher()
  if (!toast) return null
  return createPortal(
    <div
      className="lume-pop fixed inset-x-0 z-[80] mx-auto flex w-[calc(100%-2rem)] max-w-sm items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-surface shadow-2xl"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
      role="status"
    >
      <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{toast.texto}</span>
      {toast.desfazer && (
        <button
          onClick={async () => { await toast.desfazer?.(); esconderToast() }}
          className="shrink-0 rounded-full px-2 py-0.5 text-[13px] font-bold text-surface underline underline-offset-2 hover:opacity-80"
        >
          Desfazer
        </button>
      )}
      <button onClick={esconderToast} aria-label="Fechar" className="shrink-0 text-[15px] leading-none text-surface/70 hover:text-surface">×</button>
    </div>,
    document.body,
  )
}
