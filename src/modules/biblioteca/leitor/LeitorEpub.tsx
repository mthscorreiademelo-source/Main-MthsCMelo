import { useEffect, useRef } from 'react'
import { TEMAS, type PropsEngine } from './temas'

// epub.js não expõe tipos ergonômicos para o nosso uso; tratamos como any local.
/* eslint-disable @typescript-eslint/no-explicit-any */

function aplicarTema(rendition: any, tema: PropsEngine['tema'], fontePct: number) {
  const cores = TEMAS[tema]
  rendition.themes.override('color', cores.fg)
  rendition.themes.override('background', cores.bg)
  rendition.themes.fontSize(`${fontePct}%`)
}

/** Leitor de EPUB via epub.js (paginado). */
export function LeitorEpub({
  blob,
  tema,
  fontePct,
  inicial,
  onProgresso,
  registrarControles,
}: PropsEngine) {
  const alvo = useRef<HTMLDivElement>(null)
  const rendicaoRef = useRef<any>(null)

  useEffect(() => {
    let vivo = true
    let book: any
    let rendition: any
    ;(async () => {
      const ePub = (await import('epubjs')).default
      const buffer = await blob.arrayBuffer()
      if (!vivo || !alvo.current) return
      book = ePub(buffer as any)
      rendition = book.renderTo(alvo.current, {
        width: '100%',
        height: '100%',
        spread: 'none',
        flow: 'paginated',
      })
      rendicaoRef.current = rendition
      aplicarTema(rendition, tema, fontePct)
      await rendition.display(inicial || undefined)
      registrarControles({ prev: () => rendition.prev(), next: () => rendition.next() })

      try {
        await book.ready
        await book.locations.generate(1200)
      } catch {
        /* geração de localizações é best-effort */
      }
      rendition.on('relocated', (loc: any) => {
        const cfi = loc?.start?.cfi
        if (!cfi) return
        let pct = 0
        try {
          pct = Math.round((book.locations.percentageFromCfi(cfi) || 0) * 100)
        } catch {
          pct = 0
        }
        onProgresso(pct, cfi)
      })
    })()

    return () => {
      vivo = false
      try {
        rendition?.destroy()
        book?.destroy()
      } catch {
        /* ignore */
      }
    }
    // Recria apenas quando o arquivo muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob])

  useEffect(() => {
    if (rendicaoRef.current) aplicarTema(rendicaoRef.current, tema, fontePct)
  }, [tema, fontePct])

  return <div ref={alvo} className="h-full w-full" />
}
