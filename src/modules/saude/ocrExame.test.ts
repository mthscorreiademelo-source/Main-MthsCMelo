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

  it('sem números não inventa valor', () => {
    const r = parseExame('resultado dentro da normalidade')
    expect(r.valorNum).toBeUndefined()
  })
})
