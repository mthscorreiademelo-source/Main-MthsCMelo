// Descompactação de arquivos de quadrinho (.cbr).
//
// Um .cbr costuma ser um RAR, mas MUITA gente renomeia um ZIP pra .cbr.
// Por isso a gente olha os primeiros bytes (o "número mágico") pra saber o que
// é de verdade e escolher o caminho certo — ZIP reaproveita o JSZip que já
// existe (custo zero); RAR usa a lib `node-unrar-js` (unrar oficial em WASM),
// carregada só quando o usuário abre um CBR de verdade (import dinâmico).

/** Extensões de imagem aceitas como "página" de um quadrinho. */
export const IMG_EXT = /\.(jpe?g|png|webp|gif|avif)$/i

export type Compactacao = 'zip' | 'rar' | 'desconhecido'

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04] // "PK\x03\x04"
const RAR_MAGIC = [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07] // "Rar!\x1A\x07"

/** Descobre, pelos primeiros bytes, se o arquivo é ZIP, RAR ou algo desconhecido. */
export async function detectarCompactacao(blob: Blob): Promise<Compactacao> {
  const cabecalho = new Uint8Array(await blob.slice(0, 8).arrayBuffer())
  if (ZIP_MAGIC.every((b, i) => cabecalho[i] === b)) return 'zip'
  if (RAR_MAGIC.every((b, i) => cabecalho[i] === b)) return 'rar'
  return 'desconhecido'
}

// Carrega o binário WASM do unrar UMA vez (fica em cache pro resto da sessão).
// Empacotado no build (import ?url) — funciona offline depois de baixado, sem CDN.
let wasmBinaria: Promise<ArrayBuffer> | undefined
async function carregarWasm(): Promise<ArrayBuffer> {
  if (!wasmBinaria) {
    wasmBinaria = (async () => {
      const { default: url } = await import('node-unrar-js/esm/js/unrar.wasm?url')
      const resp = await fetch(url)
      if (!resp.ok) throw new Error('Não consegui carregar o descompactador de RAR.')
      return resp.arrayBuffer()
    })()
  }
  return wasmBinaria
}

/** Páginas (imagens) de um CBR-que-é-RAR, em ordem, com extração sob demanda. */
export interface PaginasRar {
  /** Nomes das imagens, já ordenados na ordem de leitura. */
  nomes: string[]
  /** Extrai uma imagem (pelo nome) como Blob. `undefined` se não achar. */
  extrair: (nome: string) => Promise<Blob | undefined>
}

/**
 * Abre um CBR em formato RAR e devolve a lista de páginas + um extrator sob
 * demanda (extrai cada imagem só quando pedida). Lança erro se o RAR estiver
 * corrompido, protegido por senha ou num formato não suportado.
 */
export async function abrirCbrRar(blob: Blob): Promise<PaginasRar> {
  const [{ createExtractorFromData }, wasmBinary] = await Promise.all([
    import('node-unrar-js'),
    carregarWasm(),
  ])
  const data = await blob.arrayBuffer()
  const extractor = await createExtractorFromData({ wasmBinary, data })

  const nomes = [...extractor.getFileList().fileHeaders]
    .filter((h) => !h.flags.directory && IMG_EXT.test(h.name))
    .map((h) => h.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  const extrair = async (nome: string): Promise<Blob | undefined> => {
    const resultado = extractor.extract({ files: [nome] })
    const arquivos = [...resultado.files]
    const conteudo = arquivos[0]?.extraction
    if (!conteudo) return undefined
    // Copia os bytes pra um ArrayBuffer próprio — desacopla da memória do WASM
    // (que pode ser reusada) e satisfaz o tipo estrito de BlobPart.
    const copia = conteudo.buffer.slice(
      conteudo.byteOffset,
      conteudo.byteOffset + conteudo.byteLength,
    ) as ArrayBuffer
    return new Blob([copia])
  }

  return { nomes, extrair }
}
