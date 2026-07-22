/**
 * Camada de Captura Rápida ("Quick Actions").
 *
 * Uma captura é qualquer informação que o usuário registra sem precisar
 * navegar até a aba certa. O Lume ajuda a classificar e encaminhar — mas a
 * interpretação é sempre HEURÍSTICA e determinística (datas, valores,
 * palavras-chave). Nunca inventamos dados nem simulamos um backend de IA:
 * o palpite é sempre mostrado para o usuário confirmar antes de gravar.
 */

export type TipoCaptura =
  | 'tarefa'
  | 'evento'
  | 'nota'
  | 'desenho'
  | 'compra'
  | 'despesa'
  | 'receita'
  | 'lembrete'

export type Confianca = 'alta' | 'media' | 'baixa'

/** Ciclo de vida de uma captura na Caixa de entrada. */
export type StatusCaptura =
  | 'rascunho'
  | 'processando'
  | 'aguardando'
  | 'concluido'
  | 'falhou'
  | 'arquivado'

/** Campos que a heurística consegue extrair de um texto livre. */
export interface CampoInterpretado {
  titulo?: string
  /** ISO yyyy-MM-dd. */
  data?: string
  /** HH:mm. */
  horaInicio?: string
  horaFim?: string
  duracaoMin?: number
  valorCentavos?: number
  categoria?: string
  local?: string
  pessoa?: string
  /** Projeto marcado com `#` na captura (Tarefas/Notas). */
  projetoId?: string
  /** Nome do projeto (só para exibição no preview). */
  projetoNome?: string
}

/** Um palpite de interpretação — sempre confirmável, nunca gravado sozinho. */
export interface Interpretacao {
  tipo: TipoCaptura
  campos: CampoInterpretado
  confianca: Confianca
  /** Explicação curta e honesta de por que este palpite (mostrada ao usuário). */
  rotulo: string
}

/** Onde a captura foi arquivada, quando vira uma entidade real. */
export interface DestinoCaptura {
  colecao: string
  id: string
}

/** Registro persistido na Caixa de entrada (Dexie: tabela `capturas`). */
export interface Captura {
  id: string
  origem: 'universal' | 'acao' | 'atalho' | 'widget'
  textoBruto?: string
  tipoSugerido?: TipoCaptura
  interpretacao?: Interpretacao
  destino?: DestinoCaptura
  status: StatusCaptura
  confianca?: Confianca
  contexto?: string
  criadoEm: number
  atualizadoEm?: number
}
