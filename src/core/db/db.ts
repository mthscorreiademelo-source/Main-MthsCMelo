import Dexie, { type Table } from 'dexie'
import type { Task } from '../../modules/tarefas/types'
import type { Pagina } from '../../modules/notas/types'
import type { Habito, HabitoRegistro } from '../../modules/habitos/types'

/**
 * Banco local (IndexedDB) do app.
 * Regra: cada módulo novo ganha sua(s) tabela(s) numa nova versão do schema —
 * nunca edite uma versão já publicada, adicione `this.version(n + 1)`.
 */
class VidaDB extends Dexie {
  tasks!: Table<Task, string>
  paginas!: Table<Pagina, string>
  habitos!: Table<Habito, string>
  habitoRegistros!: Table<HabitoRegistro, string>

  constructor() {
    super('vida')
    this.version(1).stores({
      tasks: 'id, data, concluidaEm, criadaEm',
    })
    this.version(2).stores({
      paginas: 'id, atualizadaEm, criadaEm',
    })
    this.version(3).stores({
      habitos: 'id, ordem, criadoEm',
      habitoRegistros: 'id, habitoId, data',
    })
  }
}

export const db = new VidaDB()

/** Exporta todo o banco como objeto serializável (backup JSON). */
export async function exportarBackup() {
  return {
    app: 'vida',
    versao: 3,
    exportadoEm: new Date().toISOString(),
    tasks: await db.tasks.toArray(),
    paginas: await db.paginas.toArray(),
    habitos: await db.habitos.toArray(),
    habitoRegistros: await db.habitoRegistros.toArray(),
  }
}

/** Restaura um backup gerado por exportarBackup (mescla por id). */
export async function importarBackup(json: unknown) {
  const dados = json as {
    app?: string
    tasks?: Task[]
    paginas?: Pagina[]
    habitos?: Habito[]
    habitoRegistros?: HabitoRegistro[]
  }
  const temTasks = Array.isArray(dados?.tasks)
  const temPaginas = Array.isArray(dados?.paginas)
  const temHabitos = Array.isArray(dados?.habitos)
  if (dados?.app !== 'vida' || (!temTasks && !temPaginas && !temHabitos)) {
    throw new Error('Arquivo de backup inválido')
  }
  if (temTasks) await db.tasks.bulkPut(dados.tasks!)
  if (temPaginas) await db.paginas.bulkPut(dados.paginas!)
  if (temHabitos) await db.habitos.bulkPut(dados.habitos!)
  if (Array.isArray(dados.habitoRegistros)) {
    await db.habitoRegistros.bulkPut(dados.habitoRegistros)
  }
  return {
    tasks: dados.tasks?.length ?? 0,
    paginas: dados.paginas?.length ?? 0,
    habitos: dados.habitos?.length ?? 0,
  }
}
