import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import {
  apagarPixelsDoTraco,
  desenharTraco,
  limitesDosTracos,
  pontoDentroPoligono,
  tracoAtingido,
  tracoDentroPoligono,
  transformarTraco,
} from '../desenho'
import type { Camera, ItemQuadro, TipoCaneta, Traco } from '../types'

export interface FerramentaAtiva {
  modo: TipoCaneta | 'borracha' | 'selecao'
  cor: string
  espessura: number
  suavizacao: number
}

export interface ConfigBorracha {
  modo: 'traco' | 'pixel'
  tamanho: number
}

export interface QuadroApi {
  excluirSelecao: () => void
  limparSelecao: () => void
  centroMundo: () => { x: number; y: number }
}

interface Props {
  tracos: Traco[]
  itens: ItemQuadro[]
  ferramenta: FerramentaAtiva
  configBorracha: ConfigBorracha
  selecaoTipo: 'retangulo' | 'laco'
  reguaAtiva: boolean
  cameraInicial?: Camera
  onNovoTraco: (traco: Traco) => void
  onApagarTraco: (indice: number) => void
  onSubstituir: (tracos: Traco[], itens: ItemQuadro[]) => void
  onCamera: (camera: Camera) => void
  onSelecaoMudou: (ativa: boolean) => void
}

const ESCALA_MIN = 0.1
const ESCALA_MAX = 8
const LARGURA_REGUA = 96 // px de tela
const SNAP_REGUA = 32 // px de tela

interface Selecao {
  indices: number[]
  itemIds: string[]
  caixa: { minX: number; minY: number; maxX: number; maxY: number }
}

/**
 * Quadro branco infinito: stylus/mouse desenham; 1 dedo arrasta,
 * 2 dedos dão zoom; roda = pan, Ctrl+roda = zoom. Suporta régua
 * (arrasta com 1 dedo, gira com 2), borracha de traço/pixels,
 * seleção retângulo/laço (mover + girar) e itens de imagem.
 */
