import { describe, expect, it } from 'vitest'
import { interpretar, extrairData, extrairValor } from './interpretar'

const REF = new Date('2026-07-22T09:00:00') // quarta-feira

describe('extrairData (acentos)', () => {
  it('entende "amanhã" mesmo com acento', () => {
    expect(extrairData('tenho consulta amanhã', REF).data).toBe('2026-07-23')
  })
  it('entende "hoje"', () => {
    expect(extrairData('pagar hoje', REF).data).toBe('2026-07-22')
  })
  it('sem data retorna vazio', () => {
    expect(extrairData('comprar café', REF).data).toBeUndefined()
  })
})

describe('extrairValor', () => {
  it('lê R$ com vírgula', () => {
    expect(extrairValor('gastei R$ 48,90 no mercado').centavos).toBe(4890)
  })
  it('lê "reais"', () => {
    expect(extrairValor('paguei 20 reais').centavos).toBe(2000)
  })
})

describe('interpretar', () => {
  it('valor → despesa em primeiro lugar', () => {
    const cands = interpretar('Gastei R$ 48 no mercado', REF)
    expect(cands[0].tipo).toBe('despesa')
    expect(cands[0].campos.valorCentavos).toBe(4800)
  })

  it('recebi → receita', () => {
    const cands = interpretar('Recebi R$ 2000 de salário', REF)
    expect(cands[0].tipo).toBe('receita')
  })

  it('"Amanhã tem X" (data sem verbo) sugere evento', () => {
    const cands = interpretar('Amanhã tem reunião', REF)
    expect(cands.some((c) => c.tipo === 'evento')).toBe(true)
  })

  it('verbo de ação sugere tarefa', () => {
    const cands = interpretar('Ligar para o cliente', REF)
    expect(cands.some((c) => c.tipo === 'tarefa')).toBe(true)
  })

  it('texto solto sempre tem "nota" como opção segura', () => {
    const cands = interpretar('uma ideia qualquer', REF)
    expect(cands.some((c) => c.tipo === 'nota')).toBe(true)
  })

  it('não repete o mesmo tipo', () => {
    const cands = interpretar('Comprar café amanhã às 9h com a Ana', REF)
    const tipos = cands.map((c) => c.tipo)
    expect(new Set(tipos).size).toBe(tipos.length)
  })
})
