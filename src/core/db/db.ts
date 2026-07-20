import Dexie, { type Table } from 'dexie'
import type { Projeto, Task } from '../../modules/tarefas/types'
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
import type { ArquivoLivro, Livro } from '../../modules/biblioteca/types'
import type { Contexto, Cronograma, Evento } from '../../modules/agenda/types'

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
  /** Arquivos dos livros (blobs) — locais, não sincronizam. */
  arquivosLivros!: Table<ArquivoLivro, string>
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
  return {
    app: 'vida',
    versao: 8,
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
    categoriasHabito: await db.categoriasHabito.toArray(),
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
    categoriasHabito?: CategoriaHabito[]
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
  if (Array.isArray(dados.categoriasHabito)) await db.categoriasHabito.bulkPut(dados.categoriasHabito)
  return {
    tasks: dados.tasks?.length ?? 0,
    paginas: dados.paginas?.length ?? 0,
    habitos: dados.habitos?.length ?? 0,
    movimentos: dados.movimentos?.length ?? 0,
  }
}
