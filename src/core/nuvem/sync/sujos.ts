/**
 * Rastreio de "o que mudou localmente" para a sync não varrer o banco inteiro
 * (~65 tabelas) a cada ciclo.
 *
 * Guarda as CHAVES sujas (`colecao:id`) marcadas pelos hooks de escrita do
 * Dexie e pelo ramo local-vence do pull. A coleta então:
 *  - modo PARCIAL: lê só as chaves sujas (o caso comum, inclusive edição ativa);
 *  - modo COMPLETO: varre tudo e reconcilia contra o espelho — usado na 1ª coleta
 *    após carregar (set em memória vazio) e periodicamente como rede de segurança
 *    (pega qualquer escrita que tenha escapado dos hooks, ex.: bulk/importação).
 *
 * A semântica do que é sincronizado é a MESMA nos dois modos: ambos comparam o
 * estado atual contra o espelho; o parcial só olha um subconjunto de chaves.
 */

const sujos = new Set<string>()
let ciclos = 0
let reconciliarNaProxima = true // 1ª coleta após carregar varre tudo

/** A cada quantos ciclos uma reconciliação completa acontece de qualquer forma. */
const RECONCILIAR_A_CADA = 25 // ~5 min a 12s/ciclo

/** Marca uma chave (colecao:id) como pendente de envio. */
export function marcarSujo(colecao: string, id: string): void {
  sujos.add(`${colecao}:${id}`)
}

/** Força uma varredura/reconciliação completa na próxima coleta. */
export function agendarReconciliacao(): void {
  reconciliarNaProxima = true
}

export type PlanoColeta = { completo: true } | { completo: false; chaves: string[] }

/**
 * Decide o modo da próxima coleta e CONSOME o estado (zera o set sujo e o
 * contador). Chamar uma vez por ciclo de sync.
 */
export function planoDeColeta(): PlanoColeta {
  ciclos++
  if (reconciliarNaProxima || ciclos >= RECONCILIAR_A_CADA) {
    reconciliarNaProxima = false
    ciclos = 0
    sujos.clear() // a varredura completa cobre tudo
    return { completo: true }
  }
  const chaves = [...sujos]
  sujos.clear() // consumidas; escritas durante o ciclo se re-marcam
  return { completo: false, chaves }
}
