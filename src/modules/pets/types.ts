/**
 * Modelo de dados do módulo Pets.
 *
 * Cada animal é um "Workspace" (como Projetos ou Biblioteca): um ambiente
 * dedicado onde toda a vida daquele pet fica centralizada e sincronizada com
 * o resto do Lume (Agenda, Finanças, Documentos). Nada aqui inventa dados —
 * os "insights" são leituras heurísticas do que o tutor registrou.
 */

export type Especie = 'cachorro' | 'gato' | 'ave' | 'coelho' | 'reptil' | 'peixe' | 'outro'
export type SexoPet = 'macho' | 'femea' | 'indefinido'
export type StatusPet = 'ativo' | 'arquivado' | 'memoria'

/** Configuração de um card no workspace (modular: mostrar/ocultar/reordenar/recolher). */
export interface ModuloWorkspace {
  id: string
  visivel: boolean
  recolhido: boolean
  ordem: number
}

export interface Pet {
  id: string
  nome: string
  especie: Especie
  raca?: string
  sexo?: SexoPet
  /** Data de nascimento (ISO yyyy-MM-dd) — base para a idade. */
  nascimento?: string
  adotadoEm?: string
  corPelagem?: string
  microchip?: string
  castrado?: boolean
  /** Faixa de peso ideal (kg) para contextualizar o gráfico. */
  pesoIdealMin?: number
  pesoIdealMax?: number
  /** Blobs em `petArquivos`. */
  fotoId?: string
  capaId?: string
  /** Emoji de identidade (fallback quando não há foto). */
  emoji?: string
  obs?: string
  /** Layout modular do workspace deste pet. */
  modulos?: ModuloWorkspace[]
  status: StatusPet
  ordem: number
  criadoEm: number
  atualizadoEm?: number
}

export interface PetPeso {
  id: string
  petId: string
  data: string // ISO yyyy-MM-dd
  kg: number
  obs?: string
  criadoEm: number
  atualizadoEm?: number
}

export interface PetVacina {
  id: string
  petId: string
  nome: string
  /** Data de aplicação (ISO). */
  data: string
  veterinario?: string
  lote?: string
  validade?: string
  /** Próxima dose agendada (ISO) — gera lembrete/evento na Agenda. */
  proximaDose?: string
  /** Vínculo com o evento criado na Agenda (próxima dose). */
  eventoId?: string
  obs?: string
  criadoEm: number
  atualizadoEm?: number
}

export type TipoHistorico = 'consulta' | 'exame' | 'cirurgia' | 'diagnostico' | 'receita' | 'observacao'

/** Item da linha do tempo do prontuário veterinário. */
export interface PetConsulta {
  id: string
  petId: string
  tipo: TipoHistorico
  data: string
  titulo: string
  veterinario?: string
  local?: string
  descricao?: string
  /** Documentos anexados (ids em `petDocumentos`). */
  documentoIds?: string[]
  custoCentavos?: number
  /** Vínculo com evento na Agenda (quando agendado no futuro). */
  eventoId?: string
  criadoEm: number
  atualizadoEm?: number
}

export type TipoCondicao = 'alergia' | 'doenca' | 'cronica'
export interface PetCondicao {
  id: string
  petId: string
  tipo: TipoCondicao
  nome: string
  desde?: string
  obs?: string
  ativo: boolean
  criadoEm: number
  atualizadoEm?: number
}

export interface PetMedicamento {
  id: string
  petId: string
  nome: string
  dose?: string
  frequencia?: string
  inicio?: string
  fim?: string
  continuo?: boolean
  obs?: string
  criadoEm: number
  atualizadoEm?: number
}

export type TipoAlimento = 'racao' | 'umida' | 'natural' | 'petisco' | 'suplemento'
export interface PetAlimento {
  id: string
  petId: string
  tipo: TipoAlimento
  nome: string
  sabor?: string
  gramasPorDia?: number
  refeicoesPorDia?: number
  /** Horários das refeições (HH:mm). */
  horarios?: string[]
  /** Tamanho do pacote atual (g) — base para estimar quantos dias restam. */
  pacoteGramas?: number
  /** Quando o pacote atual foi aberto (ISO). */
  abertoEm?: string
  /** A comida principal (ração) — destaque no card. */
  principal?: boolean
  obs?: string
  criadoEm: number
  atualizadoEm?: number
}

export type CategoriaItem = 'racao' | 'petisco' | 'medicamento' | 'antipulgas' | 'shampoo' | 'areia' | 'outro'
export interface PetItem {
  id: string
  petId: string
  categoria: CategoriaItem
  nome: string
  quantidade: number
  unidade: string
  /** Consumo diário (mesma unidade) para estimar o esgotamento. */
  consumoDia?: number
  criadoEm: number
  atualizadoEm?: number
}

/** Definição de um cuidado diário (checklist). */
export interface PetCuidado {
  id: string
  petId: string
  nome: string
  icone: string
  horario?: string
  /** Dias da semana (0=Dom … 6=Sáb); vazio/ausente = todos os dias. */
  dias?: number[]
  ordem: number
  ativo: boolean
  /** Vínculo futuro com um hábito global. */
  habitoId?: string
  criadoEm: number
  atualizadoEm?: number
}

export interface PetCuidadoRegistro {
  /** `${cuidadoId}:${data}`. */
  id: string
  petId: string
  cuidadoId: string
  data: string
  feito: boolean
  criadoEm: number
  atualizadoEm?: number
}

/** Metadados de uma foto do álbum (blob em `petArquivos`). */
export interface PetFoto {
  id: string
  petId: string
  legenda?: string
  data?: string
  favorito?: boolean
  criadoEm: number
  atualizadoEm?: number
}

export type CategoriaDoc = 'vacinacao' | 'receita' | 'exame' | 'plano' | 'pedigree' | 'nota' | 'outro'
/** Metadados de um documento (blob em `petArquivos`). Também aparece na aba Documentos. */
export interface PetDocumento {
  id: string
  petId: string
  nome: string
  tipo: string
  categoria: CategoriaDoc
  tamanho: number
  criadoEm: number
  atualizadoEm?: number
}

/** Conteúdo binário local (fotos + documentos). Não sincroniza (como os livros). */
export interface PetArquivo {
  id: string
  blob: Blob
  nome: string
  tipo: string
  tamanho: number
  criadoEm: number
}
