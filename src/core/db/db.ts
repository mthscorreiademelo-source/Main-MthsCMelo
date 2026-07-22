import Dexie, { type Table } from 'dexie'
import type { ItemProjeto, Projeto, Task } from '../../modules/tarefas/types'
import type { Grupo, Pagina } from '../../modules/notas/types'
import type { CategoriaHabito, Habito, HabitoRegistro } from '../../modules/habitos/types'
import type {
  Conta,
  FinancasConfig,
  Movimento,
  Objetivo,
  OrcamentoLinha,
  PatrimonioSnapshot,
  Recorrente,
} from '../../modules/financas/types'
import { deveIgnorarHooks } from '../nuvem/sync/bandeira'
import { NOMES_SYNC } from '../nuvem/sync/colecoes'
import { agendarReconciliacao, marcarSujo } from '../nuvem/sync/sujos'
import type { Perfil } from '../perfil/types'
import type { Captura } from '../captura/types'
import type { ExecucaoRotina, Rotina } from '../../modules/habitos/rotinas/types'
import type {
  Categoria,
  Fator,
  HumorRegistro,
  HumorTipo,
  Registro,
} from '../../modules/humor/types'
import type {
  Atividade,
  Consulta,
  DoacaoSangue,
  Exame,
  Medicamento,
  MedicamentoTomada,
  Medida,
  Profissional,
  Refeicao,
  SaudeConfig,
  SaudeDia,
  Vacina,
} from '../../modules/saude/types'
import type { ArquivoLivro, Destaque, Livro, NotaLivro } from '../../modules/biblioteca/types'
import type { Flashcard } from '../../modules/biblioteca/flashcards/tipos'
import type { Contexto, Cronograma, Evento } from '../../modules/agenda/types'
import type {
  Pet,
  PetAlimento,
  PetArquivo,
  PetCondicao,
  PetConsulta,
  PetCuidado,
  PetCuidadoRegistro,
  PetDocumento,
  PetFoto,
  PetItem,
  PetMedicamento,
  PetPeso,
  PetVacina,
} from '../../modules/pets/types'
import type {
  Aquisicao,
  ComprasConfig,
  ItemCompra,
  ItemDespensa,
  ListaCompra,
  MovDespensa,
  PrecoAquisicao,
} from '../../modules/compras/types'
import type { Lugar } from '../../modules/lugares/types'

/** Conteúdo binário de um arquivo anexado a uma nota do tipo 'arquivos'. */
export interface ArquivoDados {
  id: string
  blob: Blob
  nome: string
  tipo: string
  tamanho: number
  criadoEm: number
}

/**
 * Banco local (IndexedDB) do app.
 * Regra: cada módulo novo ganha sua(s) tabela(s) numa nova versão do schema —
 * nunca edite uma versão já publicada, adicione `this.version(n + 1)`.
 */