export const QuadroInfinito = forwardRef<QuadroApi, Props>(function QuadroInfinito(
  {
    tracos,
    itens,
    ferramenta,
    configBorracha,
    selecaoTipo,
    reguaAtiva,
    cameraInicial,
    onNovoTraco,
    onApagarTraco,
    onSubstituir,
    onCamera,
    onSelecaoMudou,
  },
  apiRef,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const cena = useRef<HTMLCanvasElement | null>(null)
  const cenaSuja = useRef(true)
  const cam = useRef<Camera>({ x: 0, y: 0, escala: 1 })
  const inicializada = useRef(false)
  const tracoEmCurso = useRef<number[] | null>(null)
  const tracoNaRegua = useRef(false)
  const ultimaTela = useRef<{ x: number; y: number } | null>(null)
  const pressaoSuave = useRef(0.5)
  const dedos = useRef(new Map<number, { x: number; y: number }>())
  const pinca = useRef<{ dist: number; midX: number; midY: number; ang: number } | null>(null)
  const gestoRegua = useRef<'mover' | 'girar' | null>(null)
  const renderAgendado = useRef(false)
  const timerCamera = useRef<ReturnType<typeof setTimeout> | null>(null)

  // borracha de pixels: edita uma cópia local e confirma ao soltar
  const tracosLocais = useRef<Traco[] | null>(null)

  // seleção
  const marca = useRef<number[] | null>(null) // polígono/retângulo em curso (mundo)
  const selecao = useRef<Selecao | null>(null)
  const gestoSel = useRef<'mover' | 'girar' | null>(null)
  const transSel = useRef({ dx: 0, dy: 0, ang: 0 })
  const inicioGesto = useRef<{ x: number; y: number; ang: number } | null>(null)

  // régua (mundo)
  const regua = useRef<{ x: number; y: number; ang: number } | null>(null)

  // imagens carregadas
  const imagens = useRef(new Map<string, HTMLImageElement>())

  const tracosRef = useRef(tracos)
  tracosRef.current = tracos
  const itensRef = useRef(itens)
  itensRef.current = itens
  const ferramentaRef = useRef(ferramenta)
  ferramentaRef.current = ferramenta
  const borrachaRef = useRef(configBorracha)
  borrachaRef.current = configBorracha
  const selecaoTipoRef = useRef(selecaoTipo)
  selecaoTipoRef.current = selecaoTipo

  useEffect(() => {
    ;(window as unknown as { __tracosDebug?: Traco[] }).__tracosDebug = tracos
  }, [tracos])

  /* ---------- helpers de coordenadas ---------- */

  function paraMundo(clientX: number, clientY: number): [number, number] {
    const rect = canvasRef.current!.getBoundingClientRect()
    const c = cam.current
    return [c.x + (clientX - rect.left) / c.escala, c.y + (clientY - rect.top) / c.escala]
  }

  function paraTela(x: number, y: number): [number, number] {
    const c = cam.current
    return [(x - c.x) * c.escala, (y - c.y) * c.escala]
  }

  /* ---------- render ---------- */

  const desenharItens = (ctx: CanvasRenderingContext2D, lista: ItemQuadro[], selIds: Set<string>, t: { dx: number; dy: number; ang: number }, cx: number, cy: number) => {
    for (const item of lista) {
      const img = imagens.current.get(item.id)
      if (!img) {
        const el = new Image()
        el.onload = () => {
          cenaSuja.current = true
          pedirRender()
        }
        el.src = item.dataUrl
        imagens.current.set(item.id, el)
        continue
      }
      if (!img.complete) continue
      let { x, y } = item
      let rot = item.rotacao ?? 0
      if (selIds.has(item.id) && (t.dx || t.dy || t.ang)) {
        const cos = Math.cos(t.ang)
        const sen = Math.sin(t.ang)
        const px = x - cx
        const py = y - cy
        x = cx + px * cos - py * sen + t.dx
        y = cy + px * sen + py * cos + t.dy
        rot += t.ang
      }
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rot)
      ctx.drawImage(img, -item.largura / 2, -item.altura / 2, item.largura, item.altura)
      ctx.restore()
    }
  }

  const desenharCena = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!cena.current) cena.current = document.createElement('canvas')
    const off = cena.current
    if (off.width !== canvas.width || off.height !== canvas.height) {
      off.width = canvas.width
      off.height = canvas.height
    }
    const ctx = off.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr
    const { x, y, escala } = cam.current

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)

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

    const sel = selecao.current
    const selIdx = new Set(sel?.indices ?? [])
    const selIds = new Set(sel?.itemIds ?? [])
    const t = transSel.current
    const ccx = sel ? (sel.caixa.minX + sel.caixa.maxX) / 2 : 0
    const ccy = sel ? (sel.caixa.minY + sel.caixa.maxY) / 2 : 0

    desenharItens(ctx, itensRef.current, selIds, t, ccx, ccy)

    const lista = tracosLocais.current ?? tracosRef.current
    lista.forEach((traco, i) => {
      if (selIdx.has(i) && (t.dx || t.dy || t.ang)) {
        desenharTraco(ctx, transformarTraco(traco, t.dx, t.dy, t.ang, ccx, ccy))
      } else {
        desenharTraco(ctx, traco)
      }
    })
    cenaSuja.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const render = useCallback(() => {
    renderAgendado.current = false
    const canvas = canvasRef.current
    if (!canvas) return
    if (!ctxRef.current) {
      ctxRef.current = canvas.getContext('2d', { desynchronized: true })
    }
    const ctx = ctxRef.current
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const { x, y, escala } = cam.current
    const w = canvas.width / dpr
    const h = canvas.height / dpr

    if (cenaSuja.current) desenharCena()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (cena.current) ctx.drawImage(cena.current, 0, 0, w, h)

    // traço em curso
    if (tracoEmCurso.current && tracoEmCurso.current.length >= 3) {
      const f = ferramentaRef.current
      if (f.modo !== 'borracha' && f.modo !== 'selecao') {
        ctx.setTransform(escala * dpr, 0, 0, escala * dpr, -x * escala * dpr, -y * escala * dpr)
        desenharTraco(ctx, {
          cor: f.cor,
          espessura: f.espessura,
          ferramenta: f.modo,
          suavizacao: f.suavizacao,
          pontos: tracoEmCurso.current,
        })
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
    }

    // marca de seleção em curso
    if (marca.current && marca.current.length >= 4) {
      const m = marca.current
      ctx.strokeStyle = '#2383E2'
      ctx.setLineDash([6, 4])
      ctx.lineWidth = 1.5
      ctx.beginPath()
      const [sx, sy] = paraTela(m[0], m[1])
      ctx.moveTo(sx, sy)
      if (selecaoTipoRef.current === 'retangulo') {
        const [ex, ey] = paraTela(m[m.length - 2], m[m.length - 1])
        ctx.strokeRect(Math.min(sx, ex), Math.min(sy, ey), Math.abs(ex - sx), Math.abs(ey - sy))
      } else {
        for (let i = 2; i < m.length; i += 2) {
          const [px, py] = paraTela(m[i], m[i + 1])
          ctx.lineTo(px, py)
        }
        ctx.stroke()
      }
      ctx.setLineDash([])
    }

    // caixa da seleção ativa + alça de rotação
    const sel = selecao.current
    if (sel) {
      const t = transSel.current
      const cx = (sel.caixa.minX + sel.caixa.maxX) / 2
      const cy = (sel.caixa.minY + sel.caixa.maxY) / 2
      const [ax, ay] = paraTela(sel.caixa.minX, sel.caixa.minY)
      const [bx, by] = paraTela(sel.caixa.maxX, sel.caixa.maxY)
      ctx.save()
      ctx.translate((ax + bx) / 2 + t.dx * escala, (ay + by) / 2 + t.dy * escala)
      ctx.rotate(t.ang)
      const lw = bx - ax
      const lh = by - ay
      ctx.strokeStyle = '#2383E2'
      ctx.setLineDash([6, 4])
      ctx.lineWidth = 1.5
      ctx.strokeRect(-lw / 2 - 8, -lh / 2 - 8, lw + 16, lh + 16)
      ctx.setLineDash([])
      // alça de rotação
      ctx.beginPath()
      ctx.moveTo(0, -lh / 2 - 8)
      ctx.lineTo(0, -lh / 2 - 34)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, -lh / 2 - 44, 10, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.stroke()
      ctx.restore()
      void cx
      void cy
    }

    // régua
    const r = regua.current
    if (reguaAtiva && r) {
      const [rx, ry] = paraTela(r.x, r.y)
      const diag = Math.hypot(w, h)
      ctx.save()
      ctx.translate(rx, ry)
      ctx.rotate(r.ang)
      ctx.fillStyle = 'rgba(250, 250, 248, 0.92)'
      ctx.strokeStyle = '#B9B9B4'
      ctx.lineWidth = 1
      ctx.fillRect(-diag, 0, diag * 2, LARGURA_REGUA)
      ctx.strokeRect(-diag, 0, diag * 2, LARGURA_REGUA)
      // borda de desenho (superior) destacada
      ctx.strokeStyle = '#7A7A74'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-diag, 0)
      ctx.lineTo(diag, 0)
      ctx.stroke()
      // marcações
      let tick = 40 * escala
      while (tick < 14) tick *= 2
      ctx.strokeStyle = '#A5A5A0'
      ctx.lineWidth = 1
      const inicio = -Math.ceil(diag / tick) * tick
      let n = 0
      for (let px = inicio; px < diag; px += tick, n++) {
        ctx.beginPath()
        ctx.moveTo(px, 0)
        ctx.lineTo(px, n % 5 === 0 ? 22 : 12)
        ctx.stroke()
      }
      ctx.restore()
    }

    canvas.dataset.escala = escala.toFixed(3)
    canvas.dataset.cam = `${Math.round(x)},${Math.round(y)}`
    canvas.dataset.regua = reguaAtiva && r ? `${Math.round(r.x)},${Math.round(r.y)},${r.ang.toFixed(2)}` : ''
    canvas.dataset.selecao = String(sel ? sel.indices.length + sel.itemIds.length : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desenharCena, reguaAtiva])

  const pedirRender = useCallback(() => {
    if (!renderAgendado.current) {
      renderAgendado.current = true
      requestAnimationFrame(render)
    }
  }, [render])

  const moverCamera = useCallback(
    (nova: Camera) => {
      cam.current = nova
      cenaSuja.current = true
      pedirRender()
      if (timerCamera.current) clearTimeout(timerCamera.current)
      timerCamera.current = setTimeout(() => onCamera({ ...cam.current }), 400)
    },
    [onCamera, pedirRender],
  )

  /* ---------- API para o componente pai ---------- */

  useImperativeHandle(apiRef, () => ({
    excluirSelecao() {
      const sel = selecao.current
      if (!sel) return
      const ids = new Set(sel.itemIds)
      const idx = new Set(sel.indices)
      selecao.current = null
      transSel.current = { dx: 0, dy: 0, ang: 0 }
      onSelecaoMudou(false)
      onSubstituir(
        tracosRef.current.filter((_, i) => !idx.has(i)),
        itensRef.current.filter((it) => !ids.has(it.id)),
      )
    },
    limparSelecao() {
      selecao.current = null
      transSel.current = { dx: 0, dy: 0, ang: 0 }
      onSelecaoMudou(false)
      cenaSuja.current = true
      pedirRender()
    },
    centroMundo() {
      const canvas = canvasRef.current!
      const dpr = window.devicePixelRatio || 1
      const c = cam.current
      return {
        x: c.x + canvas.width / dpr / 2 / c.escala,
        y: c.y + canvas.height / dpr / 2 / c.escala,
      }
    },
  }))

  /* ---------- efeitos ---------- */

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
      cenaSuja.current = true
      pedirRender()
    }
    ajustar()
    window.addEventListener('resize', ajustar)
    return () => window.removeEventListener('resize', ajustar)
  }, [cameraInicial, pedirRender])

  useEffect(() => {
    tracosLocais.current = null
    cenaSuja.current = true
    pedirRender()
  }, [tracos, itens, pedirRender])

  // liga/desliga régua: nasce no centro da tela, horizontal
  useEffect(() => {
    if (reguaAtiva && !regua.current) {
      const canvas = canvasRef.current!
      const dpr = window.devicePixelRatio || 1
      const c = cam.current
      regua.current = {
        x: c.x + canvas.width / dpr / 2 / c.escala,
        y: c.y + canvas.height / dpr / 2 / c.escala,
        ang: 0,
      }
    }
    pedirRender()
  }, [reguaAtiva, pedirRender])

  // sair do modo seleção limpa a seleção
  useEffect(() => {
    if (ferramenta.modo !== 'selecao' && selecao.current) {
      selecao.current = null
      transSel.current = { dx: 0, dy: 0, ang: 0 }
      onSelecaoMudou(false)
      cenaSuja.current = true
      pedirRender()
    }
  }, [ferramenta.modo, onSelecaoMudou, pedirRender])

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
        moverCamera({ escala: nova, x: alvoX - sx / nova, y: alvoY - sy / nova })
      } else {
        moverCamera({ ...c, x: c.x + e.deltaX / c.escala, y: c.y + e.deltaY / c.escala })
      }
    }
    canvas.addEventListener('wheel', aoRolar, { passive: false })
    return () => canvas.removeEventListener('wheel', aoRolar)
  }, [moverCamera])

  /* ---------- régua: geometria ---------- */

  function reguaLocal(clientX: number, clientY: number): { ao: number; perp: number } | null {
    const r = regua.current
    if (!r) return null
    const rect = canvasRef.current!.getBoundingClientRect()
    const [rx, ry] = paraTela(r.x, r.y)
    const px = clientX - rect.left - rx
    const py = clientY - rect.top - ry
    const cos = Math.cos(-r.ang)
    const sen = Math.sin(-r.ang)
    return { ao: px * cos - py * sen, perp: px * sen + py * cos }
  }

  function dedoNaRegua(clientX: number, clientY: number): boolean {
    if (!reguaAtiva) return false
    const l = reguaLocal(clientX, clientY)
    return !!l && l.perp >= 0 && l.perp <= LARGURA_REGUA
  }

  function projetarNaRegua(x: number, y: number): [number, number] {
    const r = regua.current!
    const dx = Math.cos(r.ang)
    const dy = Math.sin(r.ang)
    const t = (x - r.x) * dx + (y - r.y) * dy
    return [r.x + t * dx, r.y + t * dy]
  }

  /* ---------- pressão ---------- */

  function pressaoEfetiva(e: PointerEvent, clientX: number, clientY: number): number {
    let alvo: number
    if (e.pointerType === 'pen' && e.pressure > 0) {
      alvo = e.pressure
    } else {
      const ant = ultimaTela.current
      const distancia = ant ? Math.hypot(clientX - ant.x, clientY - ant.y) : 6
      alvo = Math.min(0.95, Math.max(0.18, 1 - distancia / 55))
    }
    ultimaTela.current = { x: clientX, y: clientY }
    pressaoSuave.current += (alvo - pressaoSuave.current) * 0.35
    return pressaoSuave.current
  }

  /* ---------- borracha ---------- */

  function apagarEm(x: number, y: number) {
    const cfg = borrachaRef.current
    if (cfg.modo === 'traco') {
      const lista = tracosRef.current
      const raio = cfg.tamanho / cam.current.escala / 2 + 4
      for (let i = lista.length - 1; i >= 0; i--) {
        if (tracoAtingido(lista[i], x, y, raio)) {
          onApagarTraco(i)
          return
        }
      }
      return
    }
    // pixel: edita cópia local, confirma ao soltar
    if (!tracosLocais.current) tracosLocais.current = [...tracosRef.current]
    const raio = cfg.tamanho / cam.current.escala / 2
    const lista = tracosLocais.current
    let mudou = false
    for (let i = lista.length - 1; i >= 0; i--) {
      const pedacos = apagarPixelsDoTraco(lista[i], x, y, raio)
      if (pedacos) {
        lista.splice(i, 1, ...pedacos)
        mudou = true
      }
    }
    if (mudou) {
      cenaSuja.current = true
      pedirRender()
    }
  }

  /* ---------- seleção ---------- */

  function concluirMarca() {
    const m = marca.current
    marca.current = null
    if (!m || m.length < 4) return
    let poligono: number[]
    if (selecaoTipoRef.current === 'retangulo') {
      const x1 = m[0]
      const y1 = m[1]
      const x2 = m[m.length - 2]
      const y2 = m[m.length - 1]
      poligono = [x1, y1, x2, y1, x2, y2, x1, y2]
    } else {
      poligono = m
    }
    const indices: number[] = []
    tracosRef.current.forEach((t, i) => {
      if (tracoDentroPoligono(t, poligono)) indices.push(i)
    })
    const itemIds = itensRef.current
      .filter((it) => pontoDentroPoligono(it.x, it.y, poligono))
      .map((it) => it.id)

    if (indices.length === 0 && itemIds.length === 0) {
      selecao.current = null
      onSelecaoMudou(false)
    } else {
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (const i of indices) {
        const p = tracosRef.current[i].pontos
        for (let k = 0; k < p.length; k += 3) {
          if (p[k] < minX) minX = p[k]
          if (p[k] > maxX) maxX = p[k]
          if (p[k + 1] < minY) minY = p[k + 1]
          if (p[k + 1] > maxY) maxY = p[k + 1]
        }
      }
      for (const id of itemIds) {
        const it = itensRef.current.find((i) => i.id === id)!
        const meia = Math.hypot(it.largura, it.altura) / 2
        minX = Math.min(minX, it.x - meia)
        maxX = Math.max(maxX, it.x + meia)
        minY = Math.min(minY, it.y - meia)
        maxY = Math.max(maxY, it.y + meia)
      }
      selecao.current = { indices, itemIds, caixa: { minX, minY, maxX, maxY } }
      transSel.current = { dx: 0, dy: 0, ang: 0 }
      onSelecaoMudou(true)
    }
    cenaSuja.current = true
    pedirRender()
  }

  function alcaDeRotacao(clientX: number, clientY: number): boolean {
    const sel = selecao.current
    if (!sel) return false
    const rect = canvasRef.current!.getBoundingClientRect()
    const [ax, ay] = paraTela(sel.caixa.minX, sel.caixa.minY)
    const [bx] = paraTela(sel.caixa.maxX, sel.caixa.maxY)
    const hx = (ax + bx) / 2
    const hy = ay - 8 - 44
    return Math.hypot(clientX - rect.left - hx, clientY - rect.top - hy) <= 16
  }

  function dentroDaCaixa(x: number, y: number): boolean {
    const sel = selecao.current
    if (!sel) return false
    const folga = 12 / cam.current.escala
    return (
      x >= sel.caixa.minX - folga &&
      x <= sel.caixa.maxX + folga &&
      y >= sel.caixa.minY - folga &&
      y <= sel.caixa.maxY + folga
    )
  }

  function confirmarTransformacao() {
    const sel = selecao.current
    const t = transSel.current
    if (!sel || (!t.dx && !t.dy && !t.ang)) return
    const cx = (sel.caixa.minX + sel.caixa.maxX) / 2
    const cy = (sel.caixa.minY + sel.caixa.maxY) / 2
    const idx = new Set(sel.indices)
    const ids = new Set(sel.itemIds)
    const cos = Math.cos(t.ang)
    const sen = Math.sin(t.ang)

    const novosTracos = tracosRef.current.map((tr, i) =>
      idx.has(i) ? transformarTraco(tr, t.dx, t.dy, t.ang, cx, cy) : tr,
    )
    const novosItens = itensRef.current.map((it) => {
      if (!ids.has(it.id)) return it
      const px = it.x - cx
      const py = it.y - cy
      return {
        ...it,
        x: cx + px * cos - py * sen + t.dx,
        y: cy + px * sen + py * cos + t.dy,
        rotacao: (it.rotacao ?? 0) + t.ang,
      }
    })

    // atualiza a caixa da seleção para a nova posição
    selecao.current = {
      ...sel,
      caixa: {
        minX: sel.caixa.minX + t.dx,
        maxX: sel.caixa.maxX + t.dx,
        minY: sel.caixa.minY + t.dy,
        maxY: sel.caixa.maxY + t.dy,
      },
    }
    transSel.current = { dx: 0, dy: 0, ang: 0 }
    onSubstituir(novosTracos, novosItens)
  }

  /* ---------- eventos de ponteiro ---------- */

  function aoPressionar(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = e.currentTarget
    canvas.setPointerCapture(e.pointerId)

    if (e.pointerType === 'touch') {
      dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (dedos.current.size === 1) {
        gestoRegua.current = dedoNaRegua(e.clientX, e.clientY) ? 'mover' : null
      }
      if (dedos.current.size === 2) {
        const [a, b] = [...dedos.current.values()]
        pinca.current = {
          dist: Math.hypot(a.x - b.x, a.y - b.y),
          midX: (a.x + b.x) / 2,
          midY: (a.y + b.y) / 2,
          ang: Math.atan2(b.y - a.y, b.x - a.x),
        }
        // dois dedos com pelo menos um na régua = girar régua
        gestoRegua.current =
          reguaAtiva && (dedoNaRegua(a.x, a.y) || dedoNaRegua(b.x, b.y)) ? 'girar' : null
      }
      return
    }

    const [x, y] = paraMundo(e.clientX, e.clientY)
    const f = ferramentaRef.current

    if (f.modo === 'selecao') {
      if (alcaDeRotacao(e.clientX, e.clientY)) {
        gestoSel.current = 'girar'
        const sel = selecao.current!
        const cx = (sel.caixa.minX + sel.caixa.maxX) / 2
        const cy = (sel.caixa.minY + sel.caixa.maxY) / 2
        inicioGesto.current = { x, y, ang: Math.atan2(y - cy, x - cx) }
        return
      }
      if (dentroDaCaixa(x, y)) {
        gestoSel.current = 'mover'
        inicioGesto.current = { x, y, ang: 0 }
        return
      }
      // nova marca
      if (selecao.current) {
        selecao.current = null
        transSel.current = { dx: 0, dy: 0, ang: 0 }
        onSelecaoMudou(false)
        cenaSuja.current = true
      }
      marca.current = [x, y]
      pedirRender()
      return
    }

    if (f.modo === 'borracha') {
      apagarEm(x, y)
      tracoEmCurso.current = []
      return
    }

    // canetas
    ultimaTela.current = null
    pressaoSuave.current = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.5
    tracoNaRegua.current =
      reguaAtiva &&
      !!reguaLocal(e.clientX, e.clientY) &&
      Math.abs(reguaLocal(e.clientX, e.clientY)!.perp) < SNAP_REGUA
    const p = pressaoEfetiva(e.nativeEvent, e.clientX, e.clientY)
    const [px, py] = tracoNaRegua.current ? projetarNaRegua(x, y) : [x, y]
    tracoEmCurso.current = [px, py, p]
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
        const ang = Math.atan2(b.y - a.y, b.x - a.x)

        if (gestoRegua.current === 'girar' && regua.current) {
          regua.current.ang += ang - pinca.current.ang
          regua.current.x += (midX - pinca.current.midX) / c.escala
          regua.current.y += (midY - pinca.current.midY) / c.escala
          pinca.current = { dist, midX, midY, ang }
          pedirRender()
          return
        }

        const rect = canvasRef.current!.getBoundingClientRect()
        const sx = pinca.current.midX - rect.left
        const sy = pinca.current.midY - rect.top
        const alvoX = c.x + sx / c.escala
        const alvoY = c.y + sy / c.escala
        const nova = Math.min(
          ESCALA_MAX,
          Math.max(ESCALA_MIN, c.escala * (dist / Math.max(1, pinca.current.dist))),
        )
        pinca.current = { dist, midX, midY, ang }
        moverCamera({
          escala: nova,
          x: alvoX - (midX - rect.left) / nova,
          y: alvoY - (midY - rect.top) / nova,
        })
      } else if (dedos.current.size === 1) {
        if (gestoRegua.current === 'mover' && regua.current) {
          regua.current.x += (atual.x - anterior.x) / c.escala
          regua.current.y += (atual.y - anterior.y) / c.escala
          pedirRender()
          return
        }
        moverCamera({
          ...c,
          x: c.x - (atual.x - anterior.x) / c.escala,
          y: c.y - (atual.y - anterior.y) / c.escala,
        })
      }
      return
    }

    const f = ferramentaRef.current
    const [x, y] = paraMundo(e.clientX, e.clientY)

    if (f.modo === 'selecao') {
      if (gestoSel.current === 'mover' && inicioGesto.current) {
        transSel.current.dx = x - inicioGesto.current.x
        transSel.current.dy = y - inicioGesto.current.y
        cenaSuja.current = true
        pedirRender()
        return
      }
      if (gestoSel.current === 'girar' && inicioGesto.current && selecao.current) {
        const sel = selecao.current
        const cx = (sel.caixa.minX + sel.caixa.maxX) / 2
        const cy = (sel.caixa.minY + sel.caixa.maxY) / 2
        transSel.current.ang = Math.atan2(y - cy, x - cx) - inicioGesto.current.ang
        cenaSuja.current = true
        pedirRender()
        return
      }
      if (marca.current) {
        marca.current.push(x, y)
        pedirRender()
      }
      return
    }

    if (!tracoEmCurso.current) return
    if (f.modo === 'borracha') {
      apagarEm(x, y)
      return
    }
    const nativos = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent]
    for (const ev of nativos) {
      const [wx, wy] = paraMundo(ev.clientX, ev.clientY)
      const p = pressaoEfetiva(ev, ev.clientX, ev.clientY)
      const [px, py] = tracoNaRegua.current ? projetarNaRegua(wx, wy) : [wx, wy]
      tracoEmCurso.current.push(px, py, p)
    }
    pedirRender()
  }

  function aoSoltar(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === 'touch') {
      dedos.current.delete(e.pointerId)
      if (dedos.current.size < 2) pinca.current = null
      if (dedos.current.size === 0) gestoRegua.current = null
      return
    }

    const f = ferramentaRef.current

    if (f.modo === 'selecao') {
      if (gestoSel.current) {
        confirmarTransformacao()
        gestoSel.current = null
        inicioGesto.current = null
      } else if (marca.current) {
        concluirMarca()
      }
      return
    }

    if (f.modo === 'borracha') {
      tracoEmCurso.current = null
      if (tracosLocais.current) {
        const finais = tracosLocais.current
        tracosLocais.current = null
        onSubstituir(finais, itensRef.current)
      }
      return
    }

    const pontos = tracoEmCurso.current
    tracoEmCurso.current = null
    tracoNaRegua.current = false
    if (!pontos || pontos.length < 3) return
    onNovoTraco({
      cor: f.cor,
      espessura: f.espessura,
      ferramenta: f.modo as TipoCaneta,
      suavizacao: f.suavizacao,
      pontos,
    })
  }

  return (
    <canvas
      ref={canvasRef}
      data-testid="canvas-desenho"
      data-tracos={tracos.length}
      data-itens={itens.length}
      data-ultima-cor={tracos[tracos.length - 1]?.cor ?? ''}
      data-ultima-caneta={tracos[tracos.length - 1]?.ferramenta ?? ''}
      data-ultima-espessura={tracos[tracos.length - 1]?.espessura ?? ''}
      data-ultima-suavizacao={tracos[tracos.length - 1]?.suavizacao ?? ''}
      onPointerDown={aoPressionar}
      onPointerMove={aoMover}
      onPointerUp={aoSoltar}
      onPointerCancel={aoSoltar}
      className="absolute inset-0 h-full w-full cursor-crosshair"
      style={{ touchAction: 'none' }}
    />
  )
})
