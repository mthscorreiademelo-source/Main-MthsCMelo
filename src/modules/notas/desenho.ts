import type { ItemQuadro, PostIt, TipoCaneta, Traco } from './types'

/** URL da imagem a exibir para um item (página atual, se for PDF). */
export function urlDoItem(item: ItemQuadro): string | undefined {
  if (item.tipo === 'pdf') return item.paginas?.[item.paginaAtual ?? 0]
  return item.dataUrl
}

/** Chave de cache do item — muda ao virar a página de um PDF. */
export function chaveDoItem(item: ItemQuadro): string {
  return item.tipo === 'pdf' ? `${item.id}:${item.paginaAtual ?? 0}` : item.id
}

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
    alpha: 0.6,
    afinamento: 0.3,
    suavizacao: 0.35,
    afilaPontas: 0.8,
    fatorLargura: 0.9,
    caminhoUnico: false,
    espessuraPadrao: 3,
    corPadrao: '#3B3A37',
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
  /** Modo linha reta (marca-texto): o arrasto define a reta */
  linhaReta?: boolean
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

/** Constrói o contorno preenchível de um traço com raio variável. Com
 *  `pontasRetas`, as extremidades ficam chanfradas (sem tampa arredondada) —
 *  usado na borracha dura para a tinta parar exatamente no corte. */
function contornoDoTraco(pts: Ponto[], raios: number[], pontasRetas = false): Path2D {
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

  if (pontasRetas) {
    // sem tampas: liga esquerda→direita direto, deixando as pontas chanfradas
    return caminhoFechado([...esq, ...dir.reverse()])
  }
  const fim = capa(pts[n - 1], pts[Math.max(0, n - 2)], raios[n - 1])
  const inicio = capa(pts[0], pts[Math.min(n - 1, 1)], raios[0])
  return caminhoFechado([...esq, ...fim, ...dir.reverse(), ...inicio])
}

/* ---------- textura de grafite (lápis) ---------- */

/** Ruído determinístico 0..1 (hash de valor) — estável entre re-renders. */
function ruido(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return n - Math.floor(n)
}

/**
 * Renderiza o lápis em duas camadas: um CORPO translúcido suave (dá a mancha
 * contínua e o "acúmulo" ao repassar no mesmo lugar) + um GRÃO fino pontilhado
 * por cima (o "dente" do papel), mais denso no centro e esparso nas bordas.
 *
 * O grão é semeado pela posição de cada grão no mundo — geometria determinística
 * — então fica idêntico enquanto se desenha e depois de concluir (sem "pulo"),
 * e por ser fino lê como tooth de grafite em qualquer zoom, sem virar minhocas.
 */
