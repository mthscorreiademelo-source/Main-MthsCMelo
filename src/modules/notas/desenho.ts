import type { TipoCaneta, Traco } from './types'

/**
 * Motor de tinta: cada traço é renderizado como um CONTORNO PREENCHIDO
 * (outline) com curvas quadráticas — sem emendas entre segmentos — e a
 * largura varia continuamente com a pressão filtrada. É a técnica usada
 * por apps de caligrafia (perfect-freehand, GoodNotes etc.).
 */

interface Caneta {
  id: TipoCaneta
  rotulo: string
  alpha: number
  /** Quanto a pressão afina o traço (0 = largura fixa, 1 = afina tudo) */
  afinamento: number
  /** Suavização da trajetória (0..1); maior = linha mais "amanteigada" */
  suavizacao: number
  /** Comprimento do afilamento nas pontas, em múltiplos da espessura */
  afilaPontas: number
  /** Multiplicador da espessura nominal */
  fatorLargura: number
  /** true = caminho único de largura constante (marca-texto) */
  caminhoUnico: boolean
  espessuraPadrao: number
  corPadrao: string
}

export const CANETAS: Record<TipoCaneta, Caneta> = {
  lapis: {
    id: 'lapis',
    rotulo: 'Lápis grafite',
    alpha: 0.7,
    afinamento: 0.3,
    suavizacao: 0.35,
    afilaPontas: 0.8,
    fatorLargura: 0.9,
    caminhoUnico: false,
    espessuraPadrao: 3,
    corPadrao: '#5A5A56',
  },
  tinteiro: {
    id: 'tinteiro',
    rotulo: 'Caneta tinteiro',
    alpha: 1,
    afinamento: 0.68,
    suavizacao: 0.5,
    afilaPontas: 1.4,
    fatorLargura: 1.35,
    caminhoUnico: false,
    espessuraPadrao: 5,
    corPadrao: '#37352F',
  },
  marcador: {
    id: 'marcador',
    rotulo: 'Marca-texto',
    alpha: 0.35,
    afinamento: 0,
    suavizacao: 0.4,
    afilaPontas: 0,
    fatorLargura: 2.5,
    caminhoUnico: true,
    espessuraPadrao: 10,
    corPadrao: '#FFD400',
  },
  pincel: {
    id: 'pincel',
    rotulo: 'Pincel',
    alpha: 1,
    afinamento: 0.85,
    suavizacao: 0.55,
    afilaPontas: 5,
    fatorLargura: 1.7,
    caminhoUnico: false,
    espessuraPadrao: 8,
    corPadrao: '#2383E2',
  },
}

export const LISTA_CANETAS = [
  CANETAS.lapis,
  CANETAS.tinteiro,
  CANETAS.marcador,
  CANETAS.pincel,
]

export interface ConfigCaneta {
  cor: string
  espessura: number
  /** Assistência de caligrafia (0..1) — estabilização do traço */
  suavizacao: number
}

export type ConfigsCanetas = Record<TipoCaneta, ConfigCaneta>

/** Preferências por caneta (cor/ponta/assistência), persistidas entre sessões. */
export function configsIniciais(): ConfigsCanetas {
  const padroes = Object.fromEntries(
    LISTA_CANETAS.map((c) => [
      c.id,
      { cor: c.corPadrao, espessura: c.espessuraPadrao, suavizacao: c.suavizacao },
    ]),
  ) as ConfigsCanetas

  const salvas = localStorage.getItem('vida:canetas')
  if (salvas) {
    try {
      const lidas = JSON.parse(salvas) as Partial<Record<TipoCaneta, Partial<ConfigCaneta>>>
      // mescla: configs antigas podem não ter o campo suavizacao
      for (const c of LISTA_CANETAS) {
        padroes[c.id] = { ...padroes[c.id], ...lidas[c.id] }
      }
    } catch {
      /* ignora e usa padrões */
    }
  }
  return padroes
}

export function canetaDoTraco(traco: Traco): Caneta {
  if (traco.ferramenta) return CANETAS[traco.ferramenta]
  // traços da v0.6: marca-texto era salvo como cor rgba translúcida
  return traco.cor.startsWith('rgba') ? CANETAS.marcador : CANETAS.tinteiro
}

interface Ponto {
  x: number
  y: number
  p: number
}

function extrairPontos(flat: number[]): Ponto[] {
  const pts: Ponto[] = []
  for (let i = 0; i < flat.length; i += 3) {
    pts.push({ x: flat[i], y: flat[i + 1], p: flat[i + 2] || 0.5 })
  }
  return pts
}

