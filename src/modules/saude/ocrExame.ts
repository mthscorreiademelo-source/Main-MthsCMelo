/**
 * Leitura heurística de um exame a partir do texto de OCR (Tesseract).
 *
 * Reaproveita o OCR do módulo Compras — roda no aparelho, sem servidor. É
 * best-effort e serve só para PRÉ-PREENCHER o formulário: o usuário sempre
 * revisa e corrige antes de salvar (laudos variam muito de formato).
 */
export { reconhecerTexto } from '../compras/ocr'

const UNIDADES = /(mg\/dL|g\/dL|mg\/L|ng\/mL|pg\/mL|µg\/dL|ug\/dL|U\/L|UI\/L|mUI\/L|mmol\/L|mEq\/L|ng\/dL|%|fL|pg)/i
const RE_REF_ROTULADO = /(?:ref(?:er[êe]ncia)?|vr|desej[áa]vel|valores?\s*de\s*refer[êe]ncia)[:.\s]*?(\d+(?:[.,]\d+)*)\s*[-aà–—]\s*(\d+(?:[.,]\d+)*)/i
const RE_REF_SIMPLES = /(\d+(?:[.,]\d+)*)\s*[-–—]\s*(\d+(?:[.,]\d+)*)/

/**
 * Converte um número de laudo para float detectando o estilo de separador —
 * NÃO dá para descartar todos os pontos, senão um decimal em ponto (comum em
 * impressoras de laboratório), ex.: "0.9", vira "09" → 9 (10× errado).
 * - Tem ponto E vírgula → o separador que aparece por ÚLTIMO é o decimal.
 * - Só vírgula → decimal em vírgula (pt-BR): "13,5" → 13.5.
 * - Só ponto (ou nenhum) → já é decimal válido; não mexe.
 */
function n(s?: string): number | undefined {
  if (!s) return undefined
  let limpo = s.trim()
  const temPonto = limpo.includes('.')
  const temVirgula = limpo.includes(',')
  if (temPonto && temVirgula) {
    if (limpo.lastIndexOf(',') > limpo.lastIndexOf('.')) {
      limpo = limpo.replace(/\./g, '').replace(',', '.') // 1.234,5 → 1234.5
    } else {
      limpo = limpo.replace(/,/g, '') // 1,234.5 → 1234.5
    }
  } else if (temVirgula) {
    limpo = limpo.replace(',', '.') // 13,5 → 13.5
  }
  const v = parseFloat(limpo)
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
    const mv = antes.match(/(\d+(?:[.,]\d+)*)\s*$/)
    if (mv) valorNum = n(mv[1])
  }
  if (valorNum == null) {
    const mv = t.match(/(\d+(?:[.,]\d+)*)/)
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
