import { nanoid } from 'nanoid'
import { db } from '../../core/db/db'
import type { Bloco, Pagina, TipoBloco } from './types'

export function novoBloco(tipo: TipoBloco = 'paragrafo', texto = ''): Bloco {
  return { id: nanoid(), tipo, texto }
}

/** Cria uma página vazia e devolve o id (para navegar direto ao editor). */
export async function criarPagina(): Promise<string> {
  const agora = Date.now()
  const pagina: Pagina = {
    id: nanoid(),
    titulo: '',
    blocos: [novoBloco()],
    criadaEm: agora,
    atualizadaEm: agora,
  }
  await db.paginas.add(pagina)
  return pagina.id
}

export async function salvarPagina(pagina: Pagina) {
  await db.paginas.put({ ...pagina, atualizadaEm: Date.now() })
}

export async function excluirPagina(id: string) {
  await db.paginas.delete(id)
}

/** Primeira linha de conteúdo, para o preview na lista. */
export function textoResumo(pagina: Pagina): string {
  const bloco = pagina.blocos.find((b) => b.texto.trim())
  return bloco?.texto.trim() ?? ''
}
