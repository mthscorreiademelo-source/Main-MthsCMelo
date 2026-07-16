import { importarSaude, type ResultadoImport } from './importar'

const CHAVE_URL = 'lume:saude:planilha'
const CHAVE_ULTIMA = 'lume:saude:planilha:ultima'

export function getUrlPlanilha(): string {
  return localStorage.getItem(CHAVE_URL) || ''
}

export function setUrlPlanilha(url: string) {
  const u = url.trim()
  if (u) localStorage.setItem(CHAVE_URL, u)
  else {
    localStorage.removeItem(CHAVE_URL)
    localStorage.removeItem(CHAVE_ULTIMA)
  }
}

export function ultimaSincronizacao(): number | null {
  const v = localStorage.getItem(CHAVE_ULTIMA)
  return v ? Number(v) : null
}

/**
 * Converte um link de planilha do Google no endereço que devolve CSV.
 * Aceita: link de edição, link "publicar na web" (pub?output=csv) e o
 * endpoint de exportação — devolvendo sempre uma URL que serve CSV.
 */
export function urlCsv(url: string): string {
  const u = url.trim()
  if (/output=csv|format=csv|tqx=out:csv/.test(u)) return u
  const id = u.match(/\/spreadsheets\/d\/(?:e\/)?([a-zA-Z0-9-_]+)/)?.[1]
  const gid = u.match(/[#&?]gid=(\d+)/)?.[1] ?? '0'
  if (id) return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`
  return u
}

/** Lê a planilha conectada e importa os dias. Lança erro amigável em falha. */
export async function sincronizarPlanilha(): Promise<ResultadoImport> {
  const url = getUrlPlanilha()
  if (!url) throw new Error('Nenhuma planilha conectada.')
  let resp: Response
  try {
    resp = await fetch(urlCsv(url), { redirect: 'follow' })
  } catch {
    throw new Error(
      'Não consegui ler a planilha pelo navegador (provável bloqueio do Google). Publique a planilha como CSV em Arquivo → Compartilhar → Publicar na web.',
    )
  }
  if (!resp.ok) throw new Error(`A planilha respondeu HTTP ${resp.status}. Confira se está pública.`)
  const texto = await resp.text()
  if (/<html/i.test(texto.slice(0, 200))) {
    throw new Error('O link não devolveu uma planilha (veio uma página). Use "Publicar na web → CSV".')
  }
  const res = await importarSaude(texto)
  localStorage.setItem(CHAVE_ULTIMA, String(Date.now()))
  return res
}
