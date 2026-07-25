import { describe, expect, it } from 'vitest'
import { COMPOSICOES, modoComposicao } from './composicao'
import type { CardId, ModoComposicao } from './composicao'
import type { Faixa } from './agora'

const semAlerta = { temAlertaAlta: false }

describe('modoComposicao — horário decide a tela', () => {
  it('cada faixa cai no seu modo', () => {
    const casos: [Faixa, ModoComposicao][] = [
      ['madrugada', 'madrugada'],
      ['manha', 'planejar'],
      ['meiodia', 'meiodia'],
      ['tarde', 'foco'],
      ['noite', 'noite'],
      ['fimdenoite', 'noite'],
    ]
    for (const [faixa, esperado] of casos) {
      expect(modoComposicao(faixa, semAlerta)).toBe(esperado)
    }
  })

  it('alerta alto vira Atenção em QUALQUER horário', () => {
    const faixas: Faixa[] = ['madrugada', 'manha', 'meiodia', 'tarde', 'noite', 'fimdenoite']
    for (const faixa of faixas) {
      expect(modoComposicao(faixa, { temAlertaAlta: true })).toBe('atencao')
    }
  })
})

describe('COMPOSICOES — telas realmente diferentes', () => {
  it('todo modo tem pelo menos um card', () => {
    for (const modo of Object.keys(COMPOSICOES) as ModoComposicao[]) {
      expect(COMPOSICOES[modo].length).toBeGreaterThan(0)
    }
  })

  it('manhã, tarde e noite têm conjuntos de cards distintos', () => {
    const ids = (m: ModoComposicao) => new Set<CardId>(COMPOSICOES[m].map((c) => c.id))
    const manha = ids('planejar')
    const tarde = ids('foco')
    const noite = ids('noite')

    // Cada tela tem cards exclusivos que a definem.
    expect(manha.has('sessao-foco')).toBe(true)
    expect(tarde.has('sessao-foco')).toBe(false)
    expect(tarde.has('foco-do-dia')).toBe(true)
    expect(noite.has('desacelerar')).toBe(true)
    expect(noite.has('foco-do-dia')).toBe(false)

    // A sobreposição entre manhã e noite é pequena (telas de verdade diferentes).
    const comuns = [...manha].filter((id) => noite.has(id))
    expect(comuns.length).toBeLessThanOrEqual(1)
  })

  it('o primeiro card de cada modo é o herói (tamanho hero) quando aplicável', () => {
    for (const modo of ['planejar', 'meiodia', 'foco', 'noite', 'madrugada'] as ModoComposicao[]) {
      expect(COMPOSICOES[modo][0].tamanho).toBe('hero')
    }
  })

  it('não há ids repetidos dentro de um mesmo modo', () => {
    for (const modo of Object.keys(COMPOSICOES) as ModoComposicao[]) {
      const ids = COMPOSICOES[modo].map((c) => c.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})
