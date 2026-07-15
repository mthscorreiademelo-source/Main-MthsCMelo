/** Nível de humor de 1 (muito ruim) a 5 (excelente) — escala fixa para gráficos. */
export type NivelHumor = 1 | 2 | 3 | 4 | 5

/** Intensidade do humor dentro do nível: 1 leve · 2 médio · 3 forte. */
export type Intensidade = 1 | 2 | 3

/** Aparência de cada um dos 5 níveis — personalizável (nome/cor/ícone/descrição). */
export interface HumorTipo {
  nivel: NivelHumor
  nome: string
  cor: string
  /** Chave do rosto exclusivo (padrão: `rosto${nivel}`). */
  icone: string
  descricao?: string
}

/** Grupo de fatores (ex.: Emoções, Sono, Exercícios) — recolhível e reordenável. */
export interface Categoria {
  id: string
  nome: string
  icone: string
  ordem: number
  recolhida?: boolean
  /** Categorias do sistema não podem ser excluídas (só editadas). */
  sistema?: boolean
}

/** Um fator marcável num registro: emoção secundária ou atividade. */
export interface Fator {
  id: string
  categoriaId: string
  nome: string
  icone: string
  cor?: string
  descricao?: string
  ordem: number
  arquivado?: boolean
}

/** Um registro de humor — vários por dia, formando a linha do tempo. */
export interface Registro {
  id: string
  /** Dia a que pertence, ISO yyyy-MM-dd. */
  data: string
  /** Momento exato do registro (hora exibida + ordenação). */
  criadoEm: number
  nivel: NivelHumor
  intensidade?: Intensidade
  fatorIds: string[]
  nota?: string
  /** Referência a um blob na tabela `arquivos`. */
  anexoId?: string
  anexoTipo?: 'foto' | 'desenho'
}

/** Legado (v0.16): um humor por dia. Mantido só para migração/backup. */
export interface HumorRegistro {
  id: string
  data: string
  nivel: NivelHumor
  nota?: string
  atualizadoEm: number
}
