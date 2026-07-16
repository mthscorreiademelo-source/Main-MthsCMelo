import { useEffect, useRef, useState } from 'react'
import type { Controles } from './temas'

/**
 * Leitor paginado genérico (para PDF e CBZ): recebe o total de páginas e uma
 * função que devolve a imagem (URL) de cada página, e cuida de navegação +
 * progresso. Quem cria o `provider` decide como renderizar (pdf.js / imagens).
 */
export function LeitorPaginado({
  total,
  provider,
  inicial,
  onProgresso,
  registrarControles,
}: {
  total: number
  provider: (n: number) => Promise<string | undefined>
  inicial: number
  onProgresso: (pct: number, localizacao: string) => void
  registrarControles: (c: Controles) => void
}) {
  const [pagina, setPagina] = useState(Math.min(Math.max(0, inicial), Math.max(0, total - 1)))
  const [src, setSrc] = useState<string | undefined>()
  const paginaRef = useRef(pagina)
  paginaRef.current = pagina

  useEffect(() => {
    registrarControles({
      prev: () => setPagina((p) => Math.max(0, p - 1)),
      next: () => setPagina((p) => Math.min(total - 1, p + 1)),
    })
  }, [total, registrarControles])

  useEffect(() => {
    let vivo = true
    provider(pagina).then((s) => {
      if (vivo) setSrc(s)
    })
    onProgresso(total > 0 ? Math.round(((pagina + 1) / total) * 100) : 0, String(pagina))
    return () => {
      vivo = false
    }
  }, [pagina, provider, total, onProgresso])

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden">
      {src ? (
        <img src={src} alt={`Página ${pagina + 1}`} className="max-h-full max-w-full object-contain" />
      ) : (
        <span className="text-sm text-muted">Carregando página…</span>
      )}
    </div>
  )
}
