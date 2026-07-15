import { useEffect, useRef, useState } from 'react'

interface Hsv {
  h: number // 0..360
  s: number // 0..1
  v: number // 0..1
}

function hexParaHsv(hex: string): Hsv {
  const limpo = hex.replace('#', '')
  const r = parseInt(limpo.slice(0, 2), 16) / 255
  const g = parseInt(limpo.slice(2, 4), 16) / 255
  const b = parseInt(limpo.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6)
    else if (max === g) h = 60 * ((b - r) / d + 2)
    else h = 60 * ((r - g) / d + 4)
  }
  if (h < 0) h += 360
  return { h, s: max === 0 ? 0 : d / max, v: max }
}

function hsvParaHex({ h, s, v }: Hsv): string {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const canal = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${canal(r)}${canal(g)}${canal(b)}`.toUpperCase()
}

interface Props {
  cor: string
  onMudar: (hex: string) => void
}

/** Picker leve: área saturação/valor + barra de matiz, tudo por arrasto. */
export function SeletorCor({ cor, onMudar }: Props) {
  const [hsv, setHsv] = useState<Hsv>(() => hexParaHsv(cor))
  const corInterna = useRef(cor)

  // Sincroniza quando a cor muda por fora (ex.: swatch predefinido)
  useEffect(() => {
    if (cor.toUpperCase() !== corInterna.current.toUpperCase()) {
      corInterna.current = cor
      setHsv(hexParaHsv(cor))
    }
  }, [cor])

  function aplicar(novo: Hsv) {
    setHsv(novo)
    const hex = hsvParaHex(novo)
    corInterna.current = hex
    onMudar(hex)
  }

  function arrastavel(
    onFrac: (fx: number, fy: number) => void,
  ): Pick<React.DOMAttributes<HTMLDivElement>, 'onPointerDown' | 'onPointerMove'> {
    const tratar = (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      onFrac(
        Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
        Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
      )
    }
    return {
      onPointerDown: (e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        tratar(e)
      },
      onPointerMove: (e) => {
        if (e.buttons > 0 || e.pressure > 0) tratar(e)
      },
    }
  }

  const matiz = `hsl(${hsv.h}, 100%, 50%)`

  return (
    <div className="flex flex-col gap-3">
      <div
        data-testid="sv-area"
        {...arrastavel((fx, fy) => aplicar({ ...hsv, s: fx, v: 1 - fy }))}
        className="relative h-32 w-full cursor-crosshair touch-none rounded-lg border border-line"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${matiz})`,
        }}
      >
        <span
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            backgroundColor: hsvParaHex(hsv),
          }}
        />
      </div>

      <div
        data-testid="hue-bar"
        {...arrastavel((fx) => aplicar({ ...hsv, h: fx * 359.9 }))}
        className="relative h-4 w-full cursor-pointer touch-none rounded-full"
        style={{
          background:
            'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
        }}
      >
        <span
          className="pointer-events-none absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
          style={{ left: `${(hsv.h / 360) * 100}%`, backgroundColor: matiz }}
        />
      </div>
    </div>
  )
}
