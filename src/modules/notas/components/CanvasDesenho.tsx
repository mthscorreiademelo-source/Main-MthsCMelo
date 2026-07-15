import { useEffect, useRef, type PointerEvent } from 'react'
import {
  ALTURA_PAGINA,
  desenharTraco,
  desenharTudo,
  LARGURA_PAGINA,
  tracoAtingido,
} from '../desenho'
import type { Traco } from '../types'

export interface Ferramenta {
  modo: 'caneta' | 'borracha'
  cor: string
  espessura: number
}

interface Props {
  tracos: Traco[]
  ferramenta: Ferramenta
  onNovoTraco: (traco: Traco) => void
  onApagarTraco: (indice: number) => void
}

const CHAVE_CANETA = 'vida:caneta-detectada'
const RAIO_BORRACHA = 18

/**
 * Superfície de desenho: página lógica 1536×2048, pointer events com pressão.
 * Palm rejection: depois que uma stylus é detectada, toques de dedo não desenham.
 */
export function CanvasDesenho({ tracos, ferramenta, onNovoTraco, onApagarTraco }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const emCurso = useRef<number[] | null>(null)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) desenharTudo(ctx, tracos)
  }, [tracos])

  function coordenadas(e: PointerEvent<HTMLCanvasElement>): [number, number] {
    const rect = canvasRef.current!.getBoundingClientRect()
    return [
      ((e.clientX - rect.left) / rect.width) * LARGURA_PAGINA,
      ((e.clientY - rect.top) / rect.height) * ALTURA_PAGINA,
    ]
  }

  function deveIgnorar(e: PointerEvent<HTMLCanvasElement>): boolean {
    if (e.pointerType === 'pen') {
      localStorage.setItem(CHAVE_CANETA, '1')
      return false
    }
    // dedo não desenha depois que uma caneta já foi usada (palm rejection)
    return e.pointerType === 'touch' && localStorage.getItem(CHAVE_CANETA) === '1'
  }

  function apagarEm(x: number, y: number) {
    // do traço mais recente (por cima) para o mais antigo
    for (let i = tracos.length - 1; i >= 0; i--) {
      if (tracoAtingido(tracos[i], x, y, RAIO_BORRACHA)) {
        onApagarTraco(i)
        return
      }
    }
  }

  function aoPressionar(e: PointerEvent<HTMLCanvasElement>) {
    if (deveIgnorar(e)) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const [x, y] = coordenadas(e)
    if (ferramenta.modo === 'borracha') {
      apagarEm(x, y)
      emCurso.current = []
      return
    }
    emCurso.current = [x, y, e.pressure || 0.5]
  }

  function aoMover(e: PointerEvent<HTMLCanvasElement>) {
    if (!emCurso.current || deveIgnorar(e)) return
    const [x, y] = coordenadas(e)
    if (ferramenta.modo === 'borracha') {
      apagarEm(x, y)
      return
    }
    const pontos = emCurso.current
    pontos.push(x, y, e.pressure || 0.5)
    // desenha só o segmento novo, sem re-render completo
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx && pontos.length >= 6) {
      desenharTraco(ctx, {
        cor: ferramenta.cor,
        espessura: ferramenta.espessura,
        pontos: pontos.slice(-6),
      })
    }
  }

  function aoSoltar() {
    const pontos = emCurso.current
    emCurso.current = null
    if (ferramenta.modo === 'borracha' || !pontos || pontos.length < 3) return
    onNovoTraco({ cor: ferramenta.cor, espessura: ferramenta.espessura, pontos })
  }

  return (
    <canvas
      ref={canvasRef}
      width={LARGURA_PAGINA}
      height={ALTURA_PAGINA}
      data-testid="canvas-desenho"
      data-tracos={tracos.length}
      onPointerDown={aoPressionar}
      onPointerMove={aoMover}
      onPointerUp={aoSoltar}
      onPointerCancel={aoSoltar}
      className="w-full cursor-crosshair rounded-xl border border-line bg-white shadow-sm"
      style={{ aspectRatio: '3 / 4', touchAction: 'none' }}
    />
  )
}