class VidaDB extends Dexie {
  tasks!: Table<Task, string>
  projetos!: Table<Projeto, string>
  eventos!: Table<Evento, string>
  cronogramas!: Table<Cronograma, string>
  contextos!: Table<Contexto, string>
  paginas!: Table<Pagina, string>
  grupos!: Table<Grupo, string>
  habitos!: Table<Habito, string>
  habitoRegistros!: Table<HabitoRegistro, string>
  categoriasHabito!: Table<CategoriaHabito, string>
  movimentos!: Table<Movimento, string>
  contas!: Table<Conta, string>
  objetivos!: Table<Objetivo, string>
  recorrentes!: Table<Recorrente, string>
  orcamentoLinhas!: Table<OrcamentoLinha, string>
  financasConfig!: Table<FinancasConfig, string>
  patrimonioSnapshots!: Table<PatrimonioSnapshot, string>
  arquivos!: Table<ArquivoDados, string>
  humores!: Table<HumorRegistro, string>
  registros!: Table<Registro, string>
  humorTipos!: Table<HumorTipo, number>
  categorias!: Table<Categoria, string>
  fatores!: Table<Fator, string>
  saude!: Table<SaudeDia, string>
  saudeMedidas!: Table<Medida, string>
  atividades!: Table<Atividade, string>
  refeicoes!: Table<Refeicao, string>
  profissionais!: Table<Profissional, string>
  consultas!: Table<Consulta, string>
  medicamentos!: Table<Medicamento, string>
  medicamentoTomadas!: Table<MedicamentoTomada, string>
  exames!: Table<Exame, string>
  vacinas!: Table<Vacina, string>
  doacoesSangue!: Table<DoacaoSangue, string>
  saudeConfig!: Table<SaudeConfig, string>
  livros!: Table<Livro, string>
  notasLivro!: Table<NotaLivro, string>
  destaques!: Table<Destaque, string>
  /** Arquivos dos livros (blobs) — locais, não sincronizam. */
  arquivosLivros!: Table<ArquivoLivro, string>
  pets!: Table<Pet, string>
  petPesos!: Table<PetPeso, string>
  petVacinas!: Table<PetVacina, string>
  petConsultas!: Table<PetConsulta, string>
  petCondicoes!: Table<PetCondicao, string>
  petMedicamentos!: Table<PetMedicamento, string>
  petAlimentos!: Table<PetAlimento, string>
  petItens!: Table<PetItem, string>
  petCuidados!: Table<PetCuidado, string>
  petCuidadoRegistros!: Table<PetCuidadoRegistro, string>
  petFotos!: Table<PetFoto, string>
  petDocumentos!: Table<PetDocumento, string>
  /** Blobs de fotos e documentos dos pets — locais, não sincronizam. */
  petArquivos!: Table<PetArquivo, string>
  comprasListas!: Table<ListaCompra, string>
  comprasItens!: Table<ItemCompra, string>
  despensa!: Table<ItemDespensa, string>
  despensaHistorico!: Table<MovDespensa, string>
  aquisicoes!: Table<Aquisicao, string>
  aquisicaoPrecos!: Table<PrecoAquisicao, string>
  comprasConfig!: Table<ComprasConfig, string>
  lugares!: Table<Lugar, string>
  perfil!: Table<Perfil, string>
  projetoItens!: Table<ItemProjeto, string>
  /** Caixa de entrada da Captura Rápida (Quick Actions). */
  capturas!: Table<Captura, string>
  /** Rotinas (sequências reutilizáveis) e seu histórico de execução. */
  rotinas!: Table<Rotina, string>
  rotinaExecucoes!: Table<ExecucaoRotina, string>
  /** Flashcards (repetição espaçada, Biblioteca). */
  flashcards!: Table<Flashcard, string>
  /** Espelho do último estado sincronizado (chave → atualizadoEm). */
  espelho!: Table<{ chave: string; atualizadoEm: number }, string>

