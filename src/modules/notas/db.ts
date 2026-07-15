import { nanoid } from 'nanoid'
import { db } from '../../core/db/db'
import type { Bloco, Grupo, Pagina, TipoBloco } from './types'

export function novoBloco(tipo: TipoBloco = 'paragrafo', texto = ''): Bloco {
  return { id: nanoid(), tipo, texto }
}

/** Cria uma página vazia (texto ou desenho, solta ou num grupo) e devolve o id. */
export async function criarPagina(
  grupoId?: string,
  tipo: 'texto' | 'desenho' = 'texto',
): Promise<string> {
  const agora = Date.now()
  const pagina: Pagina = {
    id: nanoid(),
    titulo: '',
    blocos: tipo === 'desenho' ? [] : [novoBloco()],
    criadaEm: agora,
    atualizadaEm: agora,
    ...(grupoId ? { grupoId } : {}),
    ...(tipo === 'desenho' ? { tipo, tracos: [] } : {}),
  }
  await db.paginas.add(pagina)
  return pagina.id
}

/** Move a nota para um grupo (ou para "soltas", com grupoId undefined). */
export async function moverPagina(id: string, grupoId?: string) {
  await db.paginas.update(id, { grupoId })
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

/* ---------- grupos ---------- */

export async function criarGrupo(nome: string): Promise<string | undefined> {
  const texto = nome.trim()
  if (!texto) return
  const agora = Date.now()
  const grupo: Grupo = { id: nanoid(), nome: texto, criadoEm: agora, ordem: agora }
  await db.grupos.add(grupo)
  return grupo.id
}

export async function atualizarGrupo(id: string, mudancas: Partial<Grupo>) {
  await db.grupos.update(id, mudancas)
}

/** Exclui o grupo; as notas dele viram notas soltas. */
export async function excluirGrupo(id: string) {
  await db.transaction('rw', db.grupos, db.paginas, async () => {
    await db.paginas.where('grupoId').equals(id).modify({ grupoId: undefined })
    await db.grupos.delete(id)
  })
}

export function ordenarGrupos(grupos: Grupo[]): Grupo[] {
  return [...grupos].sort((a, b) => a.ordem - b.ordem)
}

const CAPA_LARGURA = 480
const CAPA_ALTURA = 600 // proporção retrato 4:5

/**
 * Lê um arquivo de imagem, recorta ao centro em 4:5 e reduz para ~480×600.
 * Retorna dataURL JPEG pronto para guardar no banco e usar em <img src>.
 */
export async function processarCapa(arquivo: File): Promise<string> {
  const url = URL.createObjectURL(arquivo)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Imagem inválida'))
      el.src = url
    })
    const alvo = CAPA_LARGURA / CAPA_ALTURA
    const origem = img.width / img.height
    // recorte central mantendo a proporção 4:5
    let sw = img.width
    let sh = img.height
    if (origem > alvo) sw = Math.round(img.height * alvo)
    else sh = Math.round(img.width / alvo)
    const sx = Math.round((img.width - sw) / 2)
    const sy = Math.round((img.height - sh) / 2)

    const canvas = document.createElement('canvas')
    canvas.width = CAPA_LARGURA
    canvas.height = CAPA_ALTURA
    canvas
      .getContext('2d')!
      .drawImage(img, sx, sy, sw, sh, 0, 0, CAPA_LARGURA, CAPA_ALTURA)
    return canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}