/** Suavização exponencial da trajetória e da pressão (streamline). */
function suavizar(pts: Ponto[], fator: number): Ponto[] {
  if (pts.length < 3 || fator <= 0) return pts
  const alfa = 1 - fator * 0.85
  const saida: Ponto[] = [pts[0]]
  let ax = pts[0].x
  let ay = pts[0].y
  let ap = pts[0].p
  for (let i = 1; i < pts.length; i++) {
    ax += (pts[i].x - ax) * alfa
    ay += (pts[i].y - ay) * alfa
    ap += (pts[i].p - ap) * 0.3
    saida.push({ x: ax, y: ay, p: ap })
  }
  saida.push(pts[pts.length - 1]) // preserva a ponta final exata
  return saida
}

/** Caminho fechado suave passando pelos pontos (quadráticas por ponto médio). */
function caminhoFechado(contorno: { x: number; y: number }[]): Path2D {
  const path = new Path2D()
  const n = contorno.length
  if (n < 3) return path
  const ultimo = contorno[n - 1]
  path.moveTo((ultimo.x + contorno[0].x) / 2, (ultimo.y + contorno[0].y) / 2)
  for (let i = 0; i < n; i++) {
    const a = contorno[i]
    const b = contorno[(i + 1) % n]
    path.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2)
  }
  path.closePath()
  return path
}

/** Constrói o contorno preenchível de um traço com raio variável. */
function contornoDoTraco(pts: Ponto[], raios: number[]): Path2D {
  const n = pts.length
  const esq: { x: number; y: number }[] = []
  const dir: { x: number; y: number }[] = []

  for (let i = 0; i < n; i++) {
    const ant = pts[Math.max(0, i - 1)]
    const prox = pts[Math.min(n - 1, i + 1)]
    let dx = prox.x - ant.x
    let dy = prox.y - ant.y
    const len = Math.hypot(dx, dy) || 1
    dx /= len
    dy /= len
    const r = raios[i]
    esq.push({ x: pts[i].x - dy * r, y: pts[i].y + dx * r })
    dir.push({ x: pts[i].x + dy * r, y: pts[i].y - dx * r })
  }

  // tampas arredondadas: pontos de arco em volta das extremidades
  const capa = (centro: Ponto, vizinho: Ponto, raio: number) => {
    let dx = centro.x - vizinho.x
    let dy = centro.y - vizinho.y
    const len = Math.hypot(dx, dy) || 1
    dx /= len
    dy /= len
    const base = Math.atan2(dx, -dy) // ângulo da normal esquerda
    const pontos: { x: number; y: number }[] = []
    for (const t of [0.25, 0.5, 0.75]) {
      const ang = base - Math.PI * t
      pontos.push({ x: centro.x + Math.cos(ang) * raio, y: centro.y + Math.sin(ang) * raio })
    }
    return pontos
  }

  const fim = capa(pts[n - 1], pts[Math.max(0, n - 2)], raios[n - 1])
  const inicio = capa(pts[0], pts[Math.min(n - 1, 1)], raios[0])
  return caminhoFechado([...esq, ...fim, ...dir.reverse(), ...inicio])
}

export function desenharTraco(ctx: CanvasRenderingContext2D, traco: Traco) {
  const flat = traco.pontos
  if (flat.length < 3) return
  const caneta = canetaDoTraco(traco)
  const base = traco.espessura * caneta.fatorLargura

  ctx.save()
  ctx.globalAlpha = caneta.alpha
  ctx.fillStyle = traco.cor
  ctx.strokeStyle = traco.cor

  const pts = suavizar(extrairPontos(flat), traco.suavizacao ?? caneta.suavizacao)

  if (pts.length === 1 || flat.length === 3) {
    ctx.beginPath()
    ctx.arc(pts[0].x, pts[0].y, Math.max(0.6, (base * (1 - caneta.afinamento * 0.5)) / 2), 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    return
  }

  if (caneta.caminhoUnico) {
    // marca-texto: caminho único de largura constante (sem manchas nas emendas)
    ctx.beginPath()
    ctx.lineWidth = base
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length - 1; i++) {
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2)
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
    ctx.stroke()
    ctx.restore()
    return
  }

  // distâncias acumuladas para o afilamento das pontas
  const dist: number[] = [0]
  let total = 0
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
    dist.push(total)
  }
  const taper = caneta.afilaPontas * base

  const raios = pts.map((pt, i) => {
    let fator = 1 - caneta.afinamento * (1 - pt.p)
    if (taper > 0 && total > taper) {
      const daPonta = Math.min(dist[i], total - dist[i])
      if (daPonta < taper) fator *= 0.2 + 0.8 * Math.sqrt(daPonta / taper)
    }
    return Math.max(base * 0.06, (base * fator) / 2)
  })

  ctx.fill(contornoDoTraco(pts, raios))
  ctx.restore()
}

