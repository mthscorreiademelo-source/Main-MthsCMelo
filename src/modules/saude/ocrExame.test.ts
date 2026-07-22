import { describe, expect, it } from 'vitest'
import { parseExame } from './ocrExame'

describe('parseExame (heurístico)', () => {
  it('lê valor, unidade e faixa de referência rotulada', () => {
    const r = parseExame('Colesterol total\n190 mg/dL\nValores de referência: 100 - 200')
    expect(r.nome).toBe('Colesterol total')
    expect(r.valorNum).toBe(190)
    expect(r.unidade).toBe('mg/dL')
    expect(r.refMin).toBe(100)
    expect(r.refMax).toBe(200)
  })

  it('lê valor com vírgula decimal', () => {
    const r = parseExame('Vitamina D 32,5 ng/mL')
    expect(r.valorNum).toBe(32.5)
    expect(r.unidade).toBe('ng/mL')
  })

  it('lê decimal em ponto sem virar 10× (bug do separador)', () => {
    // "0.9" precisa continuar 0.9, não "09" → 9.
    const r = parseExame('TSH 0.9 mUI/L')
    expect(r.valorNum).toBeCloseTo(0.9, 6)
    expect(r.unidade).toBe('mUI/L')
  })

  it('trata milhar pt-BR (ponto) + decimal (vírgula)', () => {
    const r = parseExame('Plaquetas 1.234,5')
    expect(r.valorNum).toBeCloseTo(1234.5, 6)
  })

  it('trata milhar en (vírgula) + decimal (ponto)', () => {
    const r = parseExame('Plaquetas 250,000.0 /µL')
    expect(r.valorNum).toBeCloseTo(250000, 6)
  })

  it('sem números não inventa valor', () => {
    const r = parseExame('resultado dentro da normalidade')
    expect(r.valorNum).toBeUndefined()
  })
})
