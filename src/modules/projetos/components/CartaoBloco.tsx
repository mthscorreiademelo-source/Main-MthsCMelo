import { type ReactNode } from 'react'
import { IconChevron } from '../../../core/components/Icons'

/** Wrapper de um módulo/bloco do Workspace: título, recolher, reordenar, remover. */
export function CartaoBloco({
  emoji,
  titulo,
  acao,
  recolhido,
  personalizando,
  onRecolher,
  onSubir,
  onDescer,
  onRemover,
  children,
}: {
  emoji: string
  titulo: string
  acao?: ReactNode
  recolhido?: boolean
  personalizando?: boolean
  onRecolher?: () => void
  onSubir?: () => void
  onDescer?: () => void
  onRemover?: () => void
  children: ReactNode
}) {
  return (
    <section className="flex flex-col rounded-2xl border border-line bg-surface/50">
      <header className="flex items-center gap-2 px-3.5 py-2.5">
        <button onClick={onRecolher} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="text-[15px]" aria-hidden>{emoji}</span>
          <span className="truncate text-[13.5px] font-semibold">{titulo}</span>
          <IconChevron width={14} height={14} className={`shrink-0 text-muted transition-transform ${recolhido ? '' : 'rotate-180'}`} />
        </button>
        {personalizando ? (
          <div className="flex items-center gap-0.5">
            <button onClick={onSubir} className="flex size-7 items-center justify-center rounded-lg text-muted hover:bg-hover" title="Subir">↑</button>
            <button onClick={onDescer} className="flex size-7 items-center justify-center rounded-lg text-muted hover:bg-hover" title="Descer">↓</button>
            <button onClick={onRemover} className="flex size-7 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-danger" title="Remover módulo">×</button>
          </div>
        ) : (
          acao
        )}
      </header>
      {!recolhido && <div className="px-3.5 pb-3.5">{children}</div>}
    </section>
  )
}
