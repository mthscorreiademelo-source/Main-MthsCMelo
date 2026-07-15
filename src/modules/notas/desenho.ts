import type { TipoCaneta, Traco } from './types'

/** Comportamento de render de cada caneta. */
interface Caneta {
  id: TipoCaneta
  rotulo: string
  /** Opacidade do traço */
  alpha: number
  /** Largura do risco em função da espessura da ponta e da pressão */
  largura: (espessura: number, pressao: number) => number
  /** true = um caminho só com largura constante (evita manchas em cor translúcida) */
  caminhoUnico: boolean
  /** Afilamento nas pontas (pincel) */
  afila: boolean
  espessuraPadrao: number
  corPadrao: string
}

export const CANETAS: Record<TipoCaneta, Caneta> = {
  lapis: {
    id: 'lapis',
    rotulo: 'Lápis grafite',
    alpha: 0.72,
    largura: (e, p) => e * (0.7 + p * 0.5),
    caminhoUnico: false,
    afila: false,
    espessuraPadrao: 3,
    corPadrao: '#5A5A56',
  },
  tinteiro: {
    id: 'tinteiro',
    rotulo: 'Caneta tinteiro',
    alpha: 1,
    largura: (e, p) => e * (0.35 + p * 1.3),
    caminhoUnico: false,
    afila: false,
    espessuraPadrao: 5,
    corPadrao: '#37352F',
  },
  marcador: {
    id: 'marcador',
    rotulo: 'Marca-texto',
    alpha: 0.35,
    largura: (e) => e * 2.5,
    caminhoUnico: true,
    afila: false,
    espessuraPadrao: 10,
    corPadrao: '#FFD400',
  },
  pincel: {
    id: 'pincel',
    rotulo: 'Pincel',
    alpha: 1,
    largura: (e, p) => e * (0.15 + p * 2.3),
    caminhoUnico: false,
    afila: true,
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
}

export type ConfigsCanetas = Record<TipoCaneta, ConfigCaneta>

/** Preferências por caneta (cor/ponta), persistidas entre sessões. */
export function configsIniciais(): ConfigsCanetas {
  const salvas = localStorage.getItem('vida:canetas')
  if (salvas) {
    try {
      return JSON.parse(salvas) as ConfigsCanetas
    } catch {
      /* ignora e usa padrões */
    }
  }
  return Object.fromEntries(
    LISTA_CANETAS.map((c) => [c.id, { cor: c.corPadrao, espessura: c.espessuraPadrao }]),
  ) as ConfigsCanetas
}

export function canetaDoTraco(traco: Traco): Caneta {
  if (traco.ferramenta) return CANETAS[traco.ferramenta]
  // traços da v0.6: marca-texto era salvo como cor rgba translúcida
  return traco.cor.startsWith('rgba') ? CANETAS.marcador : CANETAS.tinteiro
}

export function desenharTraco(ctx: CanvasRenderingContext2D, traco: Traco) {
  const p = traco.pontos
  if (p.length < 3) return
  const caneta = canetaDoTraco(traco)

  ctx.save()
  ctx.globalAlpha = caneta.alpha
  ctx.strokeStyle = traco.cor
  ctx.fillStyle = traco.cor
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (p.length === 3) {
    ctx.beginPath()
    ctx.arc(p[0], p[1], caneta.largura(traco.espessura, p[2] || 0.5) / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    return
  }

  if (caneta.caminhoUnico) {
    ctx.beginPath()
    ctx.lineWidth = caneta.largura(traco.espessura, 0.5)
    ctx.moveTo(p[0], p[1])
    for (let i = 3; i < p.length; i += 3) ctx.lineTo(p[i], p[i + 1])
    ctx.stroke()
    ctx.restore()
    return
  }

  const totalSegs = p.length / 3 - 1
  const zonaAfila = Math.max(2, Math.min(6, totalSegs * 0.25))
  for (let i = 3; i < p.length; i += 3) {
    const seg = i / 3
    const pressao = ((p[i - 1] || 0.5) + (p[i + 2] || 0.5)) / 2
    let largura = caneta.largura(traco.espessura, pressao)
    if (caneta.afila) {
      const fator = Math.min(1, seg / zonaAfila, (totalSegs - seg + 1) / zonaAfila)
      largura *= 0.25 + 0.75 * fator
    }
    ctx.beginPath()
    ctx.lineWidth = Math.max(0.5, largura)
    ctx.moveTo(p[i - 3], p[i - 2])
    ctx.lineTo(p[i], p[i + 1])
    ctx.stroke()
  }
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
