import type { ReactNode } from 'react'
import { IconChevron } from '../../../core/components/Icons'

export const ROTULO = 'text-[11px] font-semibold uppercase tracking-wide text-muted'

/** Controles modulares injetados pela página do workspace em cada card. */
export interface ControleCartao {
  recolhido: boolean
  onRecolher: () => void
  personalizando?: boolean
  onSubir?: () => void
  onDescer?: () => void
  onOcultar?: () => void
}

/**
 * Moldura de um card do workspace. Modular: pode recolher/expandir e, no modo
 * "personalizar", subir/descer/ocultar. O conteúdo fica em `children`.
 */
export function CartaoModulo({
  titulo,
  emoji,
  recolhido,
  onRecolher,
  acao,
  personalizando,
  onSubir,
  onDescer,
  onOcultar,
  children,
}: {
  titulo: string
  emoji: string
  recolhido: boolean
  onRecolher: () => void
  acao?: ReactNode
  personalizando?: boolean
  onSubir?: () => void
  onDescer?: () => void
  onOcultar?: () => void
  children: ReactNode
}) {
  return (
    <section className="lume-entrada flex break-inside-avoid flex-col overflow-hidden rounded-2xl border border-line bg-surface/50">
      <header className="flex items-center gap-2 px-4 py-3">
        <button
          onClick={onRecolher}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          title={recolhido ? 'Expandir' : 'Recolher'}
        >
          <span className="text-[15px]" aria-hidden>{emoji}</span>
          <h3 className="truncate text-[14px] font-semibold">{titulo}</h3>
          <IconChevron width={15} height={15} className={`shrink-0 text-muted transition-transform ${recolhido ? '-rotate-90' : ''}`} />
        </button>
        {personalizando ? (
          <div className="flex items-center gap-0.5">
            <button onClick={onSubir} className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink" title="Subir">↑</button>
            <button onClick={onDescer} className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink" title="Descer">↓</button>
            <button onClick={onOcultar} className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink" title="Ocultar">✕</button>
          </div>
        ) : (
          acao
        )}
      </header>
      {!recolhido && <div className="px-4 pb-4">{children}</div>}
    </section>
  )
}

/** Estado vazio compacto dentro de um card. */
export function Vazio({ children }: { children: ReactNode }) {
  return <p className="py-1 text-[13px] text-muted">{children}</p>
}
