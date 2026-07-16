/**
 * Motor de sincronização — puro e sem dependências (só tipos), para ser
 * testável de forma isolada. Estratégia:
 *
 * - PULL: baixa do servidor tudo que mudou desde o último cursor e aplica
 *   localmente por LWW ("última edição vence", pelo campo atualizadoEm).
 * - PUSH: descobre o que mudou/foi apagado localmente comparando o estado
 *   atual com um "espelho" do último estado sincronizado, e envia.
 *
 * Não usa relógio local para decidir a janela de envio (evita problemas de
 * relógios diferentes entre aparelhos): o cursor de PULL é o updated_at do
 * servidor; o PUSH é por diferença contra o espelho.
 */

/** Uma linha de documento trafegada entre local e servidor. */
export interface LinhaDoc {
  colecao: string
  id: string
  doc: unknown
  atualizadoEm: number
  excluido: boolean
}

export interface Pendentes {
  upserts: LinhaDoc[]
  remocoes: LinhaDoc[]
}

export interface LocalStore {
  /** Aplica linhas vindas do servidor (LWW). Retorna quantas aplicou. */
  aplicarRemoto(linhas: LinhaDoc[]): Promise<number>
  /** O que mudou/foi apagado localmente desde o último envio. */
  coletarPendentes(): Promise<Pendentes>
  /** Confirma que os pendentes foram enviados (atualiza o espelho). */
  confirmarEnviados(p: Pendentes): Promise<void>
}

export interface Transporte {
  /** Baixa linhas com updated_at > desde; devolve as linhas e o novo cursor. */
  puxar(desde: string): Promise<{ linhas: LinhaDoc[]; ate: string }>
  empurrar(linhas: LinhaDoc[]): Promise<void>
}

export interface Cursor {
  obter(): string
  definir(v: string): void
}

export interface ResultadoSync {
  baixados: number
  enviados: number
}

/** LWW: o remoto vence (ou empata) quando é igual ou mais novo que o local. */
export function remotoVence(remotoAt: number, localAt: number | undefined): boolean {
  return (localAt ?? -1) <= remotoAt
}

export async function sincronizar(
  local: LocalStore,
  transporte: Transporte,
  cursor: Cursor,
): Promise<ResultadoSync> {
  // 1) PULL
  const desde = cursor.obter()
  const { linhas, ate } = await transporte.puxar(desde)
  let baixados = 0
  if (linhas.length) baixados = await local.aplicarRemoto(linhas)
  if (ate && ate > desde) cursor.definir(ate)

  // 2) PUSH
  const pend = await local.coletarPendentes()
  const enviados = pend.upserts.length + pend.remocoes.length
  if (enviados) {
    await transporte.empurrar([...pend.upserts, ...pend.remocoes])
    await local.confirmarEnviados(pend)
  }

  return { baixados, enviados }
}
