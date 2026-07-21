/**
 * OCR no navegador via Tesseract.js (WASM). Carregado sob demanda (import
 * dinâmico) para não pesar no bundle principal. É best-effort: o usuário
 * sempre revisa antes de salvar. Os dados do idioma são baixados na 1ª vez
 * (precisa de rede); tudo o mais roda localmente.
 */

export async function reconhecerTexto(fonte: Blob | string, onProgress?: (p: number) => void): Promise<string> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('por', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(m.progress)
    },
  })
  try {
    const { data } = await worker.recognize(fonte)
    return data.text
  } finally {
    await worker.terminate()
  }
}

export interface ItemNota {
  nome: string
  precoCentavos?: number
}
export interface NotaLida {
  estabelecimento?: string
  itens: ItemNota[]
  totalCentavos?: number
}

const RE_PRECO = /(\d{1,3}(?:\.\d{3})*,\d{2}|\d+[.,]\d{2})\s*$/

function precoParaCentavos(txt: string): number | undefined {
  const limpo = txt.replace(/\./g, '').replace(',', '.')
  const n = Number(limpo)
  return Number.isFinite(n) ? Math.round(n * 100) : undefined
}

/** Extrai itens de uma nota/recibo a partir do texto reconhecido (heurístico). */
export function parseNota(texto: string): NotaLida {
  const linhas = texto
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 2)

  const itens: ItemNota[] = []
  let totalCentavos: number | undefined
  let estabelecimento: string | undefined

  for (const linha of linhas) {
    // linha de total
    if (/total|valor a pagar|valor pago/i.test(linha)) {
      const m = linha.match(RE_PRECO)
      if (m) totalCentavos = precoParaCentavos(m[1])
      continue
    }
    // primeira linha "textual" vira o estabelecimento
    if (!estabelecimento && /[a-zA-ZÀ-ú]{3,}/.test(linha) && !RE_PRECO.test(linha)) {
      estabelecimento = linha.slice(0, 40)
      continue
    }
    // linha de item: termina com preço e tem descrição antes
    const m = linha.match(RE_PRECO)
    if (m) {
      const nome = linha.slice(0, m.index).replace(/\s*(x?\d+\s*(un|kg|g|ml|l|pc)?\.?)?\s*$/i, '').trim()
      if (nome.length >= 2 && /[a-zA-ZÀ-ú]/.test(nome)) {
        itens.push({ nome: nome.replace(/\s{2,}/g, ' '), precoCentavos: precoParaCentavos(m[1]) })
      }
    }
  }
  return { estabelecimento, itens, totalCentavos }
}
