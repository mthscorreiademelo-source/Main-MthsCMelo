import type { FormatoArquivo, TipoObra } from './types'

export interface MetadadosLivro {
  titulo: string
  autor?: string
  capa?: string
  formato: FormatoArquivo
  tipo: TipoObra
  paginasTotais?: number
}

const IMG_EXT = /\.(jpe?g|png|webp|gif|avif)$/i

export function detectarFormato(arquivo: File): FormatoArquivo | null {
  const nome = arquivo.name.toLowerCase()
  if (nome.endsWith('.epub')) return 'epub'
  if (nome.endsWith('.pdf')) return 'pdf'
  if (nome.endsWith('.cbz') || nome.endsWith('.zip')) return 'cbz'
  if (arquivo.type === 'application/pdf') return 'pdf'
  if (arquivo.type === 'application/epub+zip') return 'epub'
  return null
}

function semExtensao(nome: string): string {
  return nome.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim()
}

/** Reduz uma imagem (blob) a uma miniatura JPEG (data URL). */
async function gerarMiniatura(blob: Blob, maxLargura = 320): Promise<string | undefined> {
  try {
    const bitmap = await createImageBitmap(blob)
    const escala = Math.min(1, maxLargura / bitmap.width)
    const largura = Math.round(bitmap.width * escala)
    const altura = Math.round(bitmap.height * escala)
    const canvas = document.createElement('canvas')
    canvas.width = largura
    canvas.height = altura
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined
    ctx.drawImage(bitmap, 0, 0, largura, altura)
    bitmap.close()
    return canvas.toDataURL('image/jpeg', 0.72)
  } catch {
    return undefined
  }
}

/** Título/autor/capa de um EPUB (que é um zip com um arquivo .opf). */
async function metadadosEpub(arquivo: File, JSZip: typeof import('jszip')): Promise<MetadadosLivro> {
  const base: MetadadosLivro = { titulo: semExtensao(arquivo.name), formato: 'epub', tipo: 'livro' }
  try {
    const zip = await JSZip.loadAsync(arquivo)
    const containerXml = await zip.file('META-INF/container.xml')?.async('string')
    if (!containerXml) return base
    const dom = new DOMParser()
    const container = dom.parseFromString(containerXml, 'application/xml')
    const opfPath = container.querySelector('rootfile')?.getAttribute('full-path')
    if (!opfPath) return base
    const opfXml = await zip.file(opfPath)?.async('string')
    if (!opfXml) return base
    const opf = dom.parseFromString(opfXml, 'application/xml')

    const pegar = (tag: string) =>
      opf.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', tag)[0]?.textContent?.trim() ||
      opf.getElementsByTagName(`dc:${tag}`)[0]?.textContent?.trim()

    const titulo = pegar('title') || base.titulo
    const autor = pegar('creator') || undefined

    // Capa: <meta name="cover" content="id"> → item href; ou item com properties cover-image.
    const dir = opfPath.includes('/') ? opfPath.replace(/\/[^/]*$/, '/') : ''
    const itens = Array.from(opf.getElementsByTagName('item'))
    const metaCover = Array.from(opf.getElementsByTagName('meta')).find(
      (m) => m.getAttribute('name') === 'cover',
    )
    let coverHref: string | undefined
    const idCover = metaCover?.getAttribute('content')
    if (idCover) coverHref = itens.find((i) => i.getAttribute('id') === idCover)?.getAttribute('href') ?? undefined
    if (!coverHref) {
      coverHref = itens
        .find((i) => (i.getAttribute('properties') ?? '').includes('cover-image'))
        ?.getAttribute('href') ?? undefined
    }
    if (!coverHref) {
      coverHref = itens
        .find((i) => (i.getAttribute('media-type') ?? '').startsWith('image/'))
        ?.getAttribute('href') ?? undefined
    }

    let capa: string | undefined
    if (coverHref) {
      const caminho = decodeURIComponent(dir + coverHref)
      const imgBlob = await zip.file(caminho)?.async('blob')
      if (imgBlob) capa = await gerarMiniatura(imgBlob)
    }
    return { titulo, autor, capa, formato: 'epub', tipo: 'livro' }
  } catch {
    return base
  }
}

/** Capa (primeira imagem) e contagem de páginas de um CBZ. */
async function metadadosCbz(arquivo: File, JSZip: typeof import('jszip')): Promise<MetadadosLivro> {
  const base: MetadadosLivro = { titulo: semExtensao(arquivo.name), formato: 'cbz', tipo: 'quadrinho' }
  try {
    const zip = await JSZip.loadAsync(arquivo)
    const imagens = Object.keys(zip.files)
      .filter((n) => IMG_EXT.test(n) && !zip.files[n].dir)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    if (imagens.length === 0) return base
    const primeira = await zip.file(imagens[0])?.async('blob')
    const capa = primeira ? await gerarMiniatura(primeira) : undefined
    return { ...base, capa, paginasTotais: imagens.length }
  } catch {
    return base
  }
}

/** Capa (página 1) e total de páginas de um PDF. */
async function metadadosPdf(arquivo: File): Promise<MetadadosLivro> {
  const base: MetadadosLivro = { titulo: semExtensao(arquivo.name), formato: 'pdf', tipo: 'livro' }
  try {
    const pdfjs = await import('pdfjs-dist')
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    const doc = await pdfjs.getDocument({ data: await arquivo.arrayBuffer() }).promise
    const total = doc.numPages
    const pagina = await doc.getPage(1)
    const base1 = pagina.getViewport({ scale: 1 })
    const escala = Math.min(2, 640 / base1.width)
    const viewport = pagina.getViewport({ scale: escala })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await pagina.render({ canvasContext: ctx, viewport }).promise
    const capa = canvas.toDataURL('image/jpeg', 0.72)
    await doc.cleanup()
    return { ...base, capa, paginasTotais: total }
  } catch {
    return base
  }
}

/** Extrai metadados (título, autor, capa, páginas) de um arquivo de livro. */
export async function extrairMetadados(arquivo: File): Promise<MetadadosLivro | null> {
  const formato = detectarFormato(arquivo)
  if (!formato) return null
  if (formato === 'pdf') return metadadosPdf(arquivo)
  const { default: JSZip } = await import('jszip')
  if (formato === 'epub') return metadadosEpub(arquivo, JSZip)
  return metadadosCbz(arquivo, JSZip)
}
