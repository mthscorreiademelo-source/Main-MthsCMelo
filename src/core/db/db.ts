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
  }
}

export const db = new VidaDB()

// Carimba `atualizadoEm` a cada escrita local (não nas aplicações vindas da
// nuvem) para o motor de sincronização detectar mudanças.
for (const nome of NOMES_SYNC) {
  const tabela = (db as unknown as Record<string, Table>)[nome]
  tabela.hook('creating', (_pk, obj: Record<string, unknown>) => {
    if (!deveIgnorarHooks() && obj.atualizadoEm == null) obj.atualizadoEm = Date.now()
  })
  tabela.hook('updating', (_mods, _pk, _obj) => {
    if (deveIgnorarHooks()) return undefined
    return { atualizadoEm: Date.now() }
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
  return {
    app: 'vida',
    versao: 9,
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
  }
  const temTasks = Array.isArray(dados?.tasks)
  const temPaginas = Array.isArray(dados?.paginas)
  const temHabitos = Array.isArray(dados?.habitos)
  const temMovimentos = Array.isArray(dados?.movimentos)
  if (dados?.app !== 'vida' || (!temTasks && !temPaginas && !temHabitos && !temMovimentos)) {
    throw new Error('Arquivo de backup inválido')
  }
  if (temTasks) await db.tasks.bulkPut(dados.tasks!)
  if (Array.isArray(dados.projetos)) await db.projetos.bulkPut(dados.projetos)
  if (Array.isArray(dados.eventos)) await db.eventos.bulkPut(dados.eventos)
  if (Array.isArray(dados.cronogramas)) await db.cronogramas.bulkPut(dados.cronogramas)
  if (Array.isArray(dados.contextos)) await db.contextos.bulkPut(dados.contextos)
  if (temPaginas) await db.paginas.bulkPut(dados.paginas!)
  if (Array.isArray(dados.grupos)) await db.grupos.bulkPut(dados.grupos)
  if (temHabitos) await db.habitos.bulkPut(dados.habitos!)
  if (Array.isArray(dados.habitoRegistros)) {
    await db.habitoRegistros.bulkPut(dados.habitoRegistros)
  }
  if (temMovimentos) await db.movimentos.bulkPut(dados.movimentos!)
  if (Array.isArray(dados.contas)) await db.contas.bulkPut(dados.contas)
  if (Array.isArray(dados.objetivos)) await db.objetivos.bulkPut(dados.objetivos)
  if (Array.isArray(dados.recorrentes)) await db.recorrentes.bulkPut(dados.recorrentes)
  if (Array.isArray(dados.orcamentoLinhas)) await db.orcamentoLinhas.bulkPut(dados.orcamentoLinhas)
  if (Array.isArray(dados.financasConfig)) await db.financasConfig.bulkPut(dados.financasConfig)
  if (Array.isArray(dados.patrimonioSnapshots)) await db.patrimonioSnapshots.bulkPut(dados.patrimonioSnapshots)
  if (Array.isArray(dados.arquivos)) {
    await db.arquivos.bulkPut(
      dados.arquivos.map((a) => ({
        id: a.id,
        nome: a.nome,
        tipo: a.tipo,
        tamanho: a.tamanho,
        criadoEm: a.criadoEm,
        blob: base64ParaBlob(a.dados, a.tipo),
      })),
    )
  }
  if (Array.isArray(dados.humores)) await db.humores.bulkPut(dados.humores)
  if (Array.isArray(dados.registros)) await db.registros.bulkPut(dados.registros)
  if (Array.isArray(dados.humorTipos)) await db.humorTipos.bulkPut(dados.humorTipos)
  if (Array.isArray(dados.categorias)) await db.categorias.bulkPut(dados.categorias)
  if (Array.isArray(dados.fatores)) await db.fatores.bulkPut(dados.fatores)
  if (Array.isArray(dados.saude)) await db.saude.bulkPut(dados.saude)
  if (Array.isArray(dados.saudeMedidas)) await db.saudeMedidas.bulkPut(dados.saudeMedidas)
  if (Array.isArray(dados.atividades)) await db.atividades.bulkPut(dados.atividades)
  if (Array.isArray(dados.refeicoes)) await db.refeicoes.bulkPut(dados.refeicoes)
  if (Array.isArray(dados.profissionais)) await db.profissionais.bulkPut(dados.profissionais)
  if (Array.isArray(dados.consultas)) await db.consultas.bulkPut(dados.consultas)
  if (Array.isArray(dados.medicamentos)) await db.medicamentos.bulkPut(dados.medicamentos)
  if (Array.isArray(dados.medicamentoTomadas)) await db.medicamentoTomadas.bulkPut(dados.medicamentoTomadas)
  if (Array.isArray(dados.exames)) await db.exames.bulkPut(dados.exames)
  if (Array.isArray(dados.vacinas)) await db.vacinas.bulkPut(dados.vacinas)
  if (Array.isArray(dados.doacoesSangue)) await db.doacoesSangue.bulkPut(dados.doacoesSangue)
  if (Array.isArray(dados.saudeConfig)) await db.saudeConfig.bulkPut(dados.saudeConfig)
  if (Array.isArray(dados.livros)) await db.livros.bulkPut(dados.livros)
  if (Array.isArray(dados.notasLivro)) await db.notasLivro.bulkPut(dados.notasLivro)
  if (Array.isArray(dados.destaques)) await db.destaques.bulkPut(dados.destaques)
  if (Array.isArray(dados.categoriasHabito)) await db.categoriasHabito.bulkPut(dados.categoriasHabito)
  if (Array.isArray(dados.pets)) await db.pets.bulkPut(dados.pets)
  if (Array.isArray(dados.petPesos)) await db.petPesos.bulkPut(dados.petPesos)
  if (Array.isArray(dados.petVacinas)) await db.petVacinas.bulkPut(dados.petVacinas)
  if (Array.isArray(dados.petConsultas)) await db.petConsultas.bulkPut(dados.petConsultas)
  if (Array.isArray(dados.petCondicoes)) await db.petCondicoes.bulkPut(dados.petCondicoes)
  if (Array.isArray(dados.petMedicamentos)) await db.petMedicamentos.bulkPut(dados.petMedicamentos)
  if (Array.isArray(dados.petAlimentos)) await db.petAlimentos.bulkPut(dados.petAlimentos)
  if (Array.isArray(dados.petItens)) await db.petItens.bulkPut(dados.petItens)
  if (Array.isArray(dados.petCuidados)) await db.petCuidados.bulkPut(dados.petCuidados)
  if (Array.isArray(dados.petCuidadoRegistros)) await db.petCuidadoRegistros.bulkPut(dados.petCuidadoRegistros)
  if (Array.isArray(dados.petFotos)) await db.petFotos.bulkPut(dados.petFotos)
  if (Array.isArray(dados.petDocumentos)) await db.petDocumentos.bulkPut(dados.petDocumentos)
  if (Array.isArray(dados.petArquivos)) {
    await db.petArquivos.bulkPut(
      dados.petArquivos.map((a) => ({
        id: a.id,
        nome: a.nome,
        tipo: a.tipo,
        tamanho: a.tamanho,
        criadoEm: a.criadoEm,
        blob: base64ParaBlob(a.dados, a.tipo),
      })),
    )
  }
  if (Array.isArray(dados.comprasListas)) await db.comprasListas.bulkPut(dados.comprasListas)
  if (Array.isArray(dados.comprasItens)) await db.comprasItens.bulkPut(dados.comprasItens)
  if (Array.isArray(dados.despensa)) await db.despensa.bulkPut(dados.despensa)
  if (Array.isArray(dados.despensaHistorico)) await db.despensaHistorico.bulkPut(dados.despensaHistorico)
  if (Array.isArray(dados.aquisicoes)) await db.aquisicoes.bulkPut(dados.aquisicoes)
  if (Array.isArray(dados.aquisicaoPrecos)) await db.aquisicaoPrecos.bulkPut(dados.aquisicaoPrecos)
  if (Array.isArray(dados.comprasConfig)) await db.comprasConfig.bulkPut(dados.comprasConfig)
  if (Array.isArray(dados.lugares)) await db.lugares.bulkPut(dados.lugares)
  if (Array.isArray(dados.perfil)) await db.perfil.bulkPut(dados.perfil)
  if (Array.isArray(dados.projetoItens)) await db.projetoItens.bulkPut(dados.projetoItens)
  if (Array.isArray(dados.capturas)) await db.capturas.bulkPut(dados.capturas)
  if (Array.isArray(dados.rotinas)) await db.rotinas.bulkPut(dados.rotinas)
  if (Array.isArray(dados.rotinaExecucoes)) await db.rotinaExecucoes.bulkPut(dados.rotinaExecucoes)
  return {
    tasks: dados.tasks?.length ?? 0,
    paginas: dados.paginas?.length ?? 0,
    habitos: dados.habitos?.length ?? 0,
    movimentos: dados.movimentos?.length ?? 0,
  }
}
