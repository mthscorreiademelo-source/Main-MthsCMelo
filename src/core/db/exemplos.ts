import { db } from './db'
import { excluirPet } from '../../modules/pets/db'

/**
 * Remove APENAS os registros de exemplo semeados na 1ª visita (Oli, alguns itens
 * da despensa, a aquisição "Notebook novo" e o item "Ovos"). Não toca em nada
 * que você tenha criado ou editado — se você renomeou um item de exemplo, ele
 * passa a ser "seu" e não é apagado por aqui.
 */
const DESPENSA_EXEMPLO = ['Café', 'Papel higiênico', 'Arroz', 'Shampoo Elseve']
const AQUISICAO_EXEMPLO = ['Notebook novo']
const ITEM_LISTA_EXEMPLO = ['Ovos']

export async function limparDadosExemplo(): Promise<number> {
  let n = 0

  // Pet de exemplo (remove também seu estoque, gastos e eventos vinculados).
  const oli = (await db.pets.toArray()).find((p) => p.nome === 'Oli')
  if (oli) {
    await excluirPet(oli.id)
    n++
  }

  // Itens da despensa de exemplo (os não vinculados a pet).
  for (const d of await db.despensa.toArray()) {
    if (!d.petId && DESPENSA_EXEMPLO.includes(d.nome)) {
      const h = await db.despensaHistorico.where('despensaId').equals(d.id).primaryKeys()
      await db.despensaHistorico.bulkDelete(h as string[])
      await db.despensa.delete(d.id)
      n++
    }
  }

  // Item de lista de exemplo.
  for (const i of await db.comprasItens.toArray()) {
    if (ITEM_LISTA_EXEMPLO.includes(i.nome)) {
      await db.comprasItens.delete(i.id)
      n++
    }
  }

  // Aquisição de exemplo.
  for (const a of await db.aquisicoes.toArray()) {
    if (AQUISICAO_EXEMPLO.includes(a.nome)) {
      await db.aquisicoes.delete(a.id)
      n++
    }
  }

  return n
}
