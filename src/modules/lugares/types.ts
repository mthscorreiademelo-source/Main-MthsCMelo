/**
 * Módulo Lugares — pontos relevantes da vida do usuário (mercados, farmácias,
 * pet shops, parques, clínicas…). Com geolocalização opt-in, o Lume pode
 * sugerir a lista de compras certa ao chegar perto de um lugar.
 */

export type TipoLugar =
  | 'mercado'
  | 'farmacia'
  | 'petshop'
  | 'parque'
  | 'clinica'
  | 'restaurante'
  | 'trabalho'
  | 'casa'
  | 'outro'

export interface Lugar {
  id: string
  nome: string
  tipo: TipoLugar
  endereco?: string
  /** Coordenadas (opcionais) — base para "perto de mim". */
  lat?: number
  lng?: number
  /** Lista de compras associada (ex.: Mercado → lista Mercado). */
  listaId?: string
  /** Pet associado (ex.: pet shop / parque do pet). */
  petId?: string
  obs?: string
  favorito?: boolean
  ordem: number
  criadoEm: number
  atualizadoEm?: number
}