  constructor() {
    super('vida')
    this.version(1).stores({
      tasks: 'id, data, concluidaEm, criadaEm',
    })
    this.version(2).stores({
      paginas: 'id, atualizadaEm, criadaEm',
    })
    this.version(3).stores({
      habitos: 'id, ordem, criadoEm',
      habitoRegistros: 'id, habitoId, data',
    })
    this.version(4).stores({
      movimentos: 'id, data, criadoEm',
    })
    this.version(5).stores({
      grupos: 'id, ordem, criadoEm',
      paginas: 'id, atualizadaEm, criadaEm, grupoId',
    })
    this.version(6).stores({
      arquivos: 'id, criadoEm',
    })
    this.version(7).stores({
      humores: 'id, data',
    })
    this.version(8).stores({
      registros: 'id, data, criadoEm',
      humorTipos: 'nivel',
      categorias: 'id, ordem',
      fatores: 'id, categoriaId, ordem',
    })
    // v9: espelho de sincronização + carimbo `atualizadoEm` em tudo que sincroniza.
    this.version(9)
      .stores({ espelho: 'chave' })
      .upgrade(async (tx) => {
        const agora = Date.now()
        for (const nome of NOMES_SYNC) {
          await tx
            .table(nome)
            .toCollection()
            .modify((r: Record<string, unknown>) => {
              if (r.atualizadoEm == null) r.atualizadoEm = agora
            })
        }
      })
    this.version(10).stores({
      saude: 'id, data',
    })
    // v11: biblioteca. `livros` (metadados) sincroniza; `arquivosLivros` (blobs) é local.
    this.version(11).stores({
      livros: 'id, status, tipo, atualizadoEm',
      arquivosLivros: 'id',
    })
    // v12: reafirma as tabelas recentes para curar bancos que, por terem passado
    // por versões intermediárias, ficaram sem alguma object store (ex.: `saude`).
    // Redeclarar com o mesmo schema preserva os dados e só cria o que falta.
    this.version(12).stores({
      saude: 'id, data',
      livros: 'id, status, tipo, atualizadoEm',
      arquivosLivros: 'id',
    })
    // v13: redesenho de Hábitos — categorias + tipos/frequência.
    this.version(13)
      .stores({
        categoriasHabito: 'id, ordem',
        habitos: 'id, ordem, criadoEm, categoriaId',
      })
      .upgrade(async (tx) => {
        // Hábitos antigos viram tipo "Sim/Não", diários e sem categoria.
        await tx
          .table('habitos')
          .toCollection()
          .modify((h: Record<string, unknown>) => {
            if (h.tipo == null) h.tipo = 'sim_nao'
            if (h.frequencia == null) h.frequencia = { tipo: 'diario' }
          })
      })
    // v14: redesenho de Tarefas (Todoist) — projetos + prioridade/subtarefas.
    this.version(14)
      .stores({
        projetos: 'id, ordem',
        tasks: 'id, data, concluidaEm, criadaEm, projetoId, paiId, atualizadoEm',
      })
      .upgrade(async (tx) => {
        // Tarefas antigas: prioridade P4, ordem = criação, `nota` → `descricao`.
        await tx
          .table('tasks')
          .toCollection()
          .modify((t: Record<string, unknown>) => {
            if (t.prioridade == null) t.prioridade = 4
            if (t.ordem == null) t.ordem = (t.criadaEm as number) ?? Date.now()
            if (t.descricao == null && t.nota != null) t.descricao = t.nota
          })
      })
    // v15: módulo Agenda (eventos com blocos de tempo).
    this.version(15).stores({
      eventos: 'id, data, atualizadoEm',
    })
    // v16: cronogramas (Gantt) + índice por cronograma nos eventos.
    this.version(16).stores({
      cronogramas: 'id, ordem',
      eventos: 'id, data, cronogramaId, atualizadoEm',
    })
    // v17: Finanças — patrimônio (contas), objetivos, recorrentes, distribuição
    // do orçamento, config do módulo e snapshots mensais do patrimônio.
    this.version(17).stores({
      contas: 'id, ordem',
      objetivos: 'id, ordem',
      recorrentes: 'id, ordem',
      orcamentoLinhas: 'id, ordem',
      financasConfig: 'id',
      patrimonioSnapshots: 'mes',
    })
    // v18: Saúde expandida — prontuário pessoal (medidas, atividades, refeições,
    // profissionais, consultas, medicamentos + tomadas, exames, vacinas, doações).
    this.version(18).stores({
      saudeMedidas: 'id, data, tipo',
      atividades: 'id, data',
      refeicoes: 'id, data',
      profissionais: 'id',
      consultas: 'id, data, profissionalId',
      medicamentos: 'id',
      medicamentoTomadas: 'id, medicamentoId, data',
      exames: 'id, data, marcador',
      vacinas: 'id, data',
      doacoesSangue: 'id, data',
      saudeConfig: 'id',
    })
    // v19: contextos de rotina editáveis (faixas de fundo da Agenda).
    this.version(19).stores({
      contextos: 'id, ordem',
    })
    // v20: Biblioteca — notas de leitura e destaques por livro.
    this.version(20).stores({
      notasLivro: 'id, livroId, criadoEm',
      destaques: 'id, livroId, criadoEm',
    })
    // v21: módulo Pets — cada animal é um workspace. Metadados sincronizam;
    // `petArquivos` (blobs de fotos/documentos) é local.
    this.version(21).stores({
      pets: 'id, ordem, status, criadoEm, atualizadoEm',
      petPesos: 'id, petId, data',
      petVacinas: 'id, petId, data',
      petConsultas: 'id, petId, data',
      petCondicoes: 'id, petId',
      petMedicamentos: 'id, petId',
      petAlimentos: 'id, petId',
      petItens: 'id, petId',
      petCuidados: 'id, petId, ordem',
      petCuidadoRegistros: 'id, petId, data',
      petFotos: 'id, petId, criadoEm',
      petDocumentos: 'id, petId, criadoEm',
      petArquivos: 'id',
    })
    // v22: módulo Compras + Despensa Inteligente.
    this.version(22).stores({
      comprasListas: 'id, ordem',
      comprasItens: 'id, listaId, status, despensaId',
      despensa: 'id, categoria, local, favorito',
      despensaHistorico: 'id, despensaId, data',
      aquisicoes: 'id, status, ordem',
      aquisicaoPrecos: 'id, aquisicaoId, data',
      comprasConfig: 'id',
    })
    // v23: módulo Lugares.
    this.version(23).stores({
      lugares: 'id, tipo, ordem',
    })
    // v24: unificação — o estoque de itens do Pet (petItens) passa a viver na
    // Despensa (fonte única), com petId. Migra os registros e esvazia petItens.
    this.version(24).upgrade(async (tx) => {
      const agora = Date.now()
      const itens = await tx.table('petItens').toArray()
      if (itens.length === 0) return
      const migrados = itens.map((i: Record<string, unknown>) => ({
        id: i.id,
        nome: i.nome,
        categoria: 'pet',
        local: 'Área do pet',
        unidade: i.unidade ?? 'un',
        quantidadeFechados: i.quantidade,
        consumoDia: i.consumoDia,
        petId: i.petId,
        monitorarIA: true,
        criadoEm: i.criadoEm ?? agora,
        atualizadoEm: agora,
      }))
      await tx.table('despensa').bulkAdd(migrados)
      await tx.table('petItens').clear()
    })
    // v25: perfil pessoal do usuário (nome, nascimento, foto, bio).
    this.version(25).stores({
      perfil: 'id',
    })
    // v26: itens locais dos módulos do Workspace de Projetos (ideias, links…).
    this.version(26).stores({
      projetoItens: 'id, projetoId, modulo',
    })
    // v27: índice projetoId para vincular eventos/movimentos/notas a projetos.
    this.version(27).stores({
      eventos: 'id, data, cronogramaId, atualizadoEm, projetoId',
      movimentos: 'id, data, criadoEm, projetoId',
      paginas: 'id, atualizadaEm, criadaEm, grupoId, projetoId',
    })
    // v28: Captura Rápida (Quick Actions) — caixa de entrada.
    this.version(28).stores({
      capturas: 'id, criadoEm, status',
    })
    // v29: Rotinas (Hábitos e Rotinas) + histórico de execução.
    this.version(29).stores({
      rotinas: 'id, ordem, criadoEm',
      rotinaExecucoes: 'id, rotinaId, data',
    })
    // v30: Flashcards (Biblioteca) com repetição espaçada.
    this.version(30).stores({
      flashcards: 'id, livroId, proximaRevisao, criadoEm',
    })
  }
}

