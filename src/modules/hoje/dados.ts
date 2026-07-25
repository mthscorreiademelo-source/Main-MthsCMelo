import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/db'
import { hojeISO } from '../../core/dates'
import type { Evento } from '../agenda/types'
import { eventosDoDia } from '../agenda/db'
import { useEventos } from '../agenda/hooks'
import type { Task, Projeto } from '../tarefas/types'
import { estaAtrasada, filtrarHoje } from '../tarefas/db'
import { useProjetos, useTarefas } from '../tarefas/hooks'
import { indicadoresDia } from '../tarefas/execucao'
import { useHabitos, useRegistros as useRegistrosHabitos } from '../habitos/hooks'
import { resumoDoDia } from '../habitos/progresso'
import { useHumorTipos, useRegistros as useRegistrosHumor } from '../humor/hooks'
import { registrosDoDia as registrosHumorDoDia } from '../humor/humor'
import type { HumorTipo, Registro } from '../humor/types'
import type { Atividade, SaudeDia } from '../saude/types'
import { useAtividades, useSaudeConfig, useSaudeDia } from '../saude/hooks'
import {
  useContas,
  useFinancasConfig,
  useMovimentos,
  useObjetivos,
  useRecorrentes,
} from '../financas/hooks'
import { orcamentoInteligente } from '../financas/orcamento'
import type { OrcamentoInteligente } from '../financas/orcamento'
import { formatarBRL } from '../financas/db'
import { useLivros } from '../biblioteca/hooks'
import type { Pagina } from '../notas/types'
import { usePaginas } from '../notas/hooks'
import { emojiEspecie } from '../pets/db'
import { catInfo, diasRestantes, statusValidade } from '../compras/db'
import type { ItemDespensa, MovDespensa } from '../compras/types'
import type { Alerta } from './alertas'
import { construirAlertas, temAlertaAlta } from './alertas'
import type { Faixa } from './agora'
import { faixaDoDia, hhmmParaMin, minutosDoDia, useAgora } from './agora'
import type { Modo } from './modo'
import { modoDoMomento } from './modo'
import type { ModoComposicao } from './composicao'
import { modoComposicao } from './composicao'
import type { ContagemSemana, FocoDoDia, ProgressoProjeto } from './calculos'
import {
  diasDaSemana,
  eventosDaSemana,
  focoDoDia,
  projetosEmAndamento,
  tarefasDaSemana,
} from './calculos'

type Livro = NonNullable<ReturnType<typeof useLivros>>[number]

export interface DespensaAlerta {
  id: string
  nome: string
  icone: string
  motivo: string
}
export interface PetPendente {
  id: string
  nome: string
  emoji: string
  pendentes: number
  total: number
}

export interface ResumoHabitos {
  feitos: number
  total: number
  fracao: number
}

/** Tudo que os cards do Hoje precisam, já carregado e derivado. */
export interface DadosHoje {
  agora: Date
  hoje: string
  agoraMin: number
  horaAgora: string
  faixa: Faixa
  modo: Modo
  modoComp: ModoComposicao

  eventos: Evento[]
  eventosHoje: Evento[]
  cronologicos: Evento[]
  atual?: Evento
  proximo?: Evento
  eventosAmanha: Evento[]

  tarefas: Task[]
  tarefasHoje: Task[]
  atrasadas: number
  indicadores: { feitas: number; total: number; tempoRestanteMin: number }

  projetos: Projeto[]
  foco: FocoDoDia | null
  projetosAndamento: ProgressoProjeto[]

  resumoHabitos: ResumoHabitos
  semana: { tarefas: ContagemSemana; eventos: ContagemSemana; habitos: ContagemSemana }

  orc: OrcamentoInteligente | null
  gastoHoje: number

  saudeHoje?: SaudeDia
  metaAgua: number
  aguaMl: number
  atividadesHoje: Atividade[]

  humorTipos: HumorTipo[]
  humorHoje: Registro[]

  livroLendo?: Livro
  paginas: Pagina[]

  despensaAlertas: DespensaAlerta[]
  petsPendentes: PetPendente[]

  alertas: Alerta[]
  temAlertaAlta: boolean
  /** Há sinais de trabalho hoje (evento/tarefa de projeto)? — usado no selo. */
  temTrabalho: boolean

  carregando: boolean
}

