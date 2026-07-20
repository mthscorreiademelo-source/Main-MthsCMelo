import { useState } from 'react'
import { IconFechar } from '../../../core/components/Icons'

/**
 * Editor de tags/gêneros em chips: digitar + Enter (ou vírgula) adiciona;
 * Backspace no campo vazio remove a última; cada chip tem um × para remover.
 * Não duplica (ignora maiúsculas/minúsculas).
 */
export function EditorTags({
  tags,
  onChange,
  placeholder,
  rotulo = 'Tags',
}: {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  /** rótulo acessível do campo (aria-label do input). */
  rotulo?: string
}) {
  const [texto, setTexto] = useState('')

  function adicionar(bruto: string) {
    const t = bruto.replace(/,/g, '').trim()
    setTexto('')
    if (!t) return
    if (tags.some((x) => x.toLowerCase() === t.toLowerCase())) return
    onChange([...tags, t])
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-2 focus-within:border-muted/60">
      {tags.map((t) => (
        <span
          key={t}
          className="flex items-center gap-1 rounded-full bg-hover py-1 pr-1.5 pl-2.5 text-[13px] font-medium text-ink"
        >
          {t}
          <button
            onClick={() => onChange(tags.filter((x) => x !== t))}
            aria-label={`Remover ${t}`}
            className="flex size-4 items-center justify-center rounded-full text-muted transition-colors hover:bg-line hover:text-ink"
          >
            <IconFechar width={11} height={11} />
          </button>
        </span>
      ))}
      <input
        aria-label={rotulo}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            adicionar(texto)
          } else if (e.key === 'Backspace' && !texto && tags.length) {
            onChange(tags.slice(0, -1))
          }
        }}
        onBlur={() => texto.trim() && adicionar(texto)}
        placeholder={tags.length ? '' : placeholder}
        className="min-w-[10ch] flex-1 bg-transparent px-1 py-0.5 text-[14px] outline-none"
      />
    </div>
  )
}
