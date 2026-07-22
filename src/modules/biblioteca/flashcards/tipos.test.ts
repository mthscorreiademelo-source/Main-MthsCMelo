import { describe, expect, it } from 'vitest'
import { agendamentoInicial, devido, revisarSM2 } from './tipos'

describe('revisarSM2', () => {
  const base = { facilidade: 2.5, intervalo: 0, repeticoes: 0 }

  it('acerto: 1ª revisão agenda para 1 dia', () => {
    const r = revisarSM2(base, 5, '2026-07-22')
    expect(r.repeticoes).toBe(1)
    expect(r.intervalo).toBe(1)
    expect(r.proximaRevisao).toBe('2026-07-23')
  })

  it('acerto: 2ª revisão agenda para 6 dias', () => {
    const r = revisarSM2({ facilidade: 2.5, intervalo: 1, repeticoes: 1 }, 4, '2026-07-22')
    expect(r.intervalo).toBe(6)
    expect(r.proximaRevisao).toBe('2026-07-28')
  })

  it('acerto: 3ª+ revisão multiplica pelo fator de facilidade', () => {
    const r = revisarSM2({ facilidade: 2.5, intervalo: 6, repeticoes: 2 }, 5, '2026-07-22')
    expect(r.intervalo).toBe(15) // round(6 * 2.5)
  })

  it('erro: zera repetições e volta a 1 dia', () => {
    const r = revisarSM2({ facilidade: 2.5, intervalo: 15, repeticoes: 5 }, 1, '2026-07-22')
    expect(r.repeticoes).toBe(0)
    expect(r.intervalo).toBe(1)
    expect(r.proximaRevisao).toBe('2026-07-23')
  })

  it('facilidade nunca cai abaixo de 1.3', () => {
    let s = { facilidade: 1.3, intervalo: 1, repeticoes: 1 }
    for (let k = 0; k < 5; k++) s = revisarSM2(s, 0, '2026-07-22')
    expect(s.facilidade).toBeGreaterThanOrEqual(1.3)
  })
})

describe('devido / agendamentoInicial', () => {
  it('cartão novo é devido hoje', () => {
    const ini = agendamentoInicial('2026-07-22')
    expect(ini.proximaRevisao).toBe('2026-07-22')
    expect(devido({ ...ini, id: 'x', frente: 'a', verso: 'b', criadoEm: 0 }, '2026-07-22')).toBe(true)
  })
  it('cartão agendado para o futuro não é devido', () => {
    expect(devido({ id: 'x', frente: 'a', verso: 'b', facilidade: 2.5, intervalo: 6, repeticoes: 2, proximaRevisao: '2026-07-30', criadoEm: 0 }, '2026-07-22')).toBe(false)
  })
})
