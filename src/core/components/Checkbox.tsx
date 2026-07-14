import { IconCheck } from './Icons'

interface Props {
  marcado: boolean
  onChange: (marcado: boolean) => void
  rotulo?: string
}

/** Checkbox de toque amplo (44px) no estilo Notion. */
export function Checkbox({ marcado, onChange, rotulo }: Props) {
  return (
    <button
      role="checkbox"
      aria-checked={marcado}
      aria-label={rotulo}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!marcado)
      }}
      className="flex size-11 shrink-0 cursor-pointer items-center justify-center"
    >
      <span
        className={`flex size-[18px] items-center justify-center rounded-[4px] border transition-all duration-150 ${
          marcado
            ? 'border-accent bg-accent text-white'
            : 'border-muted/70 bg-transparent text-transparent'
        }`}
      >
        <IconCheck width={13} height={13} strokeWidth={2.6} />
      </span>
    </button>
  )
}
