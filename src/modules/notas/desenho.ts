import type { Traco } from './types'

/** Página lógica fixa (retrato 3:4) — traços independentes do dispositivo. */
export const LARGURA_PAGINA = 1536
export const ALTURA_PAGINA = 2048

export const CORES_CANETA = [
  { id: 'tinta', rotulo: 'Tinta', valor: '#37352F' },
  { id: 'azul', rotulo: 'Azul', valor: '#2383E2' },
  { id: 'vermelho', rotulo: 'Vermelho', valor: '#D44C47' },
  { id: 'marcador', rotulo: 'Marca-texto', valor: 'rgba(255, 212, 0, 0.45)' },
] as const

export const ESPESSURAS = [3, 6, 12] as const

const eTranslucida = (cor: string) => cor.startsWith('rgba')

export function desenharTraco(ctx: CanvasRenderingContext2D, traco: Traco) {
  const p = traco.pontos
  if (p.length < 3) return
  ctx.strokeStyle = traco.cor
  ctx.fillStyle = traco.cor
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (p.length === 3) {
    // ponto único → bolinha
    ctx.beginPath()
    ctx.arc(p[0], p[1], traco.espessura / 2, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  if (eTranslucida(traco.cor)) {
    // cores translúcidas (marca-texto): caminho único com largura constante
    // para evitar manchas escuras nas emendas dos segmentos
    ctx.beginPath()
    ctx.lineWidth = traco.espessura * 2
    ctx.moveTo(p[0], p[1])
    for (let i = 3; i < p.length; i += 3) ctx.lineTo(p[i], p[i + 1])
    ctx.stroke()
    return
  }

  // caneta: largura por segmento conforme a pressão da stylus
  for (let i = 3; i < p.length; i += 3) {
    const pressao = ((p[i - 1] || 0.5) + (p[i + 2] || 0.5)) / 2
    ctx.beginPath()
    ctx.lineWidth = traco.espessura * (0.4 + pressao * 1.2)
    ctx.moveTo(p[i - 3], p[i - 2])
    ctx.lineTo(p[i], p[i + 1])
    ctx.stroke()
  }
}

export function desenharTudo(ctx: CanvasRenderingContext2D, tracos: Traco[]) {
  ctx.clearRect(0, 0, LARGURA_PAGINA, ALTURA_PAGINA)
  for (const t of tracos) desenharTraco(ctx, t)
}

/** Miniatura 240×320 (JPEG dataURL) para a lista de notas. */
export function gerarMiniatura(tracos: Traco[]): string {
  const canvas = document.createElement('canvas')
  canvas.width = 240
  canvas.height = 320
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 240, 320)
  ctx.scale(240 / LARGURA_PAGINA, 320 / ALTURA_PAGINA)
  for (const t of tracos) desenharTraco(ctx, t)
  return canvas.toDataURL('image/jpeg', 0.8)
}

/** Teste de acerto para a borracha: algum ponto do traço dentro do raio? */
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
