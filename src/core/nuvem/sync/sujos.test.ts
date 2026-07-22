import { beforeEach, describe, expect, it, vi } from 'vitest'

// Estado de módulo (singleton) — reimporta fresco a cada teste.
async function carregar() {
  vi.resetModules()
  return import('./sujos')
}

describe('sujos (plano de coleta da sync)', () => {
  let s: Awaited<ReturnType<typeof carregar>>
  beforeEach(async () => {
    s = await carregar()
  })

  it('a 1ª coleta após carregar é completa (varre tudo)', () => {
    expect(s.planoDeColeta()).toEqual({ completo: true })
  })

  it('sem mudança, coletas seguintes são parciais e vazias', () => {
    s.planoDeColeta() // consome a completa inicial
    expect(s.planoDeColeta()).toEqual({ completo: false, chaves: [] })
  })

  it('marcarSujo entra na próxima coleta parcial e é consumida', () => {
    s.planoDeColeta() // consome inicial
    s.marcarSujo('tasks', 'a')
    s.marcarSujo('tasks', 'b')
    const plano = s.planoDeColeta()
    expect(plano.completo).toBe(false)
    expect((plano as { chaves: string[] }).chaves.sort()).toEqual(['tasks:a', 'tasks:b'])
    // já consumidas: a coleta seguinte não as repete
    expect(s.planoDeColeta()).toEqual({ completo: false, chaves: [] })
  })

  it('agendarReconciliacao força uma coleta completa', () => {
    s.planoDeColeta() // consome inicial
    s.marcarSujo('tasks', 'a')
    s.agendarReconciliacao()
    // a completa ignora e limpa o set sujo
    expect(s.planoDeColeta()).toEqual({ completo: true })
    expect(s.planoDeColeta()).toEqual({ completo: false, chaves: [] })
  })

  it('reconcilia sozinho periodicamente mesmo sem mudança', () => {
    s.planoDeColeta() // consome inicial
    let completou = false
    for (let i = 0; i < 30; i++) {
      if (s.planoDeColeta().completo) { completou = true; break }
    }
    expect(completou).toBe(true)
  })
})
