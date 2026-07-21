/**
 * Modelo de dados do módulo Compras + Despensa Inteligente.
 *
 * Filosofia: o usuário compra, o Lume registra, aprende o padrão de consumo e
 * antecipa (com honestidade) quando algo provavelmente vai acabar. As previsões
 * são heurísticas, com nível de confiança — nunca certezas.
 *
 * Fase 1 (este código): listas, despensa manual, histórico, previsão por
 * intervalo médio, marcar compra (estoque + Finanças), aquisições planejadas.
 * Fase 2/3 (OCR de nota fiscal, foto de produto, código de barras, geo) estão
 * descritas em COMPRAS-IA-E-INTEGRACOES.md.
 */

export type OrigemItem = 'manual' | 'ia' | 'despensa' | 'pets' | 'saude' | 'projeto' | 'agenda' | 'notafiscal'
export type Prioridade = 'alta' | 'media' | 'baixa'
export type StatusItem = 'pendente' | 'comprado' | 'adiado'

/** Lista de compras por contexto/local (Mercado, Farmácia, Pet Shop…). */
export interface ListaCompra {
  id: string
  nome: string
  icone: string
  /** Vínculo opcional com um evento da Agenda. */
  eventoId?: string
  ordem: number
  criadoEm: number
  atualizadoEm?: number
}

export interface ItemCompra {
  id: string
  listaId: string
  nome: string
  quantidade?: number
  unidade?: string
  categoria?: string
  marca?: string
  prioridade?: Prioridade
  obs?: string
  precoEstimadoCentavos?: number
  loja?: string
  petId?: string
  projetoId?: string
  dataDesejada?: string
  origem: OrigemItem
  status: StatusItem
  /** Item da despensa que esta compra repõe (para atualizar o estoque). */
  despensaId?: string
  ordem: number
  compradoEm?: number
  criadoEm: number
  atualizadoEm?: number
}

/** Nível aproximado de estoque, quando o usuário não sabe a quantidade exata. */
export type NivelAprox = 'cheio' | 'tres_quartos' | 'metade' | 'pouco' | 'quase_vazio'

/** Item da despensa (estoque pessoal amplo: comida, higiene, limpeza, pet…). */
export interface ItemDespensa {
  id: string
  nome: string
  marca?: string
  categoria: string
  local?: string
  unidade: string
  /** Código de barras (EAN) — preenchido ao escanear. */
  ean?: string
  /** Unidades fechadas em estoque. */
  quantidadeFechados?: number
  /** Há uma unidade aberta em uso? */
  emUso?: boolean
  /** Fração aproximada (0–1) da unidade em uso. */
  fracaoEmUso?: number
  /** Tamanho de cada embalagem (na `unidade`) — base para estimativas. */
  tamanhoEmbalagem?: number
  /** Alternativa à quantidade exata: nível aproximado. */
  nivelAprox?: NivelAprox
  /** "Tenho em casa, não sei a quantidade." */
  possuiApenas?: boolean
  /** Consumo diário estimado (na `unidade`); se ausente, é inferido do histórico. */
  consumoDia?: number
  fabricacao?: string
  validade?: string
  /** Validade após aberto, em dias. */
  validadeAposAbertura?: number
  lote?: string
  /** Quando a unidade em uso foi aberta (ISO). */
  abertoEm?: string
  /** A IA monitora este item para sugerir reposição. */
  monitorarIA?: boolean
  favorito?: boolean
  petId?: string
  /** Vinculado ao módulo Saúde (medicamento/suplemento/primeiros socorros). */
  saudeVinculo?: boolean
  projetoId?: string
  obs?: string
  ultimaCompraEm?: string
  criadoEm: number
  atualizadoEm?: number
}

export type TipoMovDespensa = 'compra' | 'ajuste' | 'abriu' | 'acabou' | 'descarte'

/** Histórico de um item da despensa (compras, ajustes, aberturas, descartes). */
export interface MovDespensa {
  id: string
  despensaId: string
  tipo: TipoMovDespensa
  data: string
  /** Quantidade envolvida (unidades ou tamanho, conforme o tipo). */
  quantidade?: number
  precoCentavos?: number
  loja?: string
  marca?: string
  obs?: string
  criadoEm: number
  atualizadoEm?: number
}

export type StatusAquisicao =
  | 'desejo'
  | 'pesquisando'
  | 'planejando'
  | 'aguardando_preco'
  | 'pronto'
  | 'comprado'
  | 'cancelado'

/** Aquisição planejada (itens caros/complexos): mini-workspace. */
export interface Aquisicao {
  id: string
  nome: string
  categoria?: string
  descricao?: string
  necessidade?: string
  prioridade?: Prioridade
  orcamentoCentavos?: number
  valorEsperadoCentavos?: number
  valorAtualCentavos?: number
  dataDesejada?: string
  projetoId?: string
  links?: string[]
  lojas?: string[]
  pros?: string[]
  contras?: string[]
  notas?: string
  status: StatusAquisicao
  ordem: number
  criadoEm: number
  atualizadoEm?: number
}

/** Registro de preço observado para uma aquisição planejada. */
export interface PrecoAquisicao {
  id: string
  aquisicaoId: string
  data: string
  precoCentavos: number
  loja?: string
  obs?: string
  criadoEm: number
  atualizadoEm?: number
}

/** Config do módulo: layout das seções + preferências. */
export interface ModuloSecao {
  id: string
  visivel: boolean
  recolhido: boolean
  ordem: number
}
export interface ComprasConfig {
  id: string // 'default'
  secoes?: ModuloSecao[]
  /** Pessoas na casa (contextualiza consumo). */
  pessoasNaCasa?: number
  /** Locais de armazenamento personalizados. */
  locais?: string[]
  atualizadoEm?: number
}
