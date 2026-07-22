import { db } from './db'
import { NOMES_SYNC } from '../nuvem/sync/colecoes'
import { obterCliente } from '../nuvem/cliente'

/**
 * Semeadura de CONTEÚDO de exemplo (finanças, saúde, compras, pets e os
 * contextos da agenda) fica DESLIGADA: o app começa em branco, esperando dados
 * reais. Os padrões FUNCIONAIS (rostos de humor, categorias e fatores, categorias
 * de hábito) continuam sendo semeados pelos próprios módulos — sem eles os
 * seletores não teriam o que oferecer.
 */
export const SEMEAR_EXEMPLOS = false

/**
 * Coleções preservadas no "Recomeçar do zero":
 * - dados do usuário: tarefas e notas/cadernos;
 * - padrões funcionais dos seletores (humor + categorias de hábito);
 * - identidade (perfil).
 * Todo o resto é apagado — local e nuvem.
 */
const MANTER = new Set<string>([
  'tasks', // tarefas
  'paginas', 'grupos', // notas e cadernos
  'humorTipos', 'categorias', 'fatores', // seletores de humor
  'categoriasHabito', // categorias de hábito
  'perfil', // identidade (nome/foto)
])

/** Coleções sincronizadas que o reset apaga (tudo que não está em MANTER). */
export function colecoesParaZerar(): string[] {
  return NOMES_SYNC.filter((c) => !MANTER.has(c))
}

/**
 * Recomeça do zero: apaga TODO o conteúdo (local + nuvem) MENOS tarefas, notas
 * e os padrões funcionais. Na nuvem marca os documentos como excluídos (o
 * "tombstone" propaga a exclusão para os outros aparelhos); no local limpa as
 * tabelas zeradas e o espelho dessas coleções. Não toca em tarefas/notas nem
 * nos seletores. Irreversível.
 */
export async function recomecarDoZero(): Promise<void> {
  const zerar = colecoesParaZerar()

  // 1) NUVEM: marca como excluído no servidor. A RLS já restringe às linhas do
  //    próprio usuário; o `eq(user_id)` é só clareza. Em lotes para não estourar
  //    o tamanho da query. O gatilho de updated_at faz a exclusão propagar.
  const cliente = await obterCliente()
  if (cliente) {
    const { data } = await cliente.auth.getUser()
    const uid = data.user?.id
    if (uid) {
      for (let i = 0; i < zerar.length; i += 40) {
        const lote = zerar.slice(i, i + 40)
        const { error } = await cliente
          .from('documentos')
          .update({ deleted: true })
          .eq('user_id', uid)
          .in('colecao', lote)
        if (error) throw error
      }
    }
  }

  // 2) LOCAL: limpa as tabelas zeradas + a tabela legada + o espelho dessas
  //    coleções (assim o próximo ciclo não tenta reenviar nada).
  await db.transaction('rw', db.tables, async () => {
    for (const c of zerar) {
      const t = (db as unknown as Record<string, { clear?: () => Promise<void> }>)[c]
      if (t?.clear) await t.clear()
    }
    await db.humores.clear() // humor antigo (legado, não sincroniza)
    const espelho = await db.espelho.toArray()
    const remover = espelho
      .filter((e) => zerar.some((c) => e.chave.startsWith(`${c}:`)))
      .map((e) => e.chave)
    if (remover.length) await db.espelho.bulkDelete(remover)
  })
}
