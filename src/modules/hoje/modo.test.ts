import { describe, expect, it } from 'vitest'
import { modoDoMomento } from './modo'
import type { EstadoHoje } from './modo'

const calmo: EstadoHoje = { temAlertaAlta: false, temTrabalho: false }
/** Data local numa hora específica (mês/dia irrelevantes para a faixa). */
const em = (hora: number) => new Date(2026, 6, 25, hora, 0, 0)

describe('modoDoMomento — base por faixa', () => {
  it('madrugada → Descanso, noturno, calmo', () => {
    const m = modoDoMomento(em(3), calmo)
    expect(m.rotulo).toBe('Madrugada · Descanso')
    expect(m.tom).toBe('calmo')
    expect(m.diurno).toBe(false)
  })

  it('manhã → Planejar, diurno', () => {
    const m = modoDoMomento(em(8), calmo)
    expect(m.rotulo).toBe('Manhã · Planejar')
    expect(m.tom).toBe('planejar')
    expect(m.diurno).toBe(true)
  })

  it('meio-dia e tarde → Foco, diurno', () => {
    expect(modoDoMomento(em(12), calmo).rotulo).toBe('Meio-dia · Foco')
    const t = modoDoMomento(em(15), calmo)
    expect(t.rotulo).toBe('Tarde · Foco')
    expect(t.tom).toBe('foco')
    expect(t.diurno).toBe(true)
  })

  it('noite e fim do dia → desacelerar/encerrar, noturno', () => {
    expect(modoDoMomento(em(20), calmo).rotulo).toBe('Noite · Desacelerar')
    const f = modoDoMomento(em(23), calmo)
    expect(f.rotulo).toBe('Fim do dia · Encerrar')
    expect(f.diurno).toBe(false)
  })
})

describe('modoDoMomento — estado do dia', () => {
  it('alerta alto vira "· Atenção" e tom atencao', () => {
    const m = modoDoMomento(em(15), { temAlertaAlta: true, temTrabalho: false })
    expect(m.rotulo).toBe('Tarde · Atenção')
    expect(m.tom).toBe('atencao')
  })

  it('trabalho em horário de trabalho adiciona "· Trabalho"', () => {
    expect(modoDoMomento(em(15), { temAlertaAlta: false, temTrabalho: true }).rotulo).toBe(
      'Tarde · Foco · Trabalho',
    )
  })

  it('trabalho fora do horário de trabalho NÃO adiciona "· Trabalho"', () => {
    expect(modoDoMomento(em(8), { temAlertaAlta: false, temTrabalho: true }).rotulo).toBe(
      'Manhã · Planejar',
    )
  })

  it('alerta vence trabalho (não mostra "· Trabalho" quando há atenção)', () => {
    expect(modoDoMomento(em(15), { temAlertaAlta: true, temTrabalho: true }).rotulo).toBe(
      'Tarde · Atenção',
    )
  })
})
