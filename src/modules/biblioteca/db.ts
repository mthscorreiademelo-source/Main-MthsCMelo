import { nanoid } from 'nanoid'
import { db } from '../../core/db/db'
import type { FormatoArquivo, Livro, StatusLeitura, TipoObra } from './types'

export const STATUS: { valor: StatusLeitura; rotulo: string }[] = [
  { valor: 'quero_ler', rotulo: 'Quero ler' },
  { valor: 'lendo', rotulo: 'Lendo' },
  { valor: 'lido', rotulo: 'Lido' },
  { valor: 'abandonado', rotulo: 'Abandonei' },
]

export const TIPOS: { valor: TipoObra; rotulo: string }[] = [
  { valor: 'livro', rotulo: 'Livro' },
  { valor: 'quadrinho', rotulo: 'Quadrinho' },
  { valor: 'manga', rotulo: 'Mangá' },
]

export function rotuloStatus(s: StatusLeitura): string {
  return STATUS.find((x) => x.valor === s)?.rotulo ?? s
}

export function rotuloTipo(t: TipoObra): string {
  return TIPOS.find((x) => x.valor === t)?.rotulo ?? t
}

export function novoLivro(dados: Partial<Livro> & { titulo: string }): Livro {
  const agora = Date.now()
  return {
    id: nanoid(),
    tipo: 'livro',
    status: 'quero_ler',
    adicionadoEm: agora,
    ...dados,
  }
}

/** Cria/atualiza um livro, ajustando datas de início/fim conforme o status. */
export async function salvarLivro(livro: Livro): Promise<void> {
  const ajustado = { ...livro }
  if (ajustado.status === 'lendo' && !ajustado.iniciadoEm) ajustado.iniciadoEm = Date.now()
  if (ajustado.status === 'lido') {
    if (!ajustado.iniciadoEm) ajustado.iniciadoEm = Date.now()
    if (!ajustado.concluidoEm) ajustado.concluidoEm = Date.now()
    if (ajustado.progresso == null || ajustado.progresso < 100) ajustado.progresso = 100
  }
  await db.livros.put(ajustado)
}

export async function removerLivro(id: string): Promise<void> {
  await db.livros.delete(id)
  await db.arquivosLivros.delete(id)
}

/** Guarda o arquivo local (blob) e marca o livro como tendo arquivo. */
export async function guardarArquivo(
  id: string,
  blob: Blob,
  formato: FormatoArquivo,
  nome: string,
): Promise<void> {
  await db.arquivosLivros.put({
    id,
    blob,
    formato,
    nome,
    tamanho: blob.size,
    criadoEm: Date.now(),
  })
}

export async function obterArquivo(id: string): Promise<Blob | undefined> {
  return (await db.arquivosLivros.get(id))?.blob
}

export async function temArquivoLocal(id: string): Promise<boolean> {
  return (await db.arquivosLivros.where('id').equals(id).count()) > 0
}