function desenharLapis(
  ctx: CanvasRenderingContext2D,
  pts: Ponto[],
  raios: number[],
  base: number,
  alpha: number,
  cor: string,
  pontasRetas = false,
) {
  const n = pts.length
  ctx.fillStyle = cor

  // 1) Corpo: mancha translúcida (encolhida). É translúcida de propósito — cada
  //    passada some sobre a outra, então repassar no mesmo lugar vai escurecendo.
  ctx.globalAlpha = alpha * 0.3
  ctx.fill(contornoDoTraco(pts, raios.map((r) => r * 0.78), pontasRetas))

  // 2) Grão: dente do papel. Cheio (mas ainda translúcido) no núcleo, esparso
  //    na borda → aresta áspera e granulada, e o papel aparece entre os grãos.
  const passo = Math.max(0.7, base * 0.15)
  const trans = Math.max(3, Math.min(24, Math.round(base * 1.15)))
  for (let i = 0; i < n - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const seg = Math.hypot(dx, dy)
    if (seg < 1e-3) continue
    const tx = dx / seg
    const ty = dy / seg
    const npx = -ty
    const npy = tx
    const passos = Math.max(1, Math.round(seg / passo))
    for (let s = 0; s < passos; s++) {
      const t = s / passos
      const px = a.x + dx * t
      const py = a.y + dy * t
      const r = raios[i] + (raios[i + 1] - raios[i]) * t
      for (let k = 0; k < trans; k++) {
        const h1 = ruido(i * 3.1 + s * 0.37 + k * 5.9, px * 0.7 + 0.3)
        const h2 = ruido(py * 0.7 + 0.1, i * 1.3 + s * 0.71 + k * 2.3)
        const h3 = ruido(k * 7.7 + s * 1.9 + 0.5, px * 0.31 + py * 0.11)
        // espalha um pouco além da largura pra aresta "vazar" em grãos soltos
        const frac = (h1 * 2 - 1) * 1.12
        // vãos de papel: quase nenhum no núcleo, muitos na borda (|frac|→1)
        if (h3 > 1.02 - 0.66 * Math.abs(frac)) continue
        const off = frac * r
        const jt = (h2 - 0.5) * passo
        const gx = px + npx * off + tx * jt
        const gy = py + npy * off + ty * jt
        const raio = 0.36 + h2 * 0.55
        ctx.globalAlpha = Math.min(1, alpha * (0.28 + 0.42 * h1))
        ctx.beginPath()
        ctx.arc(gx, gy, raio, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
}

export function desenharTraco(ctx: CanvasRenderingContext2D, traco: Traco) {
  const flat = traco.pontos
  if (flat.length < 3) return
  const caneta = canetaDoTraco(traco)
  const base = traco.espessura * caneta.fatorLargura

  const ehLapis = caneta.id === 'lapis'

  ctx.save()
  ctx.globalAlpha = caneta.alpha
  ctx.fillStyle = traco.cor
  ctx.strokeStyle = traco.cor

  const pts = suavizar(extrairPontos(flat), traco.suavizacao ?? caneta.suavizacao)

  if (pts.length === 1 || flat.length === 3) {
    ctx.beginPath()
    const rp = Math.max(0.6, (base * (1 - caneta.afinamento * 0.5)) / 2)
    if (ehLapis) ctx.globalAlpha = caneta.alpha * 0.6
    ctx.arc(pts[0].x, pts[0].y, rp, 0, Math.PI * 2)
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
  // Pedaço cortado pela borracha dura: pontas retas (sem afilar), pra tinta
  // ir até a borda do círculo em vez de desvanecer antes.
  const taper = traco.cortado ? 0 : caneta.afilaPontas * base

  const raios = pts.map((pt, i) => {
    let fator = 1 - caneta.afinamento * (1 - pt.p)
    if (taper > 0 && total > taper) {
      const daPonta = Math.min(dist[i], total - dist[i])
      if (daPonta < taper) fator *= 0.2 + 0.8 * Math.sqrt(daPonta / taper)
    }
    return Math.max(base * 0.06, (base * fator) / 2)
  })

  if (ehLapis) {
    desenharLapis(ctx, pts, raios, base, caneta.alpha, traco.cor, !!traco.cortado)
    ctx.restore()
    return
  }

  ctx.fill(contornoDoTraco(pts, raios, !!traco.cortado))
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

/* ---------- post-its ---------- */

export const CORES_POSTIT = [
  { id: 'amarelo', rotulo: 'Amarelo', valor: '#FEF3A2' },
  { id: 'rosa', rotulo: 'Rosa', valor: '#FFC9DE' },
  { id: 'verde', rotulo: 'Verde', valor: '#C9F2C8' },
  { id: 'azul', rotulo: 'Azul', valor: '#BFE4FF' },
] as const

/** O ponto (mundo) cai dentro do retângulo rotacionado (post-it, imagem…)? */
export function pontoNoPostIt(
  postIt: Pick<PostIt, 'x' | 'y' | 'largura' | 'altura' | 'rotacao'>,
  x: number,
  y: number,
): boolean {
  const ang = -(postIt.rotacao ?? 0)
  const cos = Math.cos(ang)
  const sen = Math.sin(ang)
  const dx = x - postIt.x
  const dy = y - postIt.y
  const lx = dx * cos - dy * sen
  const ly = dx * sen + dy * cos
  return Math.abs(lx) <= postIt.largura / 2 && Math.abs(ly) <= postIt.altura / 2
}

/**
 * O traço em curso é uma RASURA (rabisco de vai-e-vem denso)? Serve para
 * apagar por gesto: rabiscar por cima de algo com a caneta/lápis. Detecta
 * muitas reversões bruscas de direção e um caminho bem maior que a caixa.
 */
export function ehRasura(pontos: number[]): boolean {
  const n = pontos.length / 3
  if (n < 14) return false
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let comp = 0
  let rev = 0
  let vpx = 0
  let vpy = 0
  for (let k = 0; k < n; k++) {
    const x = pontos[k * 3]
    const y = pontos[k * 3 + 1]
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
    if (k > 0) {
      const dx = x - pontos[(k - 1) * 3]
      const dy = y - pontos[(k - 1) * 3 + 1]
      const d = Math.hypot(dx, dy)
      comp += d
      if (d > 2) {
        if (vpx || vpy) {
          const cos = (dx * vpx + dy * vpy) / (d * Math.hypot(vpx, vpy) || 1)
          if (cos < -0.2) rev++ // virou mais de ~100° = vai-e-vem
        }
        vpx = dx
        vpy = dy
      }
    }
  }
  const diag = Math.hypot(maxX - minX, maxY - minY) || 1
  return rev >= 4 && comp / diag >= 2.2
}

/* ---------- borracha de pixels (dura) ---------- */

/** Ponto onde o segmento A→B cruza o círculo (centro c, raio r). Um endpoint
 *  está dentro e o outro fora, então há exatamente um cruzamento em (0,1). */
function cruzamentoCirculo(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, r: number,
): [number, number] | null {
  const dx = bx - ax
  const dy = by - ay
  const fx = ax - cx
  const fy = ay - cy
  const a = dx * dx + dy * dy
  if (a < 1e-9) return null
  const b = 2 * (fx * dx + fy * dy)
  const c = fx * fx + fy * fy - r * r
  const disc = b * b - 4 * a * c
  if (disc < 0) return null
  const s = Math.sqrt(disc)
  const t1 = (-b - s) / (2 * a)
  const t2 = (-b + s) / (2 * a)
  const t = t1 >= 0 && t1 <= 1 ? t1 : t2 >= 0 && t2 <= 1 ? t2 : null
  if (t === null) return null
  return [ax + dx * t, ay + dy * t]
}

/**
 * Borracha "dura": remove os pontos dentro do círculo e corta a linha
 * EXATAMENTE na borda do círculo (insere o ponto de interseção), preservando
 * fielmente o que está fora. Os pedaços saem marcados como `cortado` para
 * renderizar com pontas retas (sem afilar/desvanecer). Null se nada atingido.
 */
export function apagarPixelsDoTraco(
  traco: Traco,
  x: number,
  y: number,
  raio: number,
): Traco[] | null {
  const p = traco.pontos
  const r2 = raio * raio
  const n = p.length / 3
  const dentro = (i: number) => {
    const dx = p[i] - x
    const dy = p[i + 1] - y
    return dx * dx + dy * dy <= r2
  }

  let algum = false
  for (let k = 0; k < n; k++) {
    if (dentro(k * 3)) {
      algum = true
      break
    }
  }
  if (!algum) return null

  const pedacos: number[][] = []
  let atual: number[] = []
  const fechar = () => {
    if (atual.length >= 6) pedacos.push(atual)
    atual = []
  }

  for (let k = 0; k < n; k++) {
    const i = k * 3
    const in0 = dentro(i)
    if (!in0) atual.push(p[i], p[i + 1], p[i + 2])
    if (k < n - 1) {
      const j = (k + 1) * 3
      const in1 = dentro(j)
      if (in0 !== in1) {
        const cruz = cruzamentoCirculo(p[i], p[i + 1], p[j], p[j + 1], x, y, raio)
        if (cruz) {
          const pr = in0 ? p[j + 2] : p[i + 2]
          if (!in0 && in1) {
            // saindo (fora → dentro): fecha o pedaço na borda
            atual.push(cruz[0], cruz[1], pr)
            fechar()
          } else {
            // entrando (dentro → fora): começa novo pedaço na borda
            atual.push(cruz[0], cruz[1], pr)
          }
        } else if (!in0 && in1) {
          fechar()
        }
      }
    }
  }
  fechar()
  return pedacos.map((pontos) => ({ ...traco, pontos, cortado: true }))
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

/** Aplica escala + rotação (em torno de cx,cy) e translação aos pontos do traço. */
export function transformarTraco(
  traco: Traco,
  dx: number,
  dy: number,
  ang: number,
  cx: number,
  cy: number,
  escala = 1,
): Traco {
  const cos = Math.cos(ang)
  const sen = Math.sin(ang)
  const pontos = [...traco.pontos]
  for (let i = 0; i < pontos.length; i += 3) {
    const px = (pontos[i] - cx) * escala
    const py = (pontos[i + 1] - cy) * escala
    pontos[i] = cx + px * cos - py * sen + dx
    pontos[i + 1] = cy + px * sen + py * cos + dy
  }
  return {
    ...traco,
    pontos,
    ...(escala !== 1 ? { espessura: Math.max(0.5, traco.espessura * escala) } : {}),
  }
}
