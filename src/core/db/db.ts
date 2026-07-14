import Dexie, { type Table } from 'dexie'
import type { Task } from '../../modules/tarefas/types'

/**
 * Banco local (IndexedDB) do app.
 * Regra: cada módulo novo ganha sua(s) tabela(s) numa nova versão do schema —
 * nunca edite uma versão já publicada, adicione `this.version(n + 1)`.
 */
class VidaDB extends Dexie {
  tasks!: Table<Task, string>

  constructor() {
    super('vida')
    this.version(1).stores({
      tasks: 'id, data, concluidaEm, criadaEm',
    })
  }
}

export const db = new VidaDB()

/** Exporta todo o banco como objeto serializável (backup JSON). */
export async function exportarBackup() {
  return {
    app: 'vida',
    versao: 1,
    exportadoEm: new Date().toISOString(),
    tasks: await db.tasks.toArray(),
  }
}

/** Restaura um backup gerado por exportarBackup (mescla por id). */
export async function importarBackup(json: unknown) {
  const dados = json as { app?: string; tasks?: Task[] }
  if (dados?.app !== 'vida' || !Array.isArray(dados.tasks)) {
    throw new Error('Arquivo de backup inválido')
  }
  await db.tasks.bulkPut(dados.tasks)
  return { tasks: dados.tasks.length }
}
