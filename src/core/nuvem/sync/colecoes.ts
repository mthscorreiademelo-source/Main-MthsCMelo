/**
 * Tabelas que sincronizam e o campo que é a chave primária de cada uma.
 *
 * Anexos (blobs) têm um caminho próprio: os METADADOS viajam por aqui (sem o
 * blob), e o BINÁRIO vai pelo Supabase Storage (ver `anexos.ts`). Isso só entra
 * em vigor quando `ANEXOS_ATIVO` é ligado — o que exige criar o bucket no
 * Supabase (ver SETUP-SUPABASE.md). Enquanto desligado, nada muda: os blobs
 * seguem 100% locais, como antes.
 */
export interface ColecaoSync {
  colecao: string
  chave: string
}

/**
 * Liga a sincronização de anexos (metadados via `documentos` + binário via
 * Storage). Mantido DESLIGADO até o bucket `anexos` existir no Supabase e o
 * fluxo ser validado em dois aparelhos reais. Ligar = criar o bucket + policies
 * (SETUP-SUPABASE.md) e trocar isto para `true`.
 */
export const ANEXOS_ATIVO = false

/** Tabelas de anexo → campo que guarda o Blob (removido no push, preservado no pull). */
export const TABELAS_BLOB: Record<string, string> = {
  arquivos: 'blob',
  arquivosLivros: 'blob',
  petArquivos: 'blob',
}

export function ehTabelaBlob(colecao: string): boolean {
  return Object.prototype.hasOwnProperty.call(TABELAS_BLOB, colecao)
}

const COLECOES_BASE: ColecaoSync[] = [
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
  { colecao: 'lugares', chave: 'id' },
  { colecao: 'perfil', chave: 'id' },
  { colecao: 'projetoItens', chave: 'id' },
  { colecao: 'capturas', chave: 'id' },
  { colecao: 'rotinas', chave: 'id' },
  { colecao: 'rotinaExecucoes', chave: 'id' },
  { colecao: 'flashcards', chave: 'id' },
]

// Metadados dos anexos só entram na sincronização quando o recurso está ligado.
const COLECOES_BLOB: ColecaoSync[] = Object.keys(TABELAS_BLOB).map((colecao) => ({ colecao, chave: 'id' }))

export const COLECOES: ColecaoSync[] = ANEXOS_ATIVO ? [...COLECOES_BASE, ...COLECOES_BLOB] : COLECOES_BASE

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
