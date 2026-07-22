import { beforeEach, describe, expect, it, vi } from 'vitest'

// Estado de módulo (singleton) — reimporta fresco a cada teste.
async function carregar() {
  vi.resetModules()
  return import('./sujos')
}

describe('sujos (sinal de varredura da sync)', () => {
  let sujos: Awaited<ReturnType<typeof carregar>>
  beforeEach(async () => {
    sujos = await carregar()
  })

  it('começa sujo: a 1ª coleta após carregar sempre varre', () => {
    expect(sujos.precisaVarrer()).toBe(true)
  })

  it('depois de varrer, fica limpo (pula o scan) até haver mudança', () => {
    expect(sujos.precisaVarrer()).toBe(true) // consome o estado inicial
    expect(sujos.precisaVarrer()).toBe(false)
    expect(sujos.precisaVarrer()).toBe(false)
  })

  it('marcarSujo() força varredura no próximo ciclo', () => {
    expect(sujos.precisaVarrer()).toBe(true)
    expect(sujos.precisaVarrer()).toBe(false)
    sujos.marcarSujo()
    expect(sujos.precisaVarrer()).toBe(true)
    expect(sujos.precisaVarrer()).toBe(false)
  })

  it('reconcilia sozinho periodicamente mesmo sem mudança', () => {
    expect(sujos.precisaVarrer()).toBe(true) // consome o inicial
    // A partir daqui, limpo. Em algum ponto (<= ~30 ciclos) força um reconcile.
    let reconciliou = false
    for (let i = 0; i < 30; i++) {
      if (sujos.precisaVarrer()) { reconciliou = true; break }
    }
    expect(reconciliou).toBe(true)
  })
})
