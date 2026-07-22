import { describe, expect, it } from 'vitest'
import { diaEfetivoRecorrente, evolucaoObjetivo, guardadoNoMes, limiteEfetivoLinha, quintoDiaUtil, serieMensal } from './orcamento'
import type { MovObjetivo, Movimento, OrcamentoLinha, Recorrente } from './types'

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

describe('recorrentes: 5º dia útil e dia efetivo', () => {
  it('julho/2026 (1º = quarta): 5º dia útil é dia 7', () => {
    // 1=qua,2=qui,3=sex(3 úteis),4=sáb,5=dom,6=seg(4),7=ter(5)
    expect(quintoDiaUtil(2026, 7)).toBe(7)
  })

  it('novembro/2026 (1º = domingo): 5º dia útil é dia 6', () => {
    // 1=dom,2=seg(1),3=ter(2),4=qua(3),5=qui(4),6=sex(5)
    expect(quintoDiaUtil(2026, 11)).toBe(6)
  })

  const rec = (extra: Partial<Recorrente>): Recorrente =>
    ({ id: 'r', nome: 'x', tipo: 'saida', valorCentavos: 100, diaMes: 10, ordem: 0, criadoEm: 0, ...extra }) as Recorrente

  it('diaEfetivo usa o dia fixo por padrão (limitado ao mês)', () => {
    expect(diaEfetivoRecorrente(rec({ diaMes: 10 }), 2026, 7)).toBe(10)
    expect(diaEfetivoRecorrente(rec({ diaMes: 31 }), 2026, 2)).toBe(28) // fev/2026 tem 28
  })

  it('diaEfetivo usa o 5º dia útil quando marcado', () => {
    expect(diaEfetivoRecorrente(rec({ quintoUtil: true }), 2026, 7)).toBe(7)
  })
})

describe('orçamento: limite efetivo por mês', () => {
  const linha = (extra: Partial<OrcamentoLinha>): OrcamentoLinha =>
    ({ id: 'l', nome: 'Lazer', cor: '#000', limiteCentavos: 20000, categorias: ['Lazer'], ordem: 0, criadoEm: 0, ...extra }) as OrcamentoLinha

  it('usa o padrão quando não há exceção', () => {
    expect(limiteEfetivoLinha(linha({}), '2026-07')).toBe(20000)
  })

  it('a exceção do mês sobrepõe o padrão', () => {
    const l = linha({ limitesEspecificos: { '2026-12': 50000 } })
    expect(limiteEfetivoLinha(l, '2026-12')).toBe(50000) // dezembro maior
    expect(limiteEfetivoLinha(l, '2026-07')).toBe(20000) // outros meses seguem o padrão
  })

  it('exceção de 0 (não gastar) é respeitada', () => {
    expect(limiteEfetivoLinha(linha({ limitesEspecificos: { '2026-07': 0 } }), '2026-07')).toBe(0)
  })
})
