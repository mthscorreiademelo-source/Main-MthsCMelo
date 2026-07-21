/**
 * Importação/exportação de notas em Markdown — portabilidade local-first
 * (útil para um futuro servidor pessoal). Determinístico, offline, sem IA.
 */
import { db } from '../../core/db/db'
import { criarPagina, novoBloco } from './db'
import type { Bloco, Pagina } from './types'

/** Converte texto Markdown/plano em título + blocos estruturados. */
export function mdParaNota(md: string): { titulo: string; blocos: Bloco[] } {
  const linhas = md.replace(/\r\n/g, '\n').split('\n')
  let titulo = ''
  const blocos: Bloco[] = []
  for (const raw of linhas) {
    const t = raw.trim()
    if (!titulo && /^#\s+/.test(t)) { titulo = t.replace(/^#\s+/, ''); continue }
    if (t === '') continue
    let m: RegExpMatchArray | null
    if ((m = t.match(/^[-*]\s+\[([ xX])\]\s+(.*)/))) {
      const b = novoBloco('todo', m[2])
      b.feito = m[1].toLowerCase() === 'x'
      blocos.push(b)
    } else if ((m = t.match(/^#{1,6}\s+(.*)/))) {
      blocos.push(novoBloco('titulo', m[1]))
    } else if ((m = t.match(/^[-*+]\s+(.*)/)) || (m = t.match(/^\d+\.\s+(.*)/))) {
      blocos.push(novoBloco('lista', m[1]))
    } else {
      blocos.push(novoBloco('paragrafo', t))
    }
  }
  if (blocos.length === 0) blocos.push(novoBloco())
  return { titulo, blocos }
}

/** Cria uma nota a partir de um arquivo .md/.markdown/.txt. */
export async function importarMarkdown(arquivo: File, grupoId?: string): Promise<string> {
  const texto = await arquivo.text()
  const { titulo, blocos } = mdParaNota(texto)
  const id = await criarPagina(grupoId)
  await db.paginas.update(id, {
    titulo: titulo || arquivo.name.replace(/\.(md|markdown|txt)$/i, ''),
    blocos,
    atualizadaEm: Date.now(),
  })
  return id
}

/** Serializa uma nota de texto em Markdown. */
export function notaParaMd(pagina: Pagina): string {
  const linhas: string[] = []
  if (pagina.titulo) { linhas.push(`# ${pagina.titulo}`, '') }
  for (const b of pagina.blocos) {
    if (b.tipo === 'titulo') linhas.push(`## ${b.texto}`)
    else if (b.tipo === 'lista') linhas.push(`- ${b.texto}`)
    else if (b.tipo === 'todo') linhas.push(`- [${b.feito ? 'x' : ' '}] ${b.texto}`)
    else linhas.push(b.texto)
    linhas.push('')
  }
  return linhas.join('\n').trim() + '\n'
}

/** Baixa a nota como arquivo .md. */
export function baixarNotaMd(pagina: Pagina) {
  const md = notaParaMd(pagina)
  const nome = (pagina.titulo || 'nota').replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'nota'
  const blob = new Blob([md], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nome}.md`
  a.click()
  URL.revokeObjectURL(url)
}
