import { describe, expect, it } from 'vitest'
import { construirAlertas, temAlertaAlta } from './alertas'
import type { DespensaAlerta, EventoAlerta } from './alertas'

const fmt = (c: number) => `R$ ${(c / 100).toFixed(2).replace('.', ',')}`

const base = {
  agoraMin: 600, // 10:00
  eventos: [] as EventoAlerta[],
  atrasadas: 0,
  despensa: [] as DespensaAlerta[],
  disponivelHoje: null as number | null,
  formatarBRL: fmt,
}

describe('construirAlertas — evento iminente', () => {
  it('acende quando o evento começa em ≤ 15 min', () => {
    const a = construirAlertas({
      ...base,
      eventos: [{ id: 'e1', titulo: 'Reunião', inicioMin: 610 }],
    })
    expect(a).toHaveLength(1)
    expect(a[0].tipo).toBe('evento')
    expect(a[0].severidade).toBe('alta')
    expect(a[0].titulo).toBe('Reunião começa em 10 min')
  })

  it('não acende quando o evento está a mais de 15 min', () => {
    const a = construirAlertas({
      ...base,
      eventos: [{ id: 'e1', titulo: 'Reunião', inicioMin: 700 }],
    })
    expect(a).toHaveLength(0)
  })
})

describe('construirAlertas — tarefas e orçamento', () => {
  it('tarefas atrasadas geram alerta alto com plural correto', () => {
    const a = construirAlertas({ ...base, atrasadas: 2 })
    expect(a[0].titulo).toBe('2 tarefas atrasadas')
    expect(a[0].severidade).toBe('alta')
  })

  it('orçamento estourado só quando disponivelHoje < 0', () => {
    expect(construirAlertas({ ...base, disponivelHoje: -1500 })[0].tipo).toBe('orcamento')
    expect(construirAlertas({ ...base, disponivelHoje: 500 })).toHaveLength(0)
    expect(construirAlertas({ ...base, disponivelHoje: null })).toHaveLength(0)
  })
})

describe('construirAlertas — despensa', () => {
  it('classifica severidade pelo motivo', () => {
    const a = construirAlertas({
      ...base,
      despensa: [
        { id: 'd1', nome: 'Ração', icone: '🐾', motivo: 'vencido' },
        { id: 'd2', nome: 'Arroz', icone: '🍚', motivo: '~2 dias' },
        { id: 'd3', nome: 'Café', icone: '☕', motivo: 'quase acabando' },
      ],
    })
    const porId = Object.fromEntries(a.map((x) => [x.id, x]))
    expect(porId['despensa-d1'].severidade).toBe('alta')
    expect(porId['despensa-d1'].titulo).toBe('Ração vencido')
    expect(porId['despensa-d2'].severidade).toBe('media')
    expect(porId['despensa-d2'].titulo).toBe('Arroz acabando (~2 dias)')
    expect(porId['despensa-d3'].severidade).toBe('media')
  })
})

describe('construirAlertas — ordenação e helper', () => {
  it('ordena do mais crítico ao menos e detecta alerta alto', () => {
    const a = construirAlertas({
      ...base,
      eventos: [{ id: 'e1', titulo: 'Consulta', inicioMin: 605 }],
      atrasadas: 1,
      despensa: [{ id: 'd1', nome: 'Sabão', icone: '🧼', motivo: 'quase acabando' }],
    })
    expect(a.map((x) => x.tipo)).toEqual(['evento', 'tarefa', 'despensa'])
    expect(temAlertaAlta(a)).toBe(true)
  })

  it('sem alertas altos → temAlertaAlta false', () => {
    const a = construirAlertas({
      ...base,
      despensa: [{ id: 'd1', nome: 'Sal', icone: '🧂', motivo: 'quase acabando' }],
    })
    expect(temAlertaAlta(a)).toBe(false)
  })
})
