import { nanoid } from 'nanoid'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Captura, StatusCaptura } from './types'

/** Cria uma captura na Caixa de entrada (para processar depois). */
export async function criarCaptura(dados: Partial<Captura> & { origem: Captura['origem'] }): Promise<string> {
  const id = dados.id ?? nanoid()
  const agora = Date.now()
  await db.capturas.add({
    status: 'aguardando',
    ...dados,
    id,
    criadoEm: dados.criadoEm ?? agora,
    atualizadoEm: agora,
  })
  return id
}

export const atualizarCaptura = (id: string, m: Partial<Captura>) =>
  db.capturas.update(id, { ...m, atualizadoEm: Date.now() })

export const excluirCaptura = (id: string) => db.capturas.delete(id)

export const arquivarCaptura = (id: string) => atualizarCaptura(id, { status: 'arquivado' })

/** Capturas ainda por processar (fora as concluídas/arquivadas), mais novas primeiro. */
export function useCaixaEntrada(): Captura[] | undefined {
  return useLiveQuery(async () => {
    const todas = await db.capturas.orderBy('criadoEm').reverse().toArray()
    return todas.filter((c) => c.status !== 'concluido' && c.status !== 'arquivado')
  }, [])
}

/** Contagem de itens pendentes na Caixa de entrada (para badges). */
export function usePendentesCaixa(): number {
  const itens = useCaixaEntrada()
  return itens?.length ?? 0
}

const PENDENTES: StatusCaptura[] = ['rascunho', 'processando', 'aguardando', 'falhou']
export const ehPendente = (s: StatusCaptura) => PENDENTES.includes(s)
