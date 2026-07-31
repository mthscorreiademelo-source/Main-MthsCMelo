// Testa a baixa/devolução de estoque de um remédio da Saúde quando um hábito
// vinculado é marcado/desmarcado como "feito". Roda sobre o Dexie real, em
// IndexedDB falso (Node) — mesmo padrão de modules/tarefas/db.test.ts.
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../core/db/db'
import { cicloSimNao, definirEstadoSimNao } from './db'
import type { Habito } from './types'
import type { Medicamento } from '../saude/types'

const HOJE = '2026-07-31'

function habito(over: Partial<Habito> = {}): Habito {
  return {
    id: 'h1',
    nome: 'Tomar remédio',
    tipo: 'sim_nao',
    frequencia: { tipo: 'diario' },
    ordem: 0,
    criadoEm: 0,
    ...over,
  }
}

function medicamento(over: Partial<Medicamento> = {}): Medicamento {
  return {
    id: 'm1',
    nome: 'Vitamina D',
    dosagem: '2000 UI',
    estoque: 10,
    ativo: true,
    criadoEm: 0,
    ...over,
  }
}

async function estoque(id = 'm1'): Promise<number | undefined> {
  return (await db.medicamentos.get(id))?.estoque
}

beforeEach(async () => {
  await db.habitos.clear()
  await db.habitoRegistros.clear()
  await db.medicamentos.clear()
})
afterEach(async () => {
  await db.habitos.clear()
  await db.habitoRegistros.clear()
  await db.medicamentos.clear()
})

describe('cicloSimNao com vínculo de remédio', () => {
  it('baixa 1 do estoque ao passar para feito e devolve ao desmarcar', async () => {
    await db.habitos.add(habito({ vinculoMedicamentoId: 'm1' }))
    await db.medicamentos.add(medicamento({ estoque: 10 }))

    // pendente → feito: baixa 1
    await cicloSimNao('h1', HOJE)
    expect(await estoque()).toBe(9)

    // feito → falhou (deixa de ser feito): devolve 1
    await cicloSimNao('h1', HOJE)
    expect(await estoque()).toBe(10)

    // falhou → pendente (não era feito): não mexe
    await cicloSimNao('h1', HOJE)
    expect(await estoque()).toBe(10)
  })

  it('não conta duas vezes: um único feito baixa só 1', async () => {
    await db.habitos.add(habito({ vinculoMedicamentoId: 'm1' }))
    await db.medicamentos.add(medicamento({ estoque: 5 }))

    await cicloSimNao('h1', HOJE) // feito → -1
    await cicloSimNao('h1', HOJE) // falhou → +1
    await cicloSimNao('h1', HOJE) // pendente → nada
    await cicloSimNao('h1', HOJE) // feito de novo → -1
    expect(await estoque()).toBe(4)
  })

  it('não mexe no estoque quando o hábito não tem vínculo', async () => {
    await db.habitos.add(habito())
    await db.medicamentos.add(medicamento({ estoque: 7 }))

    await cicloSimNao('h1', HOJE)
    await cicloSimNao('h1', HOJE)
    expect(await estoque()).toBe(7)
  })
})

describe('definirEstadoSimNao com vínculo de remédio', () => {
  it('feito baixa 1; repetir feito não baixa de novo', async () => {
    await db.habitos.add(habito({ vinculoMedicamentoId: 'm1' }))
    await db.medicamentos.add(medicamento({ estoque: 3 }))

    await definirEstadoSimNao('h1', HOJE, 'feito')
    expect(await estoque()).toBe(2)

    // já estava feito → sem transição, não baixa de novo
    await definirEstadoSimNao('h1', HOJE, 'feito')
    expect(await estoque()).toBe(2)
  })

  it('sair de feito para pendente devolve 1', async () => {
    await db.habitos.add(habito({ vinculoMedicamentoId: 'm1' }))
    await db.medicamentos.add(medicamento({ estoque: 8 }))

    await definirEstadoSimNao('h1', HOJE, 'feito')
    expect(await estoque()).toBe(7)

    await definirEstadoSimNao('h1', HOJE, 'pendente')
    expect(await estoque()).toBe(8)
  })

  it('marcar "falhou" a partir de pendente não mexe no estoque', async () => {
    await db.habitos.add(habito({ vinculoMedicamentoId: 'm1' }))
    await db.medicamentos.add(medicamento({ estoque: 4 }))

    await definirEstadoSimNao('h1', HOJE, 'falhou')
    expect(await estoque()).toBe(4)
  })

  it('não baixa abaixo de zero (piso no estoque)', async () => {
    await db.habitos.add(habito({ vinculoMedicamentoId: 'm1' }))
    await db.medicamentos.add(medicamento({ estoque: 0 }))

    await definirEstadoSimNao('h1', HOJE, 'feito')
    expect(await estoque()).toBe(0)
  })

  it('remédio sem estoque definido é no-op (não cria número do nada)', async () => {
    await db.habitos.add(habito({ vinculoMedicamentoId: 'm1' }))
    await db.medicamentos.add(medicamento({ estoque: undefined }))

    await definirEstadoSimNao('h1', HOJE, 'feito')
    expect(await estoque()).toBeUndefined()
  })
})
