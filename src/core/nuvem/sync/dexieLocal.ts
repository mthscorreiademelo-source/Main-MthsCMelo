import { db } from '../../db/db'
import { comAplicacaoRemota } from './bandeira'
import { chaveReal, COLECOES, ehTabelaBlob, idDoc, TABELAS_BLOB } from './colecoes'
import { remotoVence, type Cursor, type LinhaDoc, type LocalStore, type Pendentes } from './engine'
import { marcarSujo, planoDeColeta } from './sujos'

/** Tombstone com carimbo fresco: vence por LWW qualquer cópia antiga em outro
 *  aparelho (senão o item ressuscita a cada sincronização). */
function tombstone(colecao: string, id: string, espAt: number): LinhaDoc {
  const at = Math.max(Date.now(), espAt + 1)
  return { colecao, id, doc: { id, atualizadoEm: at }, atualizadoEm: at, excluido: true }
}

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
          // Esse reenvio pendente não passa pelos hooks de escrita local, então
          // marcamos a chave suja aqui para a próxima coleta empurrá-la.
          marcarSujo(l.colecao, l.id)
        }
      }
    })
    return aplicados
  },

  async coletarPendentes(): Promise<Pendentes> {
    const plano = planoDeColeta()
    // PARCIAL: só as chaves marcadas sujas pelos hooks (o caso comum). Sem
    // sujeira → nada a enviar, sem ler tabela nenhuma.
    if (!plano.completo) {
      if (plano.chaves.length === 0) return { upserts: [], remocoes: [] }
      return coletarParcial(plano.chaves)
    }
    // COMPLETO: varre tudo e reconcilia contra o espelho (1ª coleta / periódico).
    return coletarCompleto()
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

/** Varredura completa: compara TODAS as tabelas contra o espelho (reconciliação). */
async function coletarCompleto(): Promise<Pendentes> {
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
  for (const [chave, espAt] of espelho) {
    if (!atualPorChave.has(chave)) {
      const idx = chave.indexOf(':')
      remocoes.push(tombstone(chave.slice(0, idx), chave.slice(idx + 1), espAt))
    }
  }
  return { upserts, remocoes }
}

/** Coleta parcial: avalia SÓ as chaves sujas contra o espelho (mesma regra do
 *  modo completo, num subconjunto). O caso comum, incl. edição ativa. */
async function coletarParcial(chaves: string[]): Promise<Pendentes> {
  const upserts: LinhaDoc[] = []
  const remocoes: LinhaDoc[] = []
  for (const chave of chaves) {
    const idx = chave.indexOf(':')
    const colecao = chave.slice(0, idx)
    const id = chave.slice(idx + 1)
    if (!tabelaExiste(colecao)) continue
    const tabela = (db as unknown as Record<string, any>)[colecao]
    const r = (await tabela.get(chaveReal(colecao, id))) as Registro | undefined
    const espAt = (await db.espelho.get(chave))?.atualizadoEm
    if (r) {
      const at = r.atualizadoEm ?? 0
      if (espAt === undefined || espAt !== at) {
        upserts.push({ colecao, id, doc: semBlob(colecao, r), atualizadoEm: at, excluido: false })
      }
    } else if (espAt !== undefined) {
      // Sumiu do local mas ainda no espelho → exclusão a propagar.
      remocoes.push(tombstone(colecao, id, espAt))
    }
  }
  return { upserts, remocoes }
}

/** Cursor de PULL persistido em localStorage, por usuário. */
export function cursorLocalStorage(uid: string): Cursor {
  const chave = `lume:sync:pull:${uid}`
  return {
    obter: () => localStorage.getItem(chave) || '1970-01-01T00:00:00Z',
    definir: (v: string) => localStorage.setItem(chave, v),
  }
}
