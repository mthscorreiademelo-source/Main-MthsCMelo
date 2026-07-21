import { nanoid } from 'nanoid'
import type { ItemQuadro } from './types'

const LARGURA_MAX_PIXELS = 1600
const LARGURA_MUNDO = 900
const MAX_PAGINAS_PDF = 30

/** Detecta se algum pixel do canvas não é totalmente opaco (tem alfa < 255). */
function temTransparencia(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  try {
    const dados = ctx.getImageData(0, 0, w, h).data
    // amostra o canal alfa (cada 4º byte); passo largo para ser rápido
    const passo = Math.max(4, Math.floor(dados.length / 4 / 4000) * 4)
    for (let i = 3; i < dados.length; i += passo) {
      if (dados[i] < 250) return true
    }
    return false
  } catch {
    return false
  }
}

function carregarImagem(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Imagem inválida'))
    el.src = url
  })
}

/** Reduz uma imagem da galeria e cria um item centrado no ponto dado. */
export async function imagemParaItem(
  arquivo: File,
  centroX: number,
  centroY: number,
): Promise<ItemQuadro> {
  const url = URL.createObjectURL(arquivo)
  try {
    return await imagemDeUrl(url, centroX, centroY)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Cria um item de imagem a partir de uma URL/dataURL (usado por galeria e PDF). */
export async function imagemDeUrl(
  url: string,
  centroX: number,
  centroY: number,
): Promise<ItemQuadro> {
  const img = await carregarImagem(url)
  const escala = Math.min(1, LARGURA_MAX_PIXELS / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * escala)
  canvas.height = Math.round(img.height * escala)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const largura = Math.min(LARGURA_MUNDO, img.width)
  const altura = largura * (img.height / img.width)
  // Preserva transparência (ícones/PNG orgânicos): se a imagem tem algum pixel
  // não-opaco, exporta PNG (com alfa); senão, JPEG (arquivo menor para fotos).
  return {
    id: nanoid(),
    tipo: 'imagem',
    dataUrl: temTransparencia(ctx, canvas.width, canvas.height)
      ? canvas.toDataURL('image/png')
      : canvas.toDataURL('image/jpeg', 0.85),
    x: centroX,
    y: centroY,
    largura,
    altura,
  }
}

/**
 * Renderiza as páginas de um PDF como dataURLs JPEG (até MAX_PAGINAS_PDF).
 * Retorna também o total real de páginas do documento.
 */
export async function renderizarPaginasPdf(
  arquivo: File,
): Promise<{ paginas: string[]; total: number }> {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default

  const dados = await arquivo.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: dados }).promise
  const total = doc.numPages
  const qtd = Math.min(total, MAX_PAGINAS_PDF)
  const paginas: string[] = []

  for (let n = 1; n <= qtd; n++) {
    const pagina = await doc.getPage(n)
    const base = pagina.getViewport({ scale: 1 })
    const escalaPx = Math.min(2, 1200 / base.width)
    const viewport = pagina.getViewport({ scale: escalaPx })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await pagina.render({ canvasContext: ctx, viewport }).promise
    paginas.push(canvas.toDataURL('image/jpeg', 0.72))
  }
  await doc.cleanup()
  return { paginas, total }
}

/** Cria um item de imagem a partir de uma página de PDF já renderizada. */
export function itemImagemDePagina(
  dataUrl: string,
  centroX: number,
  centroY: number,
): Promise<ItemQuadro> {
  return imagemDeUrl(dataUrl, centroX, centroY)
}

/** Cria um item folheador (PDF inteiro): mostra uma página por vez. */
export async function itemPagerPdf(
  paginas: string[],
  centroX: number,
  centroY: number,
): Promise<ItemQuadro> {
  const img = await carregarImagem(paginas[0])
  const largura = LARGURA_MUNDO
  const altura = largura * (img.height / img.width)
  return {
    id: nanoid(),
    tipo: 'pdf',
    paginas,
    paginaAtual: 0,
    x: centroX,
    y: centroY,
    largura,
    altura,
  }
}
