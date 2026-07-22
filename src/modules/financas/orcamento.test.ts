import { describe, expect, it } from 'vitest'
import { evolucaoObjetivo, guardadoNoMes, serieMensal } from './orcamento'
import type { MovObjetivo, Movimento } from './types'

function mov(data: string, tipo: 'entrada' | 'saida', valorCentavos: number): Movimento {
  return { id: `${data}-${tipo}-${valorCentavos}`, data, tipo, valorCentavos, criadoEm: 0 } as unknown as Movimento
}

describe('serieMensal', () => {
  const movs = [
    mov('2026-07-05', 'entrada', 600000),
    mov('2026-07-10', 'saida', 20000),
    mov('2026-07-20', 'saida', 5000),
    mov('2026-06-15', 'saida', 8000),
  ]

  it('devolve os últimos N meses terminando no mês atual', () => {
    const s = serieMensal(movs, '2026-07', 3)
    expect(s.map((x) => x.mes)).toEqual(['2026-05', '2026-06', '2026-07'])
  })

  it('soma entradas e saídas por mês', () => {
    const s = serieMensal(movs, '2026-07', 3)
    expect(s[2]).toEqual({ mes: '2026-07', entradas: 600000, saidas: 25000 })
    expect(s[1]).toEqual({ mes: '2026-06', entradas: 0, saidas: 8000 })
    expect(s[0]).toEqual({ mes: '2026-05', entradas: 0, saidas: 0 })
  })

  it('cruza a virada de ano corretamente', () => {
    const s = serieMensal([mov('2025-12-31', 'entrada', 100)], '2026-01', 2)
    expect(s.map((x) => x.mes)).toEqual(['2025-12', '2026-01'])
    expect(s[0].entradas).toBe(100)
  })
})

describe('objetivos: evolução e aporte do mês', () => {
  const hist: MovObjetivo[] = [
    { data: '2026-05-10', delta: 10000, tipo: 'guardar' },
    { data: '2026-06-10', delta: 5000, tipo: 'guardar' },
    { data: '2026-06-20', delta: -3000, tipo: 'retirar' },
    { data: '2026-07-01', delta: 2000, tipo: 'rendimento' },
    { data: '2026-07-15', delta: 8000, tipo: 'guardar' },
  ]

  it('evolucaoObjetivo devolve a série cumulativa (começando em 0)', () => {
    expect(evolucaoObjetivo(hist)).toEqual([0, 10000, 15000, 12000, 14000, 22000])
  })

  it('evolucaoObjetivo não deixa o acumulado ficar negativo', () => {
    expect(evolucaoObjetivo([{ data: '2026-07-01', delta: -9999, tipo: 'retirar' }])).toEqual([0, 0])
  })

  it('evolucaoObjetivo vazio quando não há histórico', () => {
    expect(evolucaoObjetivo(undefined)).toEqual([])
    expect(evolucaoObjetivo([])).toEqual([])
  })

  it('guardadoNoMes soma só os aportes (guardar) do mês', () => {
    expect(guardadoNoMes(hist, '2026-07')).toBe(8000) // ignora o rendimento
    expect(guardadoNoMes(hist, '2026-06')).toBe(5000) // ignora a retirada
    expect(guardadoNoMes(hist, '2026-04')).toBe(0)
  })
})
