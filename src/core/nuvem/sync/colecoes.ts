/**
 * Tabelas que sincronizam e o campo que é a chave primária de cada uma.
 * `arquivos` (blobs) fica de fora — vai para o Storage numa etapa futura.
 */
export interface ColecaoSync {
  colecao: string
  chave: string
}

export const COLECOES: ColecaoSync[] = [
  { colecao: 'tasks', chave: 'id' },
  { colecao: 'projetos', chave: 'id' },
  { colecao: 'eventos', chave: 'id' },
  { colecao: 'cronogramas', chave: 'id' },
  { colecao: 'contextos', chave: 'id' },
  { colecao: 'paginas', chave: 'id' },
  { colecao: 'grupos', chave: 'id' },
  { colecao: 'habitos', chave: 'id' },
  { colecao: 'habitoRegistros', chave: 'id' },
  { colecao: 'movimentos', chave: 'id' },
  { colecao: 'contas', chave: 'id' },
  { colecao: 'objetivos', chave: 'id' },
  { colecao: 'recorrentes', chave: 'id' },
  { colecao: 'orcamentoLinhas', chave: 'id' },
  { colecao: 'financasConfig', chave: 'id' },
  { colecao: 'patrimonioSnapshots', chave: 'mes' },
  { colecao: 'registros', chave: 'id' },
  { colecao: 'humorTipos', chave: 'nivel' },
  { colecao: 'categorias', chave: 'id' },
  { colecao: 'fatores', chave: 'id' },
  { colecao: 'saude', chave: 'id' },
  { colecao: 'saudeMedidas', chave: 'id' },
  { colecao: 'atividades', chave: 'id' },
  { colecao: 'refeicoes', chave: 'id' },
  { colecao: 'profissionais', chave: 'id' },
  { colecao: 'consultas', chave: 'id' },
  { colecao: 'medicamentos', chave: 'id' },
  { colecao: 'medicamentoTomadas', chave: 'id' },
  { colecao: 'exames', chave: 'id' },
  { colecao: 'vacinas', chave: 'id' },
  { colecao: 'doacoesSangue', chave: 'id' },
  { colecao: 'saudeConfig', chave: 'id' },
  { colecao: 'livros', chave: 'id' },
  { colecao: 'notasLivro', chave: 'id' },
  { colecao: 'destaques', chave: 'id' },
  { colecao: 'categoriasHabito', chave: 'id' },
  { colecao: 'pets', chave: 'id' },
  { colecao: 'petPesos', chave: 'id' },
  { colecao: 'petVacinas', chave: 'id' },
  { colecao: 'petConsultas', chave: 'id' },
  { colecao: 'petCondicoes', chave: 'id' },
  { colecao: 'petMedicamentos', chave: 'id' },
  { colecao: 'petAlimentos', chave: 'id' },
  { colecao: 'petItens', chave: 'id' },
  { colecao: 'petCuidados', chave: 'id' },
  { colecao: 'petCuidadoRegistros', chave: 'id' },
  { colecao: 'petFotos', chave: 'id' },
  { colecao: 'petDocumentos', chave: 'id' },
  { colecao: 'comprasListas', chave: 'id' },
  { colecao: 'comprasItens', chave: 'id' },
  { colecao: 'despensa', chave: 'id' },
  { colecao: 'despensaHistorico', chave: 'id' },
  { colecao: 'aquisicoes', chave: 'id' },
  { colecao: 'aquisicaoPrecos', chave: 'id' },
  { colecao: 'comprasConfig', chave: 'id' },
]

export const NOMES_SYNC = COLECOES.map((c) => c.colecao)

/** A chave de um registro na coleção, sempre como string (id do documento). */
export function idDoc(colecao: string, registro: Record<string, unknown>): string {
  const cfg = COLECOES.find((c) => c.colecao === colecao)
  return String(registro[cfg?.chave ?? 'id'])
}

/** Converte o id-string de volta para a chave real da tabela Dexie. */
export function chaveReal(colecao: string, id: string): string | number {
  return colecao === 'humorTipos' ? Number(id) : id
}