/** Caixa envolvente de todos os traços (coordenadas de mundo). */
export function limitesDosTracos(tracos: Traco[]) {
  if (tracos.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const t of tracos) {
    for (let i = 0; i < t.pontos.length; i += 3) {
      if (t.pontos[i] < minX) minX = t.pontos[i]
      if (t.pontos[i] > maxX) maxX = t.pontos[i]
      if (t.pontos[i + 1] < minY) minY = t.pontos[i + 1]
      if (t.pontos[i + 1] > maxY) maxY = t.pontos[i + 1]
    }
  }
  return { minX, minY, maxX, maxY, largura: maxX - minX, altura: maxY - minY }
}

/** Miniatura 240×320: enquadra o conteúdo do quadro com margem. */
export function gerarMiniatura(tracos: Traco[]): string {
  const canvas = document.createElement('canvas')
  canvas.width = 240
  canvas.height = 320
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 240, 320)

  const caixa = limitesDosTracos(tracos)
  if (caixa) {
    const margem = 40
    const w = caixa.largura + margem * 2
    const h = caixa.altura + margem * 2
    const escala = Math.min(240 / w, 320 / h, 2)
    ctx.translate(
      120 - (caixa.minX + caixa.largura / 2) * escala,
      160 - (caixa.minY + caixa.altura / 2) * escala,
    )
    ctx.scale(escala, escala)
    for (const t of tracos) desenharTraco(ctx, t)
  }
  return canvas.toDataURL('image/jpeg', 0.8)
}

/** Teste de acerto para a borracha (raio em coordenadas de mundo). */
export function tracoAtingido(traco: Traco, x: number, y: number, raio: number): boolean {
  const alcance = (raio + traco.espessura) ** 2
  const p = traco.pontos
  for (let i = 0; i < p.length; i += 3) {
    const dx = p[i] - x
    const dy = p[i + 1] - y
    if (dx * dx + dy * dy <= alcance) return true
  }
  return false
}

/* ---------- borracha de pixels ---------- */

/**
 * Remove do traço os pontos dentro do círculo da borracha, dividindo-o
 * nos pedaços restantes. Retorna null se nada foi atingido.
 */
export function apagarPixelsDoTraco(
  traco: Traco,
  x: number,
  y: number,
  raio: number,
): Traco[] | null {
  const p = traco.pontos
  const r2 = raio * raio
  const pedacos: number[][] = []
  let atual: number[] = []
  let mudou = false
  for (let i = 0; i < p.length; i += 3) {
    const dx = p[i] - x
    const dy = p[i + 1] - y
    if (dx * dx + dy * dy <= r2) {
      mudou = true
      if (atual.length >= 6) pedacos.push(atual)
      atual = []
    } else {
      atual.push(p[i], p[i + 1], p[i + 2])
    }
  }
  if (!mudou) return null
  if (atual.length >= 6) pedacos.push(atual)
  return pedacos.map((pontos) => ({ ...traco, pontos }))
}

/* ---------- seleção ---------- */

export function pontoDentroPoligono(x: number, y: number, poligono: number[]): boolean {
  // poligono achatado [x,y, x,y, …]; ray casting
  let dentro = false
  const n = poligono.length / 2
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poligono[i * 2]
    const yi = poligono[i * 2 + 1]
    const xj = poligono[j * 2]
    const yj = poligono[j * 2 + 1]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      dentro = !dentro
    }
  }
  return dentro
}

/** Algum ponto do traço dentro do polígono (amostrado p/ desempenho)? */
export function tracoDentroPoligono(traco: Traco, poligono: number[]): boolean {
  const p = traco.pontos
  const passo = p.length > 90 ? 9 : 3
  for (let i = 0; i < p.length; i += passo) {
    if (pontoDentroPoligono(p[i], p[i + 1], poligono)) return true
  }
  return false
}

/** Aplica translação + rotação (em torno de cx,cy) aos pontos do traço. */
export function transformarTraco(
  traco: Traco,
  dx: number,
  dy: number,
  ang: number,
  cx: number,
  cy: number,
): Traco {
  const cos = Math.cos(ang)
  const sen = Math.sin(ang)
  const pontos = [...traco.pontos]
  for (let i = 0; i < pontos.length; i += 3) {
    const px = pontos[i] - cx
    const py = pontos[i + 1] - cy
    pontos[i] = cx + px * cos - py * sen + dx
    pontos[i + 1] = cy + px * sen + py * cos + dy
  }
  return { ...traco, pontos }
}
