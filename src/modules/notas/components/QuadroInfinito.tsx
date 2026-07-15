import { useCallback, useEffect, useRef } from 'react'
import { desenharTraco, limitesDosTracos, tracoAtingido } from '../desenho'
import type { Camera, TipoCaneta, Traco } from '../types'

export interface FerramentaAtiva {
  modo: TipoCaneta | 'borracha'
  cor: string
  espessura: number
}

interface Props {
  tracos: Traco[]
  ferramenta: FerramentaAtiva
  cameraInicial?: Camera
  onNovoTraco: (traco: Traco) => void
  onApagarTraco: (indice: number) => void
  onCamera: (camera: Camera) => void
}

const ESCALA_MIN = 0.1
const ESCALA_MAX = 8
const RAIO_BORRACHA = 16

/**
 * Quadro branco infinito: stylus/mouse desenham; 1 dedo arrasta,
 * 2 dedos dão zoom (pinça); roda = pan, Ctrl+roda = zoom.
 */
export function QuadroInfinito({
  tracos,
  ferramenta,
  cameraInicial,
  onNovoTraco,
  onApagarTraco,
  onCamera,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cam = useRef<Camera>({ x: 0, y: 0, escala: 1 })
  const inicializada = useRef(false)
  const tracoEmCurso = useRef<number[] | null>(null)
  const dedos = useRef(new Map<number, { x: number; y: number }>())
  const pinca = useRef<{ dist: number; midX: number; midY: number } | null>(null)
  const renderAgendado = useRef(false)
  const timerCamera = useRef<ReturnType<typeof setTimeout> | null>(null)

  const tracosRef = useRef(tracos)
  tracosRef.current = tracos
  const ferramentaRef = useRef(ferramenta)
  ferramentaRef.current = ferramenta

  const render = useCallback(() => {
    renderAgendado.current = false
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr
    const { x, y, escala } = cam.current

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)

    // grade de pontos sutil (dá noção de movimento no infinito)
    let passo = 64
    while (passo * escala < 24) passo *= 4
    ctx.fillStyle = '#E4E4E1'
    const x0 = Math.floor(x / passo) * passo
    const y0 = Math.floor(y / passo) * passo
    for (let gx = x0; gx < x + w / escala; gx += passo) {
      for (let gy = y0; gy < y + h / escala; gy += passo) {
        ctx.beginPath()
        ctx.arc((gx - x) * escala, (gy - y) * escala, 1.4, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.setTransform(escala * dpr, 0, 0, escala * dpr, -x * escala * dpr, -y * escala * dpr)
    for (const t of tracosRef.current) desenharTraco(ctx, t)
    if (tracoEmCurso.current && tracoEmCurso.current.length >= 3) {
      const f = ferramentaRef.current
      if (f.modo !== 'borracha') {
        desenharTraco(ctx, {
          cor: f.cor,
          espessura: f.espessura,
          ferramenta: f.modo,
          pontos: tracoEmCurso.current,
        })
      }
    }

    canvas.dataset.escala = escala.toFixed(3)
    canvas.dataset.cam = `${Math.round(x)},${Math.round(y)}`
  }, [])

  const pedirRender = useCallback(() => {
    if (!renderAgendado.current) {
      renderAgendado.current = true
      requestAnimationFrame(render)
    }
  }, [render])

  function salvarCameraDebounced() {
    if (timerCamera.current) clearTimeout(timerCamera.current)
    timerCamera.current = setTimeout(() => onCamera({ ...cam.current }), 400)
  }

  // Tamanho do canvas = viewport; câmera inicial ajustada uma única vez
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ajustar = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.parentElement!.getBoundingClientRect()
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      if (!inicializada.current) {
        inicializada.current = true
        if (cameraInicial) {
          cam.current = { ...cameraInicial }
        } else {
          const caixa = limitesDosTracos(tracosRef.current)
          if (caixa && caixa.largura > 0) {
            const escala = Math.min(
              rect.width / (caixa.largura + 160),
              rect.height / (caixa.altura + 160),
              1.5,
            )
            cam.current = {
              escala,
              x: caixa.minX + caixa.largura / 2 - rect.width / 2 / escala,
              y: caixa.minY + caixa.altura / 2 - rect.height / 2 / escala,
            }
          } else {
            cam.current = { x: -rect.width / 2, y: -rect.height / 2, escala: 1 }
          }
        }
      }
      pedirRender()
    }
    ajustar()
    window.addEventListener('resize', ajustar)
    return () => window.removeEventListener('resize', ajustar)
  }, [cameraInicial, pedirRender])

  useEffect(() => {
    pedirRender()
  }, [tracos, pedirRender])

  // Roda: pan; Ctrl+roda: zoom no cursor (listener nativo p/ preventDefault)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const aoRolar = (e: WheelEvent) => {
      e.preventDefault()
      const c = cam.current
      if (e.ctrlKey || e.metaKey) {
        const rect = canvas.getBoundingClientRect()
        const sx = e.clientX - rect.left
        const sy = e.clientY - rect.top
        const alvoX = c.x + sx / c.escala
        const alvoY = c.y + sy / c.escala
        const nova = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, c.escala * Math.exp(-e.deltaY * 0.002)))
        cam.current = { escala: nova, x: alvoX - sx / nova, y: alvoY - sy / nova }
      } else {
        cam.current = { ...c, x: c.x + e.deltaX / c.escala, y: c.y + e.deltaY / c.escala }
      }
      pedirRender()
      salvarCameraDebounced()
    }
    canvas.addEventListener('wheel', aoRolar, { passive: false })
    return () => canvas.removeEventListener('wheel', aoRolar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function paraMundo(e: { clientX: number; clientY: number }): [number, number] {
    const rect = canvasRef.current!.getBoundingClientRect()
    const c = cam.current
    return [c.x + (e.clientX - rect.left) / c.escala, c.y + (e.clientY - rect.top) / c.escala]
  }

  function apagarEm(x: number, y: number) {
    const lista = tracosRef.current
    const raio = RAIO_BORRACHA / cam.current.escala + 4
    for (let i = lista.length - 1; i >= 0; i--) {
      if (tracoAtingido(lista[i], x, y, raio)) {
        onApagarTraco(i)
        return
      }
    }
  }

  function aoPressionar(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = e.currentTarget
    canvas.setPointerCapture(e.pointerId)

    if (e.pointerType === 'touch') {
      dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      // dois dedos: inicia pinça e cancela traço acidental
      if (dedos.current.size === 2) {
        const [a, b] = [...dedos.current.values()]
        pinca.current = {
          dist: Math.hypot(a.x - b.x, a.y - b.y),
          midX: (a.x + b.x) / 2,
          midY: (a.y + b.y) / 2,
        }
      }
      return
    }

    // stylus ou mouse
    const [x, y] = paraMundo(e)
    if (ferramentaRef.current.modo === 'borracha') {
      apagarEm(x, y)
      tracoEmCurso.current = []
      return
    }
    tracoEmCurso.current = [x, y, e.pressure || 0.5]
    pedirRender()
  }

  function aoMover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === 'touch') {
      const anterior = dedos.current.get(e.pointerId)
      if (!anterior) return
      const atual = { x: e.clientX, y: e.clientY }
      dedos.current.set(e.pointerId, atual)
      const c = cam.current

      if (dedos.current.size >= 2 && pinca.current) {
        const [a, b] = [...dedos.current.values()]
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        const midX = (a.x + b.x) / 2
        const midY = (a.y + b.y) / 2
        const rect = canvasRef.current!.getBoundingClientRect()
        const sx = pinca.current.midX - rect.left
        const sy = pinca.current.midY - rect.top
        const alvoX = c.x + sx / c.escala
        const alvoY = c.y + sy / c.escala
        const nova = Math.min(
          ESCALA_MAX,
          Math.max(ESCALA_MIN, c.escala * (dist / Math.max(1, pinca.current.dist))),
        )
        cam.current = {
          escala: nova,
          x: alvoX - (midX - rect.left) / nova,
          y: alvoY - (midY - rect.top) / nova,
        }
        pinca.current = { dist, midX, midY }
      } else if (dedos.current.size === 1) {
        cam.current = {
          ...c,
          x: c.x - (atual.x - anterior.x) / c.escala,
          y: c.y - (atual.y - anterior.y) / c.escala,
        }
      }
      pedirRender()
      salvarCameraDebounced()
      return
    }

    if (!tracoEmCurso.current) return
    const [x, y] = paraMundo(e)
    if (ferramentaRef.current.modo === 'borracha') {
      apagarEm(x, y)
      return
    }
    tracoEmCurso.current.push(x, y, e.pressure || 0.5)
    pedirRender()
  }

  function aoSoltar(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === 'touch') {
      dedos.current.delete(e.pointerId)
      if (dedos.current.size < 2) pinca.current = null
      return
    }
    const pontos = tracoEmCurso.current
    tracoEmCurso.current = null
    const f = ferramentaRef.current
    if (f.modo === 'borracha' || !pontos || pontos.length < 3) return
    onNovoTraco({ cor: f.cor, espessura: f.espessura, ferramenta: f.modo, pontos })
  }

  return (
    <canvas
      ref={canvasRef}
      data-testid="canvas-desenho"
      data-tracos={tracos.length}
      data-ultima-cor={tracos[tracos.length - 1]?.cor ?? ''}
      data-ultima-caneta={tracos[tracos.length - 1]?.ferramenta ?? ''}
      data-ultima-espessura={tracos[tracos.length - 1]?.espessura ?? ''}
      onPointerDown={aoPressionar}
      onPointerMove={aoMover}
      onPointerUp={aoSoltar}
      onPointerCancel={aoSoltar}
      className="absolute inset-0 h-full w-full cursor-crosshair"
      style={{ touchAction: 'none' }}
    />
  )
}