export const db = new VidaDB()

// Carimba `atualizadoEm` a cada escrita local (não nas aplicações vindas da
// nuvem) para o motor de sincronização detectar mudanças.
for (const nome of NOMES_SYNC) {
  const tabela = (db as unknown as Record<string, Table>)[nome]
  tabela.hook('creating', (pk, obj: Record<string, unknown>) => {
    if (deveIgnorarHooks()) return
    if (obj.atualizadoEm == null) obj.atualizadoEm = Date.now()
    // Marca a chave suja p/ a sync empurrar sem varrer o banco todo. Se a
    // chave não veio (raro; nenhuma tabela é auto-incremento), reconcilia tudo.
    if (pk != null) marcarSujo(nome, String(pk))
    else agendarReconciliacao()
  })
  tabela.hook('updating', (_mods, pk, _obj) => {
    if (deveIgnorarHooks()) return undefined
    marcarSujo(nome, String(pk))
    return { atualizadoEm: Date.now() }
  })
  tabela.hook('deleting', (pk) => {
    if (!deveIgnorarHooks()) marcarSujo(nome, String(pk))
  })
}

function blobParaBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve((leitor.result as string).split(',')[1] ?? '')
    leitor.onerror = () => reject(leitor.error)
    leitor.readAsDataURL(blob)
  })
}

