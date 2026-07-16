import { PALETA_HUMOR } from '../personalizar'
import { CHAVES_ICONE, IconeFator } from '../../../core/components/icones'

export function SeletorCor({
  valor,
  onEscolher,
}: {
  valor?: string
  onEscolher: (cor: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PALETA_HUMOR.map((c) => (
        <button
          key={c}
          onClick={() => onEscolher(c)}
          aria-label={`Cor ${c}`}
          aria-pressed={valor === c}
          className={`size-8 cursor-pointer rounded-full transition-transform ${
            valor === c ? 'scale-110 ring-2 ring-ink ring-offset-2 ring-offset-bg' : ''
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  )
}

export function SeletorIcone({
  valor,
  cor,
  onEscolher,
}: {
  valor?: string
  cor?: string
  onEscolher: (icone: string) => void
}) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {CHAVES_ICONE.map((chave) => {
        const ativo = valor === chave
        return (
          <button
            key={chave}
            onClick={() => onEscolher(chave)}
            aria-label={`Ícone ${chave}`}
            aria-pressed={ativo}
            className="flex aspect-square cursor-pointer items-center justify-center rounded-xl border transition-colors"
            style={{
              borderColor: ativo ? (cor ?? 'var(--vida-ink)') : 'var(--vida-line)',
              backgroundColor: ativo ? `${cor ?? '#000'}14` : 'transparent',
              color: ativo ? (cor ?? 'var(--vida-ink)') : 'var(--vida-muted)',
            }}
          >
            <IconeFator nome={chave} width={18} height={18} />
          </button>
        )
      })}
    </div>
  )
}

/** Campo de texto padrão dos editores. */
export function CampoTexto({
  valor,
  onMudar,
  placeholder,
  autoFocus,
}: {
  valor: string
  onMudar: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
}) {
  return (
    <input
      value={valor}
      onChange={(e) => onMudar(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className="w-full rounded-xl border border-line bg-surface/60 px-3 py-2.5 text-[15px] outline-none transition-colors focus:border-muted/50 placeholder:text-muted/60"
    />
  )
}
