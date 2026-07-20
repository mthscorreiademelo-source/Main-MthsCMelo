import { useEffect, useRef } from 'react'
import { TEMAS, type PropsEngine } from './temas'
import type { Destaque } from '../types'

// epub.js não expõe tipos ergonômicos para o nosso uso; tratamos como any local.
/* eslint-disable @typescript-eslint/no-explicit-any */

function aplicarTema(rendition: any, tema: PropsEngine['tema'], fontePct: number) {
  const cores = TEMAS[tema]
  rendition.themes.override('color', cores.fg)
  rendition.themes.override('background', cores.bg)
  rendition.themes.fontSize(`${fontePct}%`)
}

interface Props extends PropsEngine {
  destaques: Destaque[]
  onSelecao: (cfiRange: string, texto: string, capitulo?: string) => void
  /** quando muda, salta o leitor para este CFI. */
  irParaCfi?: string
  onAbrirDestaque?: (cfi: string) => void
}

/** Leitor de EPUB via epub.js (paginado), com seleção → destaques/notas. */
export function LeitorEpub({
  blob,
  tema,
  fontePct,
  onProgresso,
  registrarControles,
  destaques,
  onSelecao,
  irParaCfi,
  onAbrirDestaque,
}: Props) {
  const alvo = useRef<HTMLDivElement>(null)
  const rendicaoRef = useRef<any>(null)
  const bookRef = useRef<any>(null)
  const capituloRef = useRef<string | undefined>(undefined)
  const aplicadosRef = useRef<Set<string>>(new Set())
  const destaquesRef = useRef<Destaque[]>(destaques)
  destaquesRef.current = destaques

  useEffect(() => {
    let vivo = true
    let book: any
    let rendition: any
    ;(async () => {
      const ePub = (await import('epubjs')).default
      const buffer = await blob.arrayBuffer()
      if (!vivo || !alvo.current) return
      book = ePub(buffer as any)
      bookRef.current = book
      rendition = book.renderTo(alvo.current, { width: '100%', height: '100%', spread: 'none', flow: 'paginated' })
      rendicaoRef.current = rendition
      rendition.themes.default({ 'h1, h2': { 'break-before': 'column', 'page-break-before': 'always' } })
      aplicarTema(rendition, tema, fontePct)
      await rendition.display(irParaCfi || undefined)
      registrarControles({ prev: () => rendition.prev(), next: () => rendition.next() })

      // Seleção de texto → cria destaque/nota naquele ponto.
      rendition.on('selected', (cfiRange: string, contents: any) => {
        book.getRange(cfiRange).then((range: Range) => {
          const texto = range?.toString().trim()
          if (texto) onSelecao(cfiRange, texto, capituloRef.current)
        })
        try {
          contents?.window?.getSelection()?.removeAllRanges()
        } catch {
          /* ignore */
        }
      })

      try {
        await book.ready
        await book.locations.generate(1200)
      } catch {
        /* best-effort */
      }
      // aplica os destaques salvos após carregar
      aplicarDestaques()
      rendition.on('relocated', (loc: any) => {
        const cfi = loc?.start?.cfi
        const href = loc?.start?.href
        if (href) {
          try {
            const item = book.navigation?.get(href)
            capituloRef.current = item?.label?.trim() || undefined
          } catch {
            /* ignore */
          }
        }
        if (!cfi) return
        let pct = 0
        try {
          pct = Math.round((book.locations.percentageFromCfi(cfi) || 0) * 100)
        } catch {
          pct = 0
        }
        onProgresso(pct, cfi)
      })
      // re-aplica ao trocar de página (annotations somem entre views)
      rendition.on('rendered', aplicarDestaques)
    })()

    function aplicarDestaques() {
      const r = rendicaoRef.current
      if (!r) return
      const atuais = new Set(destaquesRef.current.filter((d) => d.cfi).map((d) => d.cfi!))
      // remove os que saíram
      for (const cfi of aplicadosRef.current) {
        if (!atuais.has(cfi)) {
          try { r.annotations.remove(cfi, 'highlight') } catch { /* ignore */ }
          aplicadosRef.current.delete(cfi)
        }
      }
      for (const d of destaquesRef.current) {
        if (!d.cfi || aplicadosRef.current.has(d.cfi)) continue
        try {
          r.annotations.highlight(d.cfi, {}, () => onAbrirDestaque?.(d.cfi!), 'hl', { fill: d.cor ?? '#f6c945', 'fill-opacity': '0.35' })
          aplicadosRef.current.add(d.cfi)
        } catch {
          /* ignore */
        }
      }
    }
    ;(rendicaoRef as any).aplicarDestaques = aplicarDestaques

    return () => {
      vivo = false
      try {
        rendition?.destroy()
        book?.destroy()
      } catch {
        /* ignore */
      }
      aplicadosRef.current = new Set()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob])

  // re-aplica destaques quando a lista muda
  useEffect(() => {
    const fn = (rendicaoRef as any).aplicarDestaques
    if (fn) fn()
  }, [destaques])

  // salta para um CFI (clicar num destaque/nota da lista)
  useEffect(() => {
    if (irParaCfi && rendicaoRef.current) {
      try { rendicaoRef.current.display(irParaCfi) } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [irParaCfi])

  useEffect(() => {
    if (rendicaoRef.current) aplicarTema(rendicaoRef.current, tema, fontePct)
  }, [tema, fontePct])

  return <div ref={alvo} className="h-full w-full" />
}