function base64ParaBlob(base64: string, tipo: string): Blob {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: tipo })
}

/** Exporta todo o banco como objeto serializável (backup JSON, arquivos em base64). */
export async function exportarBackup() {
  const arquivos = await db.arquivos.toArray()
  const arquivosSerial = await Promise.all(
    arquivos.map(async (a) => ({
      id: a.id,
      nome: a.nome,
      tipo: a.tipo,
      tamanho: a.tamanho,
      criadoEm: a.criadoEm,
      dados: await blobParaBase64(a.blob),
    })),
  )
  const petArquivos = await db.petArquivos.toArray()
  const petArquivosSerial = await Promise.all(
    petArquivos.map(async (a) => ({
      id: a.id,
      nome: a.nome,
      tipo: a.tipo,
      tamanho: a.tamanho,
      criadoEm: a.criadoEm,
      dados: await blobParaBase64(a.blob),
    })),
  )
  const arquivosLivros = await db.arquivosLivros.toArray()
  const arquivosLivrosSerial = await Promise.all(
    arquivosLivros.map(async (a) => ({
      id: a.id,
      nome: a.nome,
      formato: a.formato,
      tamanho: a.tamanho,
      criadoEm: a.criadoEm,
      mime: a.blob.type || '',
      dados: await blobParaBase64(a.blob),
    })),
  )
  return {
    app: 'vida',
    versao: 10,
    exportadoEm: new Date().toISOString(),
    tasks: await db.tasks.toArray(),
    projetos: await db.projetos.toArray(),
    eventos: await db.eventos.toArray(),
    cronogramas: await db.cronogramas.toArray(),
    contextos: await db.contextos.toArray(),
    paginas: await db.paginas.toArray(),
    grupos: await db.grupos.toArray(),
    habitos: await db.habitos.toArray(),
    habitoRegistros: await db.habitoRegistros.toArray(),
    movimentos: await db.movimentos.toArray(),
    contas: await db.contas.toArray(),
    objetivos: await db.objetivos.toArray(),
    recorrentes: await db.recorrentes.toArray(),
    orcamentoLinhas: await db.orcamentoLinhas.toArray(),
    financasConfig: await db.financasConfig.toArray(),
    patrimonioSnapshots: await db.patrimonioSnapshots.toArray(),
    arquivos: arquivosSerial,
    humores: await db.humores.toArray(),
    registros: await db.registros.toArray(),
    humorTipos: await db.humorTipos.toArray(),
    categorias: await db.categorias.toArray(),
    fatores: await db.fatores.toArray(),
    saude: await db.saude.toArray(),
    saudeMedidas: await db.saudeMedidas.toArray(),
    atividades: await db.atividades.toArray(),
    refeicoes: await db.refeicoes.toArray(),
    profissionais: await db.profissionais.toArray(),
    consultas: await db.consultas.toArray(),
    medicamentos: await db.medicamentos.toArray(),
    medicamentoTomadas: await db.medicamentoTomadas.toArray(),
    exames: await db.exames.toArray(),
    vacinas: await db.vacinas.toArray(),
    doacoesSangue: await db.doacoesSangue.toArray(),
    saudeConfig: await db.saudeConfig.toArray(),
    livros: await db.livros.toArray(),
    notasLivro: await db.notasLivro.toArray(),
    destaques: await db.destaques.toArray(),
    categoriasHabito: await db.categoriasHabito.toArray(),
    pets: await db.pets.toArray(),
    petPesos: await db.petPesos.toArray(),
    petVacinas: await db.petVacinas.toArray(),
    petConsultas: await db.petConsultas.toArray(),
    petCondicoes: await db.petCondicoes.toArray(),
    petMedicamentos: await db.petMedicamentos.toArray(),
    petAlimentos: await db.petAlimentos.toArray(),
    petItens: await db.petItens.toArray(),
    petCuidados: await db.petCuidados.toArray(),
    petCuidadoRegistros: await db.petCuidadoRegistros.toArray(),
    petFotos: await db.petFotos.toArray(),
    petDocumentos: await db.petDocumentos.toArray(),
    petArquivos: petArquivosSerial,
    arquivosLivros: arquivosLivrosSerial,
    comprasListas: await db.comprasListas.toArray(),
    comprasItens: await db.comprasItens.toArray(),
    despensa: await db.despensa.toArray(),
    despensaHistorico: await db.despensaHistorico.toArray(),
    aquisicoes: await db.aquisicoes.toArray(),
    aquisicaoPrecos: await db.aquisicaoPrecos.toArray(),
    comprasConfig: await db.comprasConfig.toArray(),
    lugares: await db.lugares.toArray(),
    perfil: await db.perfil.toArray(),
    projetoItens: await db.projetoItens.toArray(),
    capturas: await db.capturas.toArray(),
    rotinas: await db.rotinas.toArray(),
    rotinaExecucoes: await db.rotinaExecucoes.toArray(),
    flashcards: await db.flashcards.toArray(),
  }
}

