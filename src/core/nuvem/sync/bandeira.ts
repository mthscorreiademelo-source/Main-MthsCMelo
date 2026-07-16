/**
 * Sinaliza quando estamos APLICANDO dados vindos do servidor, para os hooks
 * do Dexie não re-carimbarem `atualizadoEm` (o que marcaria o registro como
 * mudança local e criaria um eco de envio).
 */
let aplicandoRemoto = false

export function deveIgnorarHooks(): boolean {
  return aplicandoRemoto
}

export async function comAplicacaoRemota<T>(fn: () => Promise<T>): Promise<T> {
  aplicandoRemoto = true
  try {
    return await fn()
  } finally {
    aplicandoRemoto = false
  }
}
