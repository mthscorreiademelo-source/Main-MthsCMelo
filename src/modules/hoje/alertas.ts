/**
 * Camada de ALERTA do topo do Hoje. Lógica pura e testável: recebe dados que já
 * foram carregados pela página e devolve os alertas do momento, do mais crítico
 * ao menos crítico. A página decide como pintar (o mais crítico em destaque, os
 * outros compactos) e o selo do modo vira "· Atenção" quando há algo de alta.
 *
 * Só usa sinais que JÁ conseguimos detectar hoje. NÃO inventa dado de saúde.
 */

export type SeveridadeAlerta = 'alta' | 'media'
export type TipoAlerta = 'evento' | 'tarefa' | 'orcamento' | 'despensa'

export interface Alerta {
  id: string
  tipo: TipoAlerta
  severidade: SeveridadeAlerta
  /** Peso para ordenar (maior = mais crítico). */
  peso: number
  titulo: string
  detalhe?: string
  /** Emoji opcional (itens da despensa já trazem o seu ícone). */
  emoji?: string
  /** Rota para resolver o alerta. */
  to?: string
  /** Rótulo do botão de ação (ex.: "Ver despensa"). */
  acao?: string
}

/** Evento (com horário) reduzido ao mínimo que o alerta precisa. */
export interface EventoAlerta {
  id: string
  titulo: string
  /** Minuto de início no dia (já convertido de HH:mm). */
  inicioMin: number
}

/** Item da despensa já resumido (como em HojePage.despensaAlertas). */
export interface DespensaAlerta {
  id: string
  nome: string
  icone: string
  motivo: string
}

/** Um evento a partir de quantos minutos é considerado "iminente". */
export const MIN_EVENTO_IMINENTE = 15

/** Severidade + peso de um item da despensa a partir do "motivo" textual. */
function nivelDespensa(motivo: string): { severidade: SeveridadeAlerta; peso: number } {
  if (motivo === 'vencido') return { severidade: 'alta', peso: 66 }
  if (motivo === 'vence hoje') return { severidade: 'alta', peso: 64 }
  const m = motivo.match(/~(\d+)/)
  if (m) {
    const dias = Number(m[1])
    if (dias <= 1) return { severidade: 'alta', peso: 60 }
    if (dias <= 3) return { severidade: 'media', peso: 52 - dias }
  }
  return { severidade: 'media', peso: 42 } // "quase acabando" e afins
}

/** Título humano para um item da despensa. */
function tituloDespensa(nome: string, motivo: string): string {
  if (motivo === 'vencido') return `${nome} vencido`
  if (motivo === 'vence hoje') return `${nome} vence hoje`
  if (motivo === 'quase acabando') return `${nome} quase acabando`
  if (motivo.startsWith('~')) return `${nome} acabando (${motivo})`
  return `${nome} · ${motivo}`
}

/**
 * Monta a lista de alertas do momento, ordenada do mais crítico ao menos.
 * Sinais cobertos: evento começando em ≤15 min, tarefas atrasadas, orçamento do
 * dia estourado (só se as finanças estiverem configuradas) e itens da despensa
 * acabando/vencendo.
 */
export function construirAlertas(args: {
  agoraMin: number
  eventos: EventoAlerta[]
  atrasadas: number
  despensa: DespensaAlerta[]
  /** Disponível para hoje (centavos); < 0 = estourou. null = finanças não configuradas. */
  disponivelHoje: number | null
  /** Formata centavos → "R$ x,xx". */
  formatarBRL: (centavos: number) => string
}): Alerta[] {
  const { agoraMin, eventos, atrasadas, despensa, disponivelHoje, formatarBRL } = args
  const out: Alerta[] = []

  // 1. Evento começando em ≤ 15 min (o próximo que ainda não começou).
  const proximo = eventos
    .filter((e) => e.inicioMin > agoraMin)
    .sort((a, b) => a.inicioMin - b.inicioMin)[0]
  if (proximo) {
    const faltam = proximo.inicioMin - agoraMin
    if (faltam <= MIN_EVENTO_IMINENTE) {
      out.push({
        id: `evento-${proximo.id}`,
        tipo: 'evento',
        severidade: 'alta',
        peso: 90,
        titulo: `${proximo.titulo} começa em ${faltam} min`,
        detalhe: faltam <= 1 ? 'É agora. Prepare-se.' : 'Está quase na hora.',
        to: '/agenda',
        acao: 'Ver agenda',
      })
    }
  }

  // 2. Tarefas atrasadas (passaram do prazo e seguem pendentes).
  if (atrasadas > 0) {
    out.push({
      id: 'tarefas-atrasadas',
      tipo: 'tarefa',
      severidade: 'alta',
      peso: 78,
      titulo: `${atrasadas} tarefa${atrasadas > 1 ? 's' : ''} atrasada${atrasadas > 1 ? 's' : ''}`,
      detalhe: 'Passaram do prazo e ainda estão pendentes.',
      to: '/tarefas',
      acao: 'Ver tarefas',
    })
  }

  // 3. Orçamento do dia estourado (só quando há finanças configuradas de verdade).
  if (disponivelHoje != null && disponivelHoje < 0) {
    out.push({
      id: 'orcamento-estourado',
      tipo: 'orcamento',
      severidade: 'alta',
      peso: 74,
      titulo: 'Orçamento de hoje estourado',
      detalhe: `Você passou ${formatarBRL(-disponivelHoje)} do planejado para hoje.`,
      to: '/financas',
      acao: 'Ver finanças',
    })
  }

  // 4. Despensa — um alerta por item; o mais crítico vira o destaque do banner.
  for (const d of despensa) {
    const { severidade, peso } = nivelDespensa(d.motivo)
    out.push({
      id: `despensa-${d.id}`,
      tipo: 'despensa',
      severidade,
      peso,
      titulo: tituloDespensa(d.nome, d.motivo),
      detalhe: 'Vale já colocar na lista de compras.',
      emoji: d.icone,
      to: '/compras',
      acao: 'Ver despensa',
    })
  }

  return out.sort((a, b) => b.peso - a.peso)
}

/** Há algum alerta de alta severidade? (vira o selo do modo em "· Atenção"). */
export function temAlertaAlta(alertas: Alerta[]): boolean {
  return alertas.some((a) => a.severidade === 'alta')
}