interface ArquivoSerial {
  id: string
  nome: string
  tipo: string
  tamanho: number
  criadoEm: number
  dados: string
}

interface ArquivoLivroSerial {
  id: string
  nome: string
  formato: ArquivoLivro['formato']
  tamanho: number
  criadoEm: number
  mime: string
  dados: string
}

/** Restaura um backup gerado por exportarBackup (mescla por id). */
export async function importarBackup(json: unknown) {
  const dados = json as {
    app?: string
    tasks?: Task[]
    projetos?: Projeto[]
    eventos?: Evento[]
    cronogramas?: Cronograma[]
    contextos?: Contexto[]
    paginas?: Pagina[]
    grupos?: Grupo[]
    habitos?: Habito[]
    habitoRegistros?: HabitoRegistro[]
    movimentos?: Movimento[]
    contas?: Conta[]
    objetivos?: Objetivo[]
    recorrentes?: Recorrente[]
    orcamentoLinhas?: OrcamentoLinha[]
    financasConfig?: FinancasConfig[]
    patrimonioSnapshots?: PatrimonioSnapshot[]
    arquivos?: ArquivoSerial[]
    humores?: HumorRegistro[]
    registros?: Registro[]
    humorTipos?: HumorTipo[]
    categorias?: Categoria[]
    fatores?: Fator[]
    saude?: SaudeDia[]
    saudeMedidas?: Medida[]
    atividades?: Atividade[]
    refeicoes?: Refeicao[]
    profissionais?: Profissional[]
    consultas?: Consulta[]
    medicamentos?: Medicamento[]
    medicamentoTomadas?: MedicamentoTomada[]
    exames?: Exame[]
    vacinas?: Vacina[]
    doacoesSangue?: DoacaoSangue[]
    saudeConfig?: SaudeConfig[]
    livros?: Livro[]
    notasLivro?: NotaLivro[]
    destaques?: Destaque[]
    categoriasHabito?: CategoriaHabito[]
    pets?: Pet[]
    petPesos?: PetPeso[]
    petVacinas?: PetVacina[]
    petConsultas?: PetConsulta[]
    petCondicoes?: PetCondicao[]
    petMedicamentos?: PetMedicamento[]
    petAlimentos?: PetAlimento[]
    petItens?: PetItem[]
    petCuidados?: PetCuidado[]
    petCuidadoRegistros?: PetCuidadoRegistro[]
    petFotos?: PetFoto[]
    petDocumentos?: PetDocumento[]
    petArquivos?: ArquivoSerial[]
    arquivosLivros?: ArquivoLivroSerial[]
    comprasListas?: ListaCompra[]
    comprasItens?: ItemCompra[]
    despensa?: ItemDespensa[]
    despensaHistorico?: MovDespensa[]
    aquisicoes?: Aquisicao[]
    aquisicaoPrecos?: PrecoAquisicao[]
    comprasConfig?: ComprasConfig[]
    lugares?: Lugar[]
    perfil?: Perfil[]
    projetoItens?: ItemProjeto[]
    capturas?: Captura[]
    rotinas?: Rotina[]
    rotinaExecucoes?: ExecucaoRotina[]
    flashcards?: Flashcard[]
  }
  const temTasks = Array.isArray(dados?.tasks)
  const temPaginas = Array.isArray(dados?.paginas)
  const temHabitos = Array.isArray(dados?.habitos)
  const temMovimentos = Array.isArray(dados?.movimentos)
  if (dados?.app !== 'vida' || (!temTasks && !temPaginas && !temHabitos && !temMovimentos)) {
    throw new Error('Arquivo de backup inválido')
  }

  // Só grava registros que são objetos com a chave primária presente — um
  // registro malformado no arquivo não corrompe a tabela nem aborta o import.
  const ok = <T,>(arr: T[] | undefined, chave = 'id'): T[] =>
    Array.isArray(arr)
      ? arr.filter((r): r is T => !!r && typeof r === 'object' && (r as Record<string, unknown>)[chave] != null)
      : []

  // Anexos: reconstrói o Blob a partir do base64, tolerante a dado corrompido
  // (um blob inválido é pulado, não derruba o restante da restauração).
  const blobsArquivo = (arr: ArquivoSerial[] | undefined) =>
    ok(arr).flatMap((a) => {
      try {
        return [{ id: a.id, nome: a.nome, tipo: a.tipo, tamanho: a.tamanho, criadoEm: a.criadoEm, blob: base64ParaBlob(a.dados, a.tipo) }]
      } catch { return [] }
    })
  const blobsLivro = (arr: ArquivoLivroSerial[] | undefined) =>
    ok(arr).flatMap((a) => {
      try {
        return [{ id: a.id, nome: a.nome, formato: a.formato, tamanho: a.tamanho, criadoEm: a.criadoEm, blob: base64ParaBlob(a.dados, a.mime || '') }]
      } catch { return [] }
    })

  // Tudo numa transação só: ou o backup inteiro entra, ou nada muda (uma falha
  // no meio não deixa o banco pela metade). `bulkPut([])` é no-op, então tabela
  // ausente no arquivo fica intocada, como antes.
  await db.transaction('rw', db.tables, async () => {
    await db.tasks.bulkPut(ok(dados.tasks))
    await db.projetos.bulkPut(ok(dados.projetos))
    await db.eventos.bulkPut(ok(dados.eventos))
    await db.cronogramas.bulkPut(ok(dados.cronogramas))
    await db.contextos.bulkPut(ok(dados.contextos))
    await db.paginas.bulkPut(ok(dados.paginas))
    await db.grupos.bulkPut(ok(dados.grupos))
    await db.habitos.bulkPut(ok(dados.habitos))
    await db.habitoRegistros.bulkPut(ok(dados.habitoRegistros))
    await db.movimentos.bulkPut(ok(dados.movimentos))
    await db.contas.bulkPut(ok(dados.contas))
    await db.objetivos.bulkPut(ok(dados.objetivos))
    await db.recorrentes.bulkPut(ok(dados.recorrentes))
    await db.orcamentoLinhas.bulkPut(ok(dados.orcamentoLinhas))
    await db.financasConfig.bulkPut(ok(dados.financasConfig))
    await db.patrimonioSnapshots.bulkPut(ok(dados.patrimonioSnapshots, 'mes'))
    await db.arquivos.bulkPut(blobsArquivo(dados.arquivos))
    await db.humores.bulkPut(ok(dados.humores))
    await db.registros.bulkPut(ok(dados.registros))
    await db.humorTipos.bulkPut(ok(dados.humorTipos, 'nivel'))
    await db.categorias.bulkPut(ok(dados.categorias))
    await db.fatores.bulkPut(ok(dados.fatores))
    await db.saude.bulkPut(ok(dados.saude))
    await db.saudeMedidas.bulkPut(ok(dados.saudeMedidas))
    await db.atividades.bulkPut(ok(dados.atividades))
    await db.refeicoes.bulkPut(ok(dados.refeicoes))
    await db.profissionais.bulkPut(ok(dados.profissionais))
    await db.consultas.bulkPut(ok(dados.consultas))
    await db.medicamentos.bulkPut(ok(dados.medicamentos))
    await db.medicamentoTomadas.bulkPut(ok(dados.medicamentoTomadas))
    await db.exames.bulkPut(ok(dados.exames))
    await db.vacinas.bulkPut(ok(dados.vacinas))
    await db.doacoesSangue.bulkPut(ok(dados.doacoesSangue))
    await db.saudeConfig.bulkPut(ok(dados.saudeConfig))
    await db.livros.bulkPut(ok(dados.livros))
    await db.notasLivro.bulkPut(ok(dados.notasLivro))
    await db.destaques.bulkPut(ok(dados.destaques))
    await db.categoriasHabito.bulkPut(ok(dados.categoriasHabito))
    await db.pets.bulkPut(ok(dados.pets))
    await db.petPesos.bulkPut(ok(dados.petPesos))
    await db.petVacinas.bulkPut(ok(dados.petVacinas))
    await db.petConsultas.bulkPut(ok(dados.petConsultas))
    await db.petCondicoes.bulkPut(ok(dados.petCondicoes))
    await db.petMedicamentos.bulkPut(ok(dados.petMedicamentos))
    await db.petAlimentos.bulkPut(ok(dados.petAlimentos))
    await db.petItens.bulkPut(ok(dados.petItens))
    await db.petCuidados.bulkPut(ok(dados.petCuidados))
    await db.petCuidadoRegistros.bulkPut(ok(dados.petCuidadoRegistros))
    await db.petFotos.bulkPut(ok(dados.petFotos))
    await db.petDocumentos.bulkPut(ok(dados.petDocumentos))
    await db.petArquivos.bulkPut(blobsArquivo(dados.petArquivos))
    await db.arquivosLivros.bulkPut(blobsLivro(dados.arquivosLivros))
    await db.comprasListas.bulkPut(ok(dados.comprasListas))
    await db.comprasItens.bulkPut(ok(dados.comprasItens))
    await db.despensa.bulkPut(ok(dados.despensa))
    await db.despensaHistorico.bulkPut(ok(dados.despensaHistorico))
    await db.aquisicoes.bulkPut(ok(dados.aquisicoes))
    await db.aquisicaoPrecos.bulkPut(ok(dados.aquisicaoPrecos))
    await db.comprasConfig.bulkPut(ok(dados.comprasConfig))
    await db.lugares.bulkPut(ok(dados.lugares))
    await db.perfil.bulkPut(ok(dados.perfil))
    await db.projetoItens.bulkPut(ok(dados.projetoItens))
    await db.capturas.bulkPut(ok(dados.capturas))
    await db.rotinas.bulkPut(ok(dados.rotinas))
    await db.rotinaExecucoes.bulkPut(ok(dados.rotinaExecucoes))
    await db.flashcards.bulkPut(ok(dados.flashcards))
  })
  agendarReconciliacao() // varre tudo no próximo ciclo → empurra a restauração
  return {
    tasks: dados.tasks?.length ?? 0,
    paginas: dados.paginas?.length ?? 0,
    habitos: dados.habitos?.length ?? 0,
    movimentos: dados.movimentos?.length ?? 0,
  }
}
