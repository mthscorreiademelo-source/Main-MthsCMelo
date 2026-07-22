import { describe, expect, it } from 'vitest'
import {
  remotoVence,
  sincronizar,
  type Cursor,
  type LinhaDoc,
  type LocalStore,
  type Pendentes,
  type Transporte,
} from './engine'

describe('remotoVence (LWW)', () => {
  it('remoto mais novo vence', () => {
    expect(remotoVence(10, 5)).toBe(true)
  })
  it('remoto mais antigo perde', () => {
    expect(remotoVence(5, 10)).toBe(false)
  })
  it('empate vai para o remoto', () => {
    expect(remotoVence(7, 7)).toBe(true)
  })
  it('sem valor local, o remoto vence', () => {
    expect(remotoVence(0, undefined)).toBe(true)
  })
})

/** LocalStore em memória para exercitar o motor sem Dexie. */
function fakeLocal(pendentes: Pendentes) {
  const aplicados: LinhaDoc[] = []
  const confirmados: Pendentes[] = []
  const store: LocalStore = {
    async aplicarRemoto(linhas) {
      aplicados.push(...linhas)
      return linhas.length
    },
    async coletarPendentes() {
      return pendentes
    },
    async confirmarEnviados(p) {
      confirmados.push(p)
    },
  }
  return { store, aplicados, confirmados }
}

describe('sincronizar', () => {
  it('faz PULL, aplica e avança o cursor', async () => {
    const remoto: LinhaDoc[] = [{ colecao: 'tasks', id: 'a', doc: { id: 'a' }, atualizadoEm: 1, excluido: false }]
    const { store } = fakeLocal({ upserts: [], remocoes: [] })
    let cursorVal = '1970-01-01T00:00:00Z'
    const cursor: Cursor = { obter: () => cursorVal, definir: (v) => { cursorVal = v } }
    const transporte: Transporte = {
      async puxar() { return { linhas: remoto, ate: '2026-01-01T00:00:00Z' } },
      async empurrar() {},
    }
    const r = await sincronizar(store, transporte, cursor)
    expect(r.baixados).toBe(1)
    expect(cursorVal).toBe('2026-01-01T00:00:00Z')
  })

  it('faz PUSH dos pendentes e confirma', async () => {
    const pend: Pendentes = {
      upserts: [{ colecao: 'tasks', id: 'x', doc: { id: 'x' }, atualizadoEm: 2, excluido: false }],
      remocoes: [{ colecao: 'tasks', id: 'y', doc: { id: 'y' }, atualizadoEm: 3, excluido: true }],
    }
    const { store, confirmados } = fakeLocal(pend)
    const cursor: Cursor = { obter: () => '1970-01-01T00:00:00Z', definir: () => {} }
    const empurrados: LinhaDoc[] = []
    const transporte: Transporte = {
      async puxar() { return { linhas: [], ate: '1970-01-01T00:00:00Z' } },
      async empurrar(linhas) { empurrados.push(...linhas) },
    }
    const r = await sincronizar(store, transporte, cursor)
    expect(r.enviados).toBe(2)
    expect(empurrados).toHaveLength(2)
    expect(confirmados).toHaveLength(1)
  })

  it('não avança o cursor quando o servidor não trouxe nada novo', async () => {
    const { store } = fakeLocal({ upserts: [], remocoes: [] })
    let cursorVal = '2026-05-01T00:00:00Z'
    const cursor: Cursor = { obter: () => cursorVal, definir: (v) => { cursorVal = v } }
    const transporte: Transporte = {
      async puxar() { return { linhas: [], ate: '2026-05-01T00:00:00Z' } },
      async empurrar() {},
    }
    const r = await sincronizar(store, transporte, cursor)
    expect(r.baixados).toBe(0)
    expect(cursorVal).toBe('2026-05-01T00:00:00Z')
  })
})
