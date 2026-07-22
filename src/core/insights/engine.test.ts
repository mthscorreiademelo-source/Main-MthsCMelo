import { describe, expect, it } from 'vitest'
import {
  correlacaoSeries,
  impactoDeFator,
  mediaPorDiaSemana,
  pearson,
  tendencia,
} from './engine'
import type { SerieDiaria } from './tipos'

describe('pearson', () => {
  it('devolve null com menos de 3 pontos', () => {
    expect(pearson([1, 2], [3, 4])).toBeNull()
  })

  it('correlação perfeita positiva = 1', () => {
    const r = pearson([1, 2, 3, 4], [2, 4, 6, 8])
    expect(r).toBeCloseTo(1, 6)
  })

  it('correlação perfeita negativa = -1', () => {
    const r = pearson([1, 2, 3, 4], [8, 6, 4, 2])
    expect(r).toBeCloseTo(-1, 6)
  })

  it('devolve null quando um vetor é constante (variância zero)', () => {
    expect(pearson([5, 5, 5, 5], [1, 2, 3, 4])).toBeNull()
  })

  it('alinha pelo menor tamanho', () => {
    // b tem um valor extra que deve ser ignorado
    const r = pearson([1, 2, 3], [2, 4, 6, 999])
    expect(r).toBeCloseTo(1, 6)
  })
})

describe('correlacaoSeries', () => {
  it('cruza apenas os dias em comum', () => {
    const x: SerieDiaria = new Map([
      ['2026-01-01', 1],
      ['2026-01-02', 2],
      ['2026-01-03', 3],
      ['2026-01-99', 100], // dia sem par em y — ignorado
    ])
    const y: SerieDiaria = new Map([
      ['2026-01-01', 2],
      ['2026-01-02', 4],
      ['2026-01-03', 6],
    ])
    const res = correlacaoSeries(x, y)
    expect(res).not.toBeNull()
    expect(res!.n).toBe(3)
    expect(res!.r).toBeCloseTo(1, 6)
  })

  it('devolve null quando não há dias em comum suficientes', () => {
    const x: SerieDiaria = new Map([['2026-01-01', 1]])
    const y: SerieDiaria = new Map([['2026-02-01', 1]])
    expect(correlacaoSeries(x, y)).toBeNull()
  })
})

describe('impactoDeFator', () => {
  it('compara média do alvo com e sem o fator', () => {
    const alvo: SerieDiaria = new Map([
      ['2026-01-01', 10],
      ['2026-01-02', 8],
      ['2026-01-03', 4],
      ['2026-01-04', 2],
    ])
    const presenca = new Set(['2026-01-01', '2026-01-02'])
    const imp = impactoDeFator(alvo, presenca)
    expect(imp).not.toBeNull()
    expect(imp!.com).toBe(9)
    expect(imp!.sem).toBe(3)
    expect(imp!.delta).toBe(6)
    expect(imp!.nCom).toBe(2)
    expect(imp!.nSem).toBe(2)
  })

  it('devolve null se o fator nunca esteve presente', () => {
    const alvo: SerieDiaria = new Map([['2026-01-01', 5]])
    expect(impactoDeFator(alvo, new Set())).toBeNull()
  })

  it('devolve null se o fator esteve sempre presente', () => {
    const alvo: SerieDiaria = new Map([['2026-01-01', 5]])
    expect(impactoDeFator(alvo, new Set(['2026-01-01']))).toBeNull()
  })
})

describe('mediaPorDiaSemana', () => {
  it('agrupa por dia da semana (0=domingo)', () => {
    // 2026-01-04 é domingo, 2026-01-05 é segunda
    const alvo: SerieDiaria = new Map([
      ['2026-01-04', 2],
      ['2026-01-11', 4], // domingo seguinte
      ['2026-01-05', 10], // segunda
    ])
    const m = mediaPorDiaSemana(alvo)
    expect(m).toHaveLength(7)
    expect(m[0].media).toBe(3) // domingo: (2+4)/2
    expect(m[0].n).toBe(2)
    expect(m[1].media).toBe(10) // segunda
    expect(m[1].n).toBe(1)
    expect(m[2].n).toBe(0) // terça sem dados
  })
})

describe('tendencia', () => {
  it('devolve 0 com menos de 3 pontos', () => {
    expect(tendencia([1, 2])).toBe(0)
  })

  it('inclinação positiva quando a série sobe', () => {
    expect(tendencia([1, 2, 3, 4, 5])).toBeCloseTo(1, 6)
  })

  it('inclinação negativa quando a série desce', () => {
    expect(tendencia([5, 4, 3, 2, 1])).toBeCloseTo(-1, 6)
  })

  it('~0 quando a série é estável', () => {
    expect(tendencia([3, 3, 3, 3])).toBeCloseTo(0, 6)
  })
})
