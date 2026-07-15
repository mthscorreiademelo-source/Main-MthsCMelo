import { useEffect, useRef, useState } from 'react'
import { IconDesfazer } from '../../../core/components/Icons'

const CORES = ['#37352f', '#c46a5e', '#d89b6c', '#5b9c86', '#4a7bb0', '#8a63c4']

/**
 * Bloco de rascunho simples para caneta/dedo — traço fluido com pressão leve.
 * Chama onMudar(blob|null) quando o desenho muda (PNG) ou é limpo.
 */
export function SketchPad({ onMudar }: { onMudar: (blob: Blob | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cor, setCor] = useState(CORES[0])
  const [temTraco, setTemTraco] = useState(false)
  const desenhando = useRef(false)
  const ultimo = useRef<{ x: number; y: number } | null>(null)
  const corRef = useRef(cor)
  corRef.current = cor

  // ajusta a resolução ao container (retina)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
  }, [])

  function pos(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function emitir() {
    canvasRef.current?.toBlob((b) => onMudar(b), 'image/png')
  }

  function inicio(e: React.PointerEvent) {
    e.preventDefault()
    canvasRef.current?.setPointerCapture(e.pointerId)
    desenhando.current = true
    ultimo.current = pos(e)
  }

  function mover(e: React.PointerEvent) {
    if (!desenhando.current) return
    const ctx = canvasRef.current?.getContext('2d')
    const p = pos(e)
    const a = ultimo.current
    if (!ctx || !a) return
    const pressao = e.pressure && e.pressure > 0 ? e.pressure : 0.5
    ctx.strokeStyle = corRef.current
    ctx.lineWidth = 1 + pressao * 4
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    ultimo.current = p
    if (!temTraco) setTemTraco(true)
  }

  function fim() {
    if (!desenhando.current) return
    desenhando.current = false
    ultimo.current = null
    emitir()
  }

  function limpar() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    setTemTraco(false)
    onMudar(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative overflow-hidden rounded-xl border border-line bg-surface">
        <canvas
          ref={canvasRef}
          onPointerDown={inicio}
          onPointerMove={mover}
          onPointerUp={fim}
          onPointerCancel={fim}
          className="h-52 w-full touch-none"
          style={{ touchAction: 'none' }}
        />
        {!temTraco && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] text-muted/60">
            Desenhe aqui
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {CORES.map((c) => (
          <button
            key={c}
            onClick={() => setCor(c)}
            aria-label={`Cor ${c}`}
            className={`size-6 cursor-pointer rounded-full transition-transform ${
              cor === c ? 'scale-110 ring-2 ring-ink ring-offset-2 ring-offset-bg' : ''
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
        <button
          onClick={limpar}
          className="ml-auto flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[13px] text-muted transition-colors hover:text-ink"
        >
          <IconDesfazer width={15} height={15} />
          Limpar
        </button>
      </div>
    </div>
  )
}