function amanhaISO(base: Date): string {
  const d = new Date(base)
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Carrega e deriva TODO o estado do Hoje num só lugar. Os cards recebem este
 * objeto e usam só o que precisam; um card sem dado simplesmente não aparece.
 */
export function useDadosHoje(): DadosHoje {
  const agora = useAgora()
  const hoje = hojeISO()
  const faixa = faixaDoDia(agora)
  const agoraMin = minutosDoDia(agora)
  const horaAgora = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`

  const eventos = useEventos()
  const tarefas = useTarefas()
  const projetos = useProjetos()
  const habitos = useHabitos()
  const regHabitos = useRegistrosHabitos()
  const regHumor = useRegistrosHumor()
  const humorTipos = useHumorTipos()
  const saudeHoje = useSaudeDia(hoje)
  const saudeConfig = useSaudeConfig()
  const atividades = useAtividades()
  const movimentos = useMovimentos()
  const contas = useContas()
  const recorrentes = useRecorrentes()
  const objetivos = useObjetivos()
  const financasConfig = useFinancasConfig()
  const livros = useLivros()
  const paginas = usePaginas()

  // Pets: cuidados de hoje ainda pendentes, por pet.
  const petsPendentes = useLiveQuery(async () => {
    const dia = agora.getDay()
    const pets = await db.pets.filter((p) => p.status !== 'arquivado').toArray()
    const out: PetPendente[] = []
    for (const p of pets) {
      const cuidados = await db.petCuidados.where('petId').equals(p.id).toArray()
      const doDia = cuidados.filter(
        (c) => c.ativo && (!c.dias || c.dias.length === 0 || c.dias.includes(dia)),
      )
      if (doDia.length === 0) continue
      const regs = await db.petCuidadoRegistros
        .where('petId')
        .equals(p.id)
        .filter((r) => r.data === hoje && r.feito)
        .toArray()
      const feitos = new Set(regs.map((r) => r.cuidadoId))
      const pendentes = doDia.filter((c) => !feitos.has(c.id)).length
      if (pendentes > 0)
        out.push({
          id: p.id,
          nome: p.nome,
          emoji: p.emoji ?? emojiEspecie(p.especie),
          pendentes,
          total: doDia.length,
        })
    }
    return out
  }, [hoje])

  // Compras: itens da despensa provavelmente acabando ou vencendo.
  const despensaAlertas = useLiveQuery(async () => {
    const itens = (await db.despensa.toArray()) as ItemDespensa[]
    if (itens.length === 0) return []
    const hist = await db.despensaHistorico.toArray()
    const mapa: Record<string, MovDespensa[]> = {}
    for (const m of hist) (mapa[m.despensaId] ??= []).push(m)
    const out: DespensaAlerta[] = []
    for (const i of itens) {
      const dias = i.monitorarIA === false ? null : diasRestantes(i, mapa[i.id] ?? [])
      const val = statusValidade(i)
      if (dias != null && dias <= 3)
        out.push({ id: i.id, nome: i.nome, icone: catInfo(i.categoria).icone, motivo: `~${dias} ${dias === 1 ? 'dia' : 'dias'}` })
      else if (i.nivelAprox === 'quase_vazio' && i.monitorarIA !== false)
        out.push({ id: i.id, nome: i.nome, icone: catInfo(i.categoria).icone, motivo: 'quase acabando' })
      else if (['vencido', 'hoje'].includes(val))
        out.push({ id: i.id, nome: i.nome, icone: catInfo(i.categoria).icone, motivo: val === 'vencido' ? 'vencido' : 'vence hoje' })
    }
    return out.slice(0, 6)
  }, [hoje])

  /* --------------------------- Agenda derivada --------------------------- */
  const eventosHoje = useMemo(() => (eventos ? eventosDoDia(eventos, hoje) : []), [eventos, hoje])
  const cronologicos = useMemo(
    () => eventosHoje.filter((e) => !e.diaInteiro && hhmmParaMin(e.inicio) != null),
    [eventosHoje],
  )
  const atual = cronologicos.find((e) => {
    const i = hhmmParaMin(e.inicio)!
    const f = hhmmParaMin(e.fim) ?? i + 60
    return i <= agoraMin && agoraMin < f
  })
  const proximo = cronologicos.find((e) => hhmmParaMin(e.inicio)! > agoraMin)
  const eventosAmanha = useMemo(
    () => (eventos ? eventosDoDia(eventos, amanhaISO(agora)) : []),
    [eventos, agora],
  )

  /* --------------------------- Tarefas derivadas ------------------------- */
  const tarefasHoje = useMemo(() => (tarefas ? filtrarHoje(tarefas) : []), [tarefas])
  const atrasadas = tarefasHoje.filter(estaAtrasada).length
  const indicadores = useMemo(
    () => indicadoresDia(tarefas ?? [], hoje),
    [tarefas, hoje],
  )
  const foco = useMemo(
    () => (tarefas && projetos ? focoDoDia(tarefas, projetos, hoje) : null),
    [tarefas, projetos, hoje],
  )
  const projetosAndamento = useMemo(
    () => (tarefas && projetos ? projetosEmAndamento(tarefas, projetos) : []),
    [tarefas, projetos],
  )

  /* --------------------------- Hábitos + semana -------------------------- */
  const resumoHabitos = useMemo<ResumoHabitos>(() => {
    const r = resumoDoDia(habitos ?? [], regHabitos ?? [], hoje)
    return { feitos: r.feitos, total: r.total, fracao: r.fracao }
  }, [habitos, regHabitos, hoje])

  const semana = useMemo(() => {
    const dias = diasDaSemana(hoje)
    const habSemana = { feitos: 0, total: 0 }
    for (const dia of dias) {
      if (dia > hoje) continue
      const r = resumoDoDia(habitos ?? [], regHabitos ?? [], dia)
      habSemana.feitos += r.feitos
      habSemana.total += r.total
    }
    return {
      tarefas: tarefasDaSemana(tarefas ?? [], dias),
      eventos: eventosDaSemana(eventos ?? [], dias, hoje),
      habitos: habSemana,
    }
  }, [tarefas, eventos, habitos, regHabitos, hoje])

  /* ------------------------------ Finanças ------------------------------- */
  const financasConfiguradas = !!(
    financasConfig?.rendaMensalCentavos ||
    (contas && contas.length > 0)
  )
  const orc = useMemo(
    () =>
      financasConfiguradas && movimentos && contas && recorrentes && objetivos
        ? orcamentoInteligente({
            hoje,
            movimentos,
            contas,
            recorrentes,
            objetivos,
            eventos: eventos ?? [],
            config: financasConfig,
          })
        : null,
    [financasConfiguradas, movimentos, contas, recorrentes, objetivos, eventos, financasConfig, hoje],
  )
  const gastoHoje = (movimentos ?? [])
    .filter((m) => m.data === hoje && m.tipo === 'saida')
    .reduce((s, m) => s + m.valorCentavos, 0)

  /* -------------------------------- Saúde -------------------------------- */
  const metaAgua = saudeConfig?.metaAguaMl ?? 2000
  const aguaMl = saudeHoje?.aguaMl ?? 0
  const atividadesHoje = useMemo(
    () => (atividades ?? []).filter((a) => a.data === hoje),
    [atividades, hoje],
  )

  /* ------------------------------- Humor --------------------------------- */
  const humorHoje = useMemo(
    () => (regHumor ? registrosHumorDoDia(regHumor, hoje) : []),
    [regHumor, hoje],
  )

  /* ----------------------------- Biblioteca ------------------------------ */
  const livroLendo = (livros ?? [])
    .filter((l) => l.status === 'lendo' && !l.ehCompilado)
    .sort((a, b) => (b.atualizadoEm ?? b.adicionadoEm) - (a.atualizadoEm ?? a.adicionadoEm))[0]

  /* ------------------------------ Alertas -------------------------------- */
  const disponivelHoje = orc ? orc.disponivelHoje : null
  const alertas = useMemo(
    () =>
      construirAlertas({
        agoraMin,
        eventos: cronologicos.map((e) => ({
          id: e.id,
          titulo: e.titulo,
          inicioMin: hhmmParaMin(e.inicio)!,
        })),
        atrasadas,
        despensa: despensaAlertas ?? [],
        disponivelHoje,
        formatarBRL,
      }),
    [agoraMin, cronologicos, atrasadas, despensaAlertas, disponivelHoje],
  )
  const altos = temAlertaAlta(alertas)

  const temTrabalho =
    cronologicos.some((e) => e.categoria === 'trabalho') ||
    tarefasHoje.some((t) => !!t.projetoId)
  const modo = modoDoMomento(agora, { temAlertaAlta: altos, temTrabalho })
  const modoComp = modoComposicao(faixa, { temAlertaAlta: altos })

  const carregando = eventos === undefined && tarefas === undefined && habitos === undefined

  return {
    agora,
    hoje,
    agoraMin,
    horaAgora,
    faixa,
    modo,
    modoComp,
    eventos: eventos ?? [],
    eventosHoje,
    cronologicos,
    atual,
    proximo,
    eventosAmanha,
    tarefas: tarefas ?? [],
    tarefasHoje,
    atrasadas,
    indicadores,
    projetos: projetos ?? [],
    foco,
    projetosAndamento,
    resumoHabitos,
    semana,
    orc,
    gastoHoje,
    saudeHoje,
    metaAgua,
    aguaMl,
    atividadesHoje,
    humorTipos,
    humorHoje,
    livroLendo,
    paginas: paginas ?? [],
    despensaAlertas: despensaAlertas ?? [],
    petsPendentes: petsPendentes ?? [],
    alertas,
    temAlertaAlta: altos,
    temTrabalho,
    carregando,
  }
}
