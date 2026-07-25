/**
 * "Diário do dia" — textos curtos que o usuário escreve no Hoje (gratidão,
 * reflexão, propósito de amanhã, ideia). Estratégia híbrida:
 *
 *  1. localStorage por dia → reflete na hora e sobrevive a reload (edição fácil).
 *  2. nota real (tabela `paginas`, que SINCRONIZA) → permanência de verdade,
 *     marcada com uma tag ('gratidao'|'reflexao'|'proposito'|'ideia').
 *
 * Reedições no mesmo dia atualizam a MESMA nota (guardamos o id no localStorage).
 * Assim nada se perde e a tela responde instantaneamente. Não cria tabela nova.
 */

import { useCallback } from 'react'
import { criarNotaComTexto } from '../../core/captura/fluxos'
import { atualizarPagina } from '../notas/acoes'
import { novoBloco } from '../notas/db'
import { useLocal } from './local'

export type TipoDiario = 'gratidao' | 'reflexao' | 'proposito' | 'ideia'

interface EstadoDiario {
  /** Texto salvo (o que o card mostra). */
  texto: string
  /** Id da nota criada nesse dia (para reeditar a mesma). */
  paginaId?: string
}

/** Título curto da nota, por tipo, para dar contexto na lista de Notas. */
const TITULO: Record<TipoDiario, string> = {
  gratidao: 'Gratidão',
  reflexao: 'Reflexão',
  proposito: 'Propósito de amanhã',
  ideia: 'Ideia',
}

/**
 * Hook de um campo do diário, preso ao dia. Devolve o texto atual e um `salvar`
 * que grava local + cria/atualiza a nota sincronizada. `pergunta` (opcional)
 * vira a primeira linha da nota, dando contexto ao texto salvo.
 */
export function useDiario(tipo: TipoDiario, diaISO: string) {
  const [estado, setEstado] = useLocal<EstadoDiario>(`diario:${tipo}:${diaISO}`, { texto: '' })

  const salvar = useCallback(
    async (texto: string, pergunta?: string) => {
      const limpo = texto.trim()
      // Atualiza o card na hora (mesmo que a escrita na nota demore/falhe).
      setEstado((ant) => ({ ...ant, texto: limpo }))
      if (!limpo) return

      const corpo = pergunta ? `${pergunta}\n${limpo}` : limpo
      const rotulo = `${TITULO[tipo]} · ${diaISO}`
      try {
        const idExistente = estado.paginaId
        if (idExistente) {
          await atualizarPagina(idExistente, {
            titulo: rotulo,
            blocos: [novoBloco('titulo', rotulo), novoBloco('paragrafo', corpo)],
            tags: [tipo],
            atualizadaEm: Date.now(),
          })
        } else {
          const id = await criarNotaComTexto(corpo)
          await atualizarPagina(id, { titulo: rotulo, tags: [tipo], atualizadaEm: Date.now() })
          setEstado((ant) => ({ ...ant, paginaId: id }))
        }
      } catch {
        /* Se a nota falhar, o texto local já foi salvo — nada se perde. */
      }
    },
    [tipo, diaISO, estado.paginaId, setEstado],
  )

  return { texto: estado.texto, salvo: !!estado.texto, salvar }
}
