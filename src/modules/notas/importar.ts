import { nanoid } from 'nanoid'
import type { ItemQuadro } from './types'

const LARGURA_MAX_PIXELS = 1600
const LARGURA_MUNDO = 900
const MAX_PAGINAS_PDF = 20

/** Reduz uma imagem da galeria e cria um item centrado no ponto dado. */
export async function imagemParaItem(
  arquivo: File,
  centroX: number,
  centroY: number,
): Promise<ItemQuadro> {
  const url = URL.createObjectURL(arquivo)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Imagem inválida'))
      el.src = url
    })
    const escala = Math.min(1, LARGURA_MAX_PIXELS / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * escala)
    canvas.height = Math.round(img.height * escala)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    const largura = Math.min(LARGURA_MUNDO, img.width)
    const altura = largura * (img.height / img.width)
    return {
      id: nanoid(),
      tipo: 'imagem',
      dataUrl: canvas.toDataURL('image/jpeg', 0.85),
      x: centroX,
      y: centroY,
      largura,
      altura,
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Converte as páginas de um PDF em itens de imagem empilhados verticalmente. */
export async function pdfParaItens(
  arquivo: File,
  centroX: number,
  centroY: number,
): Promise<{ itens: ItemQuadro[]; totalPaginas: number }> {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default

  const dados = await arquivo.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: dados }).promise
  const paginas = Math.min(doc.numPages, MAX_PAGINAS_PDF)
  const itens: ItemQuadro[] = []
  let y = centroY

  for (let n = 1; n <= paginas; n++) {
    const pagina = await doc.getPage(n)
    const base = pagina.getViewport({ scale: 1 })
    const escalaPx = Math.min(2, 1400 / base.width)
    const viewport = pagina.getViewport({ scale: escalaPx })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await pagina.render({ canvasContext: ctx, viewport }).promise

    const largura = LARGURA_MUNDO
    const altura = largura * (base.height / base.width)
    itens.push({
      id: nanoid(),
      tipo: 'imagem',
      dataUrl: canvas.toDataURL('image/jpeg', 0.85),
      x: centroX,
      y: y + altura / 2,
      largura,
      altura,
    })
    y += altura + 40
  }
  const totalPaginas = doc.numPages
  await doc.cleanup()
  return { itens, totalPaginas }
}
