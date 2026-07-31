// Marcação retroativa por clique no mapa de calor: o Heatmap chama
// `cicloSimNao(habito.id, dia)` com uma data qualquer (não o dia de hoje).
// Este teste confirma que gravar num dia passado cria/altera o registro
// correto DAQUELE dia — a base da nova interação de clique no heatmap.
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../core/db/db'
import { cicloSimNao } from './db'
import type { Habito } from './types'

const ONTEM = '2026-07-30'
const SEMANA_PASSADA = '2026-07-24'

function habito(over: Partial<Habito> = {}): Habito {
  return {
    id: 'h1',
    nome: 'Beber água',
    tipo: 'sim_nao',
    frequencia: { tipo: 'diario' },
    ordem: 0,
    criadoEm: 0,
    ...over,
  }
}

async function reg(data: string) {
  return db.habitoRegistros.get(`h1:${data}`)
}

beforeEach(async () => {
  await db.habitos.clear()
  await db.habitoRegistros.clear()
})
afterEach(async () => {
  await db.habitos.clear()
  await db.habitoRegistros.clear()
})

describe('marcação retroativa (clique no heatmap)', () => {
  it('cicla um dia passado: pendente → feito → não fez → pendente', async () => {
    await db.habitos.add(habito())

    // pendente → feito
    await cicloSimNao('h1', ONTEM)
    expect((await reg(ONTEM))?.estado).toBe('feito')

    // feito → não fez (falhou)
    await cicloSimNao('h1', ONTEM)
    expect((await reg(ONTEM))?.estado).toBe('falhou')

    // falhou → pendente (registro some)
    await cicloSimNao('h1', ONTEM)
    expect(await reg(ONTEM)).toBeUndefined()
  })

  it('grava no dia clicado, sem afetar os outros dias', async () => {
    await db.habitos.add(habito())

    await cicloSimNao('h1', SEMANA_PASSADA)
    expect((await reg(SEMANA_PASSADA))?.estado).toBe('feito')
    // nenhum outro registro foi criado
    expect(await reg(ONTEM)).toBeUndefined()
    expect(await db.habitoRegistros.count()).toBe(1)
  })
})
