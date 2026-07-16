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
  { colecao: 'paginas', chave: 'id' },
  { colecao: 'grupos', chave: 'id' },
  { colecao: 'habitos', chave: 'id' },
  { colecao: 'habitoRegistros', chave: 'id' },
  { colecao: 'movimentos', chave: 'id' },
  { colecao: 'registros', chave: 'id' },
  { colecao: 'humorTipos', chave: 'nivel' },
  { colecao: 'categorias', chave: 'id' },
  { colecao: 'fatores', chave: 'id' },
  { colecao: 'saude', chave: 'id' },
  { colecao: 'livros', chave: 'id' },
  { colecao: 'categoriasHabito', chave: 'id' },
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
