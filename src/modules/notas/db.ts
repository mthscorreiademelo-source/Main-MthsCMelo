import { nanoid } from 'nanoid'
import { db } from '../../core/db/db'
import { excluirArquivos } from './arquivos'
import type { Bloco, Grupo, Pagina, TipoBloco } from './types'

export function novoBloco(tipo: TipoBloco = 'paragrafo', texto = ''): Bloco {
  return { id: nanoid(), tipo, texto }
}

/** Cria uma página vazia (texto, desenho ou arquivos), solta ou num grupo. */
export async function criarPagina(
  grupoId?: string,
  tipo: 'texto' | 'desenho' | 'arquivos' = 'texto',
): Promise<string> {
  const agora = Date.now()
  const pagina: Pagina = {
    id: nanoid(),
    titulo: '',
    blocos: tipo === 'texto' ? [novoBloco()] : [],
    criadaEm: agora,
    atualizadaEm: agora,
    ...(grupoId ? { grupoId } : {}),
    ...(tipo === 'desenho' ? { tipo, tracos: [] } : {}),
    ...(tipo === 'arquivos' ? { tipo, arquivos: [] } : {}),
  }
  await db.paginas.add(pagina)
  registrarSeedNota(pagina)
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
  // limpa também os blobs dos arquivos anexados, se houver
  const pagina = await db.paginas.get(id)
  if (pagina?.arquivos?.length) await excluirArquivos(pagina.arquivos)
  await db.paginas.delete(id)
}

/* ---------- descarte automático de notas vazias ---------- */

/**
 * Assinatura determinística do conteúdo "de partida" de uma nota, para detectar
 * se um modelo foi aberto e fechado sem nenhuma edição do usuário.
 */
export function assinaturaNota(pagina: Pagina): string {
  return JSON.stringify({
    t: (pagina.titulo ?? '').trim(),
    b: (pagina.blocos ?? []).map((b) => [b.tipo, (b.texto ?? '').trim(), b.feito ? 1 : 0]),
    r: pagina.tracos?.length ?? 0,
    a: pagina.arquivos?.length ?? 0,
  })
}

// Guarda a assinatura inicial de notas recém-criadas (inclusive modelos) só
// enquanto a sessão vive — some no reload, e nesse caso vale a regra "vazia".
const seedInicial = new Map<string, string>()

export function registrarSeedNota(pagina: Pagina) {
  seedInicial.set(pagina.id, assinaturaNota(pagina))
}

/** Nota sem nenhum conteúdo real: sem título, sem texto, sem traços, sem arquivos. */
export function notaVazia(pagina: Pagina): boolean {
  if ((pagina.titulo ?? '').trim()) return false
  if (pagina.tipo === 'desenho') return (pagina.tracos?.length ?? 0) === 0
  if (pagina.tipo === 'arquivos') return (pagina.arquivos?.length ?? 0) === 0
  return (pagina.blocos ?? []).every((b) => !(b.texto ?? '').trim())
}

/**
 * Ao sair do editor: apaga a nota se estiver vazia OU se for um modelo/nota
 * recém-criada que o usuário fechou sem alterar nada. Caso contrário, garante o
 * salvamento final. Retorna `true` se a nota foi descartada.
 */
export async function finalizarEdicaoNota(pagina: Pagina): Promise<boolean> {
  const seed = seedInicial.get(pagina.id)
  seedInicial.delete(pagina.id)
  const inalteradaDeModelo = seed !== undefined && assinaturaNota(pagina) === seed
  if (notaVazia(pagina) || inalteradaDeModelo) {
    await excluirPagina(pagina.id)
    return true
  }
  await salvarPagina(pagina)
  return false
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
    const canvas = document.createElement('canvas')
    canvas.width = CAPA_LARGURA
    canvas.height = CAPA_ALTURA
    const ctx = canvas.getContext('2d')!

    // PNG/WebP/GIF podem ter transparência: mostra a imagem inteira (contain)
    // sobre fundo transparente, para o cover exibir a cor do app por trás.
    if (/image\/(png|webp|gif)/i.test(arquivo.type)) {
      const escala = Math.min(CAPA_LARGURA / img.width, CAPA_ALTURA / img.height)
      const dw = img.width * escala
      const dh = img.height * escala
      ctx.drawImage(img, (CAPA_LARGURA - dw) / 2, (CAPA_ALTURA - dh) / 2, dw, dh)
      return canvas.toDataURL('image/png')
    }

    // Foto (JPEG): recorte central 4:5 e reencoda como JPEG (arquivo menor).
    const alvo = CAPA_LARGURA / CAPA_ALTURA
    const origem = img.width / img.height
    let sw = img.width
    let sh = img.height
    if (origem > alvo) sw = Math.round(img.height * alvo)
    else sh = Math.round(img.width / alvo)
    const sx = Math.round((img.width - sw) / 2)
    const sy = Math.round((img.height - sh) / 2)
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, CAPA_LARGURA, CAPA_ALTURA)
    return canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}
