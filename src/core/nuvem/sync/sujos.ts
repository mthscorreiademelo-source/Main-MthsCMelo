/**
 * Sinal de "há mudanças locais para empurrar" — evita a sync varrer o banco
 * inteiro (~65 tabelas) a cada ciclo quando NADA mudou.
 *
 * De propósito é um sinal GROSSO (um booleano), não um set por-registro: quando
 * sujo, a coleta cai na varredura completa (a lógica de diff já provada); quando
 * limpo, pula o scan e devolve "nada a enviar". Não muda em nada a SEMÂNTICA do
 * que é sincronizado — só corta trabalho ocioso.
 *
 * Redes de segurança: começa sujo (a 1ª coleta após carregar sempre varre, o
 * que cobre escritas feitas antes do primeiro sync e o set em memória perdido
 * num reload) e, mesmo limpo, força uma reconciliação completa a cada N ciclos.
 */

let sujo = true
let ciclos = 0

/** A cada quantos ciclos uma varredura completa acontece mesmo sem mudança. */
const RECONCILIAR_A_CADA = 25 // ~5 min a 12s/ciclo

/** Marca que houve escrita local (chamado pelos hooks do Dexie). */
export function marcarSujo(): void {
  sujo = true
}

/**
 * Decide se a coleta de pendências precisa varrer o banco agora e CONSOME o
 * estado (zera o "sujo" e o contador quando decide varrer). Chamar uma vez por
 * ciclo de sync.
 */
export function precisaVarrer(): boolean {
  ciclos++
  if (sujo || ciclos >= RECONCILIAR_A_CADA) {
    sujo = false
    ciclos = 0
    return true
  }
  return false
}
