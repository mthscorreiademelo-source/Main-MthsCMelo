import { nanoid } from 'nanoid'
import { db } from '../../core/db/db'
import type { ArquivoRef } from './types'

export type Categoria = 'imagem' | 'video' | 'audio' | 'pdf' | 'texto' | 'outro'

export const ORDEM_CATEGORIAS: Categoria[] = [
  'imagem',
  'video',
  'audio',
  'pdf',
  'texto',
  'outro',
]

export const ROTULO_CATEGORIA: Record<Categoria, string> = {
  imagem: 'Imagens',
  video: 'Vídeos',
  audio: 'Áudios',
  pdf: 'PDFs',
  texto: 'Textos',
  outro: 'Outros',
}

/** Categoria a partir do MIME + nome (fallback por extensão). */
export function categoriaDe(ref: Pick<ArquivoRef, 'tipo' | 'nome'>): Categoria {
  const t = ref.tipo
  if (t.startsWith('image/')) return 'imagem'
  if (t.startsWith('video/')) return 'video'
  if (t.startsWith('audio/')) return 'audio'
  if (t === 'application/pdf') return 'pdf'
  if (t.startsWith('text/') || /\.(txt|md|csv|json|log)$/i.test(ref.nome)) return 'texto'
  return 'outro'
}

export function extensaoDe(nome: string): string {
  const m = nome.match(/\.([a-z0-9]+)$/i)
  return m ? m[1].toUpperCase() : ''
}

export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/** Guarda o blob do arquivo na tabela e devolve o metadado (ref) para a página. */
export async function salvarArquivo(arquivo: File): Promise<ArquivoRef> {
  const id = nanoid()
  const criadoEm = Date.now()
  const tipo = arquivo.type || 'application/octet-stream'
  await db.arquivos.add({
    id,
    blob: arquivo,
    nome: arquivo.name,
    tipo,
    tamanho: arquivo.size,
    criadoEm,
  })
  return { id, nome: arquivo.name, tipo, tamanho: arquivo.size, criadoEm }
}

/** URL temporária (object URL) do arquivo, para <img>/<video>/<iframe>. */
export async function urlDoArquivo(id: string): Promise<string | null> {
  const a = await db.arquivos.get(id)
  return a ? URL.createObjectURL(a.blob) : null
}

/** Conteúdo de texto do arquivo (para pré-visualizar .txt/.md/etc.). */
export async function textoDoArquivo(id: string): Promise<string> {
  const a = await db.arquivos.get(id)
  return a ? a.blob.text() : ''
}

export async function excluirArquivo(id: string) {
  await db.arquivos.delete(id)
}

/** Remove da tabela todos os blobs referenciados (ao excluir a página). */
export async function excluirArquivos(refs: ArquivoRef[]) {
  if (refs.length) await db.arquivos.bulkDelete(refs.map((r) => r.id))
}
