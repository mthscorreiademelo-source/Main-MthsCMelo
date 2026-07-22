/**
 * Leitura heurística de um exame a partir do texto de OCR (Tesseract).
 *
 * Reaproveita o OCR do módulo Compras — roda no aparelho, sem servidor. É
 * best-effort e serve só para PRÉ-PREENCHER o formulário: o usuário sempre
 * revisa e corrige antes de salvar (laudos variam muito de formato).
 */
export { reconhecerTexto } from '../compras/ocr'

const UNIDADES = /(mg\/dL|g\/dL|mg\/L|ng\/mL|pg\/mL|µg\/dL|ug\/dL|U\/L|UI\/L|mUI\/L|mmol\/L|mEq\/L|ng\/dL|%|fL|pg)/i
const RE_REF_ROTULADO = /(?:ref(?:er[êe]ncia)?|vr|desej[áa]vel|valores?\s*de\s*refer[êe]ncia)[:.\s]*?(\d+(?:[.,]\d+)?)\s*[-aà–—]\s*(\d+(?:[.,]\d+)?)/i
const RE_REF_SIMPLES = /(\d+(?:[.,]\d+)?)\s*[-–—]\s*(\d+(?:[.,]\d+)?)/

function n(s?: string): number | undefined {
  if (!s) return undefined
  const v = parseFloat(s.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(v) ? v : undefined
}

export interface ExameLido {
  nome?: string
  valorNum?: number
  unidade?: string
  refMin?: number
  refMax?: number
}

export function parseExame(texto: string): ExameLido {
  const t = texto.replace(/\r/g, '')
  const mu = t.match(UNIDADES)
  const unidade = mu ? mu[0] : undefined

  let refMin: number | undefined
  let refMax: number | undefined
  const mr = t.match(RE_REF_ROTULADO) ?? t.match(RE_REF_SIMPLES)
  if (mr) {
    refMin = n(mr[1])
    refMax = n(mr[2])
  }

  // Valor: número imediatamente antes da unidade; senão, o primeiro do texto.
  let valorNum: number | undefined
  if (mu && mu.index != null) {
    const antes = t.slice(Math.max(0, mu.index - 16), mu.index)
    const mv = antes.match(/(\d+(?:[.,]\d+)?)\s*$/)
    if (mv) valorNum = n(mv[1])
  }
  if (valorNum == null) {
    const mv = t.match(/(\d+(?:[.,]\d+)?)/)
    if (mv) valorNum = n(mv[1])
  }

  // Nome: primeira linha "textual" que não seja a de referência.
  let nome: string | undefined
  for (const linha of t.split('\n').map((l) => l.trim()).filter(Boolean)) {
    if (/[a-zA-ZÀ-ú]{3,}/.test(linha) && !/refer|valores/i.test(linha)) {
      nome = linha.replace(/[:.].*$/, '').slice(0, 40).trim()
      break
    }
  }

  return { nome, valorNum, unidade, refMin, refMax }
}
