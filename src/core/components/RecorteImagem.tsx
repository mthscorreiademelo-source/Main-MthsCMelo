import { useEffect, useMemo, useRef, useState } from 'react'
import { FolhaInferior } from './FolhaInferior'

/**
 * Recorte de imagem com arrastar (pan) + zoom, escolhendo a parte exata que
 * aparece dentro de um quadro de proporção fixa. Devolve um dataURL já cortado.
 *
 * `aspecto` = largura/altura do quadro (1 = quadrado; 0.8 = retrato 4:5).
 */
export function RecorteImagem({
  arquivo,
  aspecto = 1,
  saidaLargura = 512,
  redondo = false,
  onConfirmar,
  onCancelar,
}: {
  arquivo: File
  aspecto?: number
  saidaLargura?: number
  redondo?: boolean
  onConfirmar: (dataUrl: string) => void
  onCancelar: () => void
}) {
  const urlObjeto = useMemo(() => URL.createObjectURL(arquivo), [arquivo])
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [escala, setEscala] = useState(1)
  const [minEscala, setMinEscala] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const quadroRef = useRef<HTMLDivElement>(null)
  const arrasto = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  // Quadro de exibição: largura fixa, altura pela proporção.
  const LARGURA_QUADRO = 300
  const alturaQuadro = Math.round(LARGURA_QUADRO / aspecto)

  // Carrega a imagem e centraliza no menor zoom que ainda cobre o quadro.
  useEffect(() => {
    const el = new Image()
    el.onload = () => {
      const min = Math.max(LARGURA_QUADRO / el.width, alturaQuadro / el.height)
      setImg(el)
      setMinEscala(min)
      setEscala(min)
      setPos({
        x: (LARGURA_QUADRO - el.width * min) / 2,
        y: (alturaQuadro - el.height * min) / 2,
      })
    }
    el.src = urlObjeto
    return () => URL.revokeObjectURL(urlObjeto)
  }, [urlObjeto, alturaQuadro])

  /** Mantém a imagem sempre cobrindo o quadro (sem faixas vazias). */
  function limitar(x: number, y: number, s: number) {
    if (!img) return { x, y }
    const larg = img.width * s
    const alt = img.height * s
    return {
      x: Math.min(0, Math.max(LARGURA_QUADRO - larg, x)),
      y: Math.min(0, Math.max(alturaQuadro - alt, y)),
    }
  }

  function aoArrastar(e: React.PointerEvent) {
    const a = arrasto.current
    if (!a) return
    setPos(limitar(a.ox + (e.clientX - a.x), a.oy + (e.clientY - a.y), escala))
  }

  function mudarZoom(novo: number) {
    if (!img) return
    const s = Math.max(minEscala, Math.min(minEscala * 5, novo))
    // Zoom em torno do centro do quadro.
    const cx = LARGURA_QUADRO / 2
    const cy = alturaQuadro / 2
    const k = s / escala
    setPos((p) => limitar(cx - (cx - p.x) * k, cy - (cy - p.y) * k, s))
    setEscala(s)
  }

  function confirmar() {
    if (!img) return
    const canvas = document.createElement('canvas')
    const saidaAltura = Math.round(saidaLargura / aspecto)
    canvas.width = saidaLargura
    canvas.height = saidaAltura
    const ctx = canvas.getContext('2d')!
    // Região da imagem original visível no quadro.
    const sx = -pos.x / escala
    const sy = -pos.y / escala
    const sw = LARGURA_QUADRO / escala
    const sh = alturaQuadro / escala
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, saidaLargura, saidaAltura)
    const png = /image\/(png|webp|gif)/i.test(arquivo.type)
    onConfirmar(png ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85))
  }

  return (
    <FolhaInferior titulo="Ajustar a foto" onFechar={onCancelar}>
      <div className="flex flex-col items-center gap-4">
        <p className="text-[13px] text-muted">Arraste para posicionar e use o zoom para enquadrar.</p>
        <div
          ref={quadroRef}
          className={`relative overflow-hidden bg-hover ${redondo ? 'rounded-full' : 'rounded-2xl'} border border-line`}
          style={{ width: LARGURA_QUADRO, height: alturaQuadro, touchAction: 'none', cursor: 'grab' }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            arrasto.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y }
          }}
          onPointerMove={aoArrastar}
          onPointerUp={() => (arrasto.current = null)}
          onWheel={(e) => mudarZoom(escala * (e.deltaY < 0 ? 1.08 : 1 / 1.08))}
        >
          {img && (
            <img
              src={urlObjeto}
              alt=""
              draggable={false}
              className="absolute left-0 top-0 max-w-none select-none"
              style={{
                width: img.width * escala,
                height: img.height * escala,
                transform: `translate(${pos.x}px, ${pos.y}px)`,
              }}
            />
          )}
          {/* moldura sutil */}
          <div className={`pointer-events-none absolute inset-0 ${redondo ? 'rounded-full' : 'rounded-2xl'} ring-1 ring-inset ring-black/10`} />
        </div>

        <div className="flex w-full max-w-[300px] items-center gap-3">
          <span className="text-[13px] text-muted">−</span>
          <input
            type="range"
            min={minEscala}
            max={minEscala * 5}
            step={minEscala / 100}
            value={escala}
            onChange={(e) => mudarZoom(Number(e.target.value))}
            className="flex-1 accent-[var(--vida-accent)]"
            aria-label="Zoom"
          />
          <span className="text-[15px] text-muted">＋</span>
        </div>

        <div className="flex w-full gap-2">
          <button onClick={onCancelar} className="min-h-11 flex-1 rounded-xl border border-line text-[14px] font-medium text-muted hover:text-ink">
            Cancelar
          </button>
          <button onClick={confirmar} className="min-h-11 flex-1 rounded-xl bg-ink text-[14px] font-semibold text-bg">
            Usar esta parte
          </button>
        </div>
      </div>
    </FolhaInferior>
  )
}
