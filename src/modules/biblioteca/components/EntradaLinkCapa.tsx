import { useState } from 'react'

/**
 * Controle compacto "colar link da capa": um botãozinho que abre um campo
 * para colar o endereço de uma imagem da web. Guardar o link (em vez do
 * arquivo embutido) economiza espaço na nuvem numa biblioteca grande.
 */
export function EntradaLinkCapa({ onLink }: { onLink: (url: string) => void }) {
  const [aberto, setAberto] = useState(false)
  const [url, setUrl] = useState('')

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="self-start text-[11px] text-muted underline-offset-2 transition-colors hover:text-ink hover:underline"
      >
        colar link da capa
      </button>
    )
  }

  const usar = () => {
    const u = url.trim()
    if (!u) {
      setAberto(false)
      return
    }
    // aceita só link http(s) ou data:; se não for, mantém o campo aberto pra corrigir
    let valido = false
    try {
      const p = new URL(u)
      valido = p.protocol === 'http:' || p.protocol === 'https:' || p.protocol === 'data:'
    } catch {
      valido = false
    }
    if (!valido) return
    setUrl('')
    setAberto(false)
    onLink(u)
  }

  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') usar()
          else if (e.key === 'Escape') {
            setUrl('')
            setAberto(false)
          }
        }}
        placeholder="https://…/capa.jpg"
        className="min-h-8 min-w-0 flex-1 rounded-md border border-line bg-surface px-2 text-[12px] outline-none focus:border-muted/60"
      />
      <button onClick={usar} className="shrink-0 px-1 text-[11px] font-medium text-accent">
        usar
      </button>
    </div>
  )
}
