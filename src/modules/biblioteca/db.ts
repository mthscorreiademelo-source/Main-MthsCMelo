import { nanoid } from 'nanoid'
import { db } from '../../core/db/db'
import type { Destaque, FormatoArquivo, Livro, NotaLivro, StatusLeitura, TipoObra } from './types'

/* ---------- notas & destaques ---------- */

/** Paleta de cores para destaques (grifos). */
export const CORES_DESTAQUE = ['#f6c945', '#7ecc49', '#6accbc', '#eb96eb', '#f28b82']

export async function criarNota(d: Partial<NotaLivro> & { livroId: string; resumo: string }): Promise<string> {
  const id = d.id ?? nanoid()
  await db.notasLivro.add({
    id,
    livroId: d.livroId,
    resumo: d.resumo.trim(),
    trecho: d.trecho,
    capitulo: d.capitulo,
    tags: d.tags,
    cfi: d.cfi,
    pagina: d.pagina,
    favorito: d.favorito,
    criadoEm: Date.now(),
  })
  return id
}
export const atualizarNota = (id: string, m: Partial<NotaLivro>) => db.notasLivro.update(id, m)
export const removerNota = (id: string) => db.notasLivro.delete(id)

export async function criarDestaque(d: Partial<Destaque> & { livroId: string; trecho: string }): Promise<string> {
  const id = d.id ?? nanoid()
  await db.destaques.add({
    id,
    livroId: d.livroId,
    trecho: d.trecho.trim(),
    capitulo: d.capitulo,
    cfi: d.cfi,
    pagina: d.pagina,
    cor: d.cor ?? CORES_DESTAQUE[0],
    favorito: d.favorito,
    criadoEm: Date.now(),
  })
  return id
}
export const atualizarDestaque = (id: string, m: Partial<Destaque>) => db.destaques.update(id, m)
export const removerDestaque = (id: string) => db.destaques.delete(id)

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

/**
 * Status de uma SÉRIE derivado dos seus volumes (o nível de baixo manda):
 * algum lendo → lendo; senão algum abandonado → abandonado; senão todos lido →
 * lido; senão quero_ler. Sem volumes = quero_ler.
 */
export function statusDerivadoSerie(volumes: Livro[]): StatusLeitura {
  if (volumes.length === 0) return 'quero_ler'
  if (volumes.some((v) => v.status === 'lendo')) return 'lendo'
  if (volumes.some((v) => v.status === 'abandonado')) return 'abandonado'
  if (volumes.every((v) => v.status === 'lido')) return 'lido'
  return 'quero_ler'
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

/** Remove um compilado e TODOS os seus volumes (e arquivos locais). */
export async function removerCompilado(id: string): Promise<void> {
  const volumes = await db.livros.filter((l) => l.compiladoId === id).toArray()
  await db.transaction('rw', db.livros, db.arquivosLivros, async () => {
    for (const v of volumes) {
      await db.livros.delete(v.id)
      await db.arquivosLivros.delete(v.id)
    }
    await db.livros.delete(id)
    await db.arquivosLivros.delete(id)
  })
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

/** Remove só o arquivo local (mantém o livro na estante). */
export async function apagarArquivo(id: string): Promise<void> {
  await db.arquivosLivros.delete(id)
}

export async function obterArquivo(id: string): Promise<Blob | undefined> {
  return (await db.arquivosLivros.get(id))?.blob
}

export async function temArquivoLocal(id: string): Promise<boolean> {
  return (await db.arquivosLivros.where('id').equals(id).count()) > 0
}
