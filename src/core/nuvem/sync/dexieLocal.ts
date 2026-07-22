import { db } from '../../db/db'
import { comAplicacaoRemota } from './bandeira'
import { chaveReal, COLECOES, ehTabelaBlob, idDoc, TABELAS_BLOB } from './colecoes'
import { remotoVence, type Cursor, type LinhaDoc, type LocalStore, type Pendentes } from './engine'

type Registro = Record<string, unknown> & { atualizadoEm?: number }

/** Remove o Blob antes de enviar metadados de um anexo (o binário vai pelo Storage). */
function semBlob(colecao: string, r: Registro): Registro {
  if (!ehTabelaBlob(colecao)) return r
  const campo = TABELAS_BLOB[colecao]
  const { [campo]: _blob, ...resto } = r
  return resto as Registro
}

/** A object store realmente existe no schema aberto do Dexie? */
function tabelaExiste(nome: string): boolean {
  return db.tables.some((t) => t.name === nome)
}

/** LocalStore sobre o Dexie: aplica remoto por LWW e detecta mudanças/remoções
 *  locais comparando o estado atual com um "espelho" do último sync. */
export const localDexie: LocalStore = {
  async aplicarRemoto(linhas: LinhaDoc[]): Promise<number> {
    let aplicados = 0
    await comAplicacaoRemota(async () => {
      for (const l of linhas) {
        if (!tabelaExiste(l.colecao)) continue
        const tabela = (db as unknown as Record<string, any>)[l.colecao]
        if (!tabela) continue
        const chave = chaveReal(l.colecao, l.id)
        const chaveEsp = `${l.colecao}:${l.id}`
        const atual = (await tabela.get(chave)) as Registro | undefined
        if (remotoVence(l.atualizadoEm, atual?.atualizadoEm)) {
          if (l.excluido) {
            await tabela.delete(chave)
            await db.espelho.delete(chaveEsp)
          } else {
            // Anexo: preserva o binário local (o Storage repõe quando faltar).
            if (ehTabelaBlob(l.colecao)) {
              const campo = TABELAS_BLOB[l.colecao]
              const doc = l.doc as Record<string, unknown>
              const localBlob = (atual as Record<string, unknown> | undefined)?.[campo]
              if (localBlob && doc[campo] == null) doc[campo] = localBlob
            }
            await tabela.put(l.doc)
            await db.espelho.put({ chave: chaveEsp, atualizadoEm: l.atualizadoEm })
          }
          aplicados++
        } else {
          // local é mais novo → registra no espelho o valor do servidor,
          // para o diff perceber que precisamos reenviar a nossa versão.
          await db.espelho.put({ chave: chaveEsp, atualizadoEm: l.atualizadoEm })
        }
      }
    })
    return aplicados
  },

  async coletarPendentes(): Promise<Pendentes> {
    const atualPorChave = new Map<string, { colecao: string; id: string; doc: Registro; at: number }>()
    for (const { colecao } of COLECOES) {
      if (!tabelaExiste(colecao)) continue
      const tabela = (db as unknown as Record<string, any>)[colecao]
      const registros = (await tabela.toArray()) as Registro[]
      for (const r of registros) {
        const id = idDoc(colecao, r)
        // Anexos empurram só os metadados; o binário vai pelo Storage.
        const doc = semBlob(colecao, r)
        atualPorChave.set(`${colecao}:${id}`, { colecao, id, doc, at: r.atualizadoEm ?? 0 })
      }
    }
    const espelho = new Map((await db.espelho.toArray()).map((e) => [e.chave, e.atualizadoEm]))

    const upserts: LinhaDoc[] = []
    const remocoes: LinhaDoc[] = []
    for (const [chave, cur] of atualPorChave) {
      const esp = espelho.get(chave)
      if (esp === undefined || esp !== cur.at) {
        upserts.push({ colecao: cur.colecao, id: cur.id, doc: cur.doc, atualizadoEm: cur.at, excluido: false })
      }
    }
    // Carimbo fresco na exclusão: garante que o "tombstone" vença por LWW
    // qualquer cópia antiga ainda presente em outro aparelho (senão o item
    // ressuscita: o outro aparelho reenvia o registro toda sincronização).
    const agora = Date.now()
    for (const [chave, espAt] of espelho) {
      if (!atualPorChave.has(chave)) {
        const idx = chave.indexOf(':')
        const colecao = chave.slice(0, idx)
        const id = chave.slice(idx + 1)
        const at = Math.max(agora, espAt + 1)
        remocoes.push({ colecao, id, doc: { id, atualizadoEm: at }, atualizadoEm: at, excluido: true })
      }
    }
    return { upserts, remocoes }
  },

  async confirmarEnviados(p: Pendentes): Promise<void> {
    for (const u of p.upserts) {
      await db.espelho.put({ chave: `${u.colecao}:${u.id}`, atualizadoEm: u.atualizadoEm })
    }
    for (const r of p.remocoes) {
      await db.espelho.delete(`${r.colecao}:${r.id}`)
    }
  },
}

/** Cursor de PULL persistido em localStorage, por usuário. */
export function cursorLocalStorage(uid: string): Cursor {
  const chave = `lume:sync:pull:${uid}`
  return {
    obter: () => localStorage.getItem(chave) || '1970-01-01T00:00:00Z',
    definir: (v: string) => localStorage.setItem(chave, v),
  }
}
