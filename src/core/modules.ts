import type { ComponentType, SVGProps } from 'react'
import {
  IconCalendario,
  IconChama,
  IconCheckCircle,
  IconCifrao,
  IconDocumento,
  IconHumor,
  IconLivro,
  IconSaude,
  IconSol,
} from './components/Icons'
import { HojePage } from '../modules/hoje/HojePage'
import { TarefasPage } from '../modules/tarefas/TarefasPage'
import { NotasPage } from '../modules/notas/NotasPage'
import { EditorNotaPage } from '../modules/notas/EditorNotaPage'
import { GrupoPage } from '../modules/notas/GrupoPage'
import { AgendaPage } from '../modules/agenda/AgendaPage'
import { HabitosPage } from '../modules/habitos/HabitosPage'
import { HabitoDetalhePage } from '../modules/habitos/HabitoDetalhePage'
import { HabitosEstatisticasPage } from '../modules/habitos/HabitosEstatisticasPage'
import { HabitosHoje } from '../modules/habitos/components/HabitosHoje'
import { HumorPage } from '../modules/humor/HumorPage'
import { SaudePage } from '../modules/saude/SaudePage'
import { FinancasPage } from '../modules/financas/FinancasPage'
import { BibliotecaPage } from '../modules/biblioteca/BibliotecaPage'
import { LivroPage } from '../modules/biblioteca/LivroPage'
import { LeitorPage } from '../modules/biblioteca/leitor/LeitorPage'
import { SecaoHoje as TarefasHoje } from '../modules/tarefas/SecaoHoje'
import { SecaoHoje as NotasHoje } from '../modules/notas/SecaoHoje'
import { SecaoHoje as HumorHoje } from '../modules/humor/SecaoHoje'
import { SecaoHoje as SaudeHoje } from '../modules/saude/SecaoHoje'
import { SecaoHoje as FinancasHoje } from '../modules/financas/SecaoHoje'
import { SecaoHoje as BibliotecaHoje } from '../modules/biblioteca/SecaoHoje'
import { SecaoHoje as AgendaHoje } from '../modules/agenda/SecaoHoje'
import { HojeResumo as TarefasResumo } from '../modules/tarefas/HojeResumo'
import { HojeResumo as AgendaResumo } from '../modules/agenda/HojeResumo'
import { HojeResumo as HabitosResumo } from '../modules/habitos/HojeResumo'
import { HojeResumo as HumorResumo } from '../modules/humor/HojeResumo'
import { HojeResumo as SaudeResumo } from '../modules/saude/HojeResumo'

export interface ModuloDef {
  id: string
  nome: string
  rota: string
  Icone: ComponentType<SVGProps<SVGSVGElement>>
  Pagina: ComponentType
  /** Rotas internas do módulo (ex.: detalhe/editor), fora da sidebar. */
  subRotas?: { caminho: string; Pagina: ComponentType }[]
  /** Módulo gerencia o próprio layout (sem padding/scroll do shell). */
  telaCheia?: boolean
  /**
   * Contribuição do módulo para o dashboard Hoje. O Hoje compõe todas as
   * seções registradas — módulo novo aparece sozinho, sem tocar no Hoje.
   * Retorne null quando não houver nada relevante no dia.
   */
  SecaoHoje?: ComponentType
  /** Mini-tile glanceável do "cockpit" no topo do Hoje (null se nada). */
  HojeResumo?: ComponentType
  /** Peso do cartão na grade do Hoje: 'destaque' (ancora o topo) ou 'compacto'. */
  hojeTamanho?: 'destaque' | 'compacto'
}

/**
 * Registro central de módulos ("áreas da vida").
 * Para adicionar um módulo novo: crie a pasta em src/modules/, a página,
 * a tabela no schema Dexie (se precisar de dados) e uma entrada aqui.
 */
export const MODULOS: ModuloDef[] = [
  { id: 'hoje', nome: 'Hoje', rota: '/', Icone: IconSol, Pagina: HojePage },
  {
    id: 'tarefas',
    nome: 'Tarefas',
    rota: '/tarefas',
    Icone: IconCheckCircle,
    Pagina: TarefasPage,
    SecaoHoje: TarefasHoje,
    HojeResumo: TarefasResumo,
    hojeTamanho: 'destaque',
  },
  {
    id: 'agenda',
    nome: 'Agenda',
    rota: '/agenda',
    Icone: IconCalendario,
    Pagina: AgendaPage,
    SecaoHoje: AgendaHoje,
    HojeResumo: AgendaResumo,
    hojeTamanho: 'compacto',
  },
  {
    id: 'notas',
    nome: 'Notas',
    rota: '/notas',
    Icone: IconDocumento,
    Pagina: NotasPage,
    subRotas: [
      { caminho: '/notas/grupo/:id', Pagina: GrupoPage },
      { caminho: '/notas/:id', Pagina: EditorNotaPage },
    ],
    SecaoHoje: NotasHoje,
    hojeTamanho: 'compacto',
  },
  {
    id: 'habitos',
    nome: 'Hábitos',
    rota: '/habitos',
    Icone: IconChama,
    Pagina: HabitosPage,
    subRotas: [
      { caminho: '/habitos/estatisticas', Pagina: HabitosEstatisticasPage },
      { caminho: '/habitos/:id', Pagina: HabitoDetalhePage },
    ],
    SecaoHoje: HabitosHoje,
    HojeResumo: HabitosResumo,
    hojeTamanho: 'destaque',
  },
  {
    id: 'humor',
    nome: 'Humor',
    rota: '/humor',
    Icone: IconHumor,
    Pagina: HumorPage,
    telaCheia: true,
    SecaoHoje: HumorHoje,
    HojeResumo: HumorResumo,
    hojeTamanho: 'compacto',
  },
  {
    id: 'saude',
    nome: 'Saúde',
    rota: '/saude',
    Icone: IconSaude,
    Pagina: SaudePage,
    SecaoHoje: SaudeHoje,
    HojeResumo: SaudeResumo,
    hojeTamanho: 'compacto',
  },
  {
    id: 'financas',
    nome: 'Finanças',
    rota: '/financas',
    Icone: IconCifrao,
    Pagina: FinancasPage,
    SecaoHoje: FinancasHoje,
    hojeTamanho: 'compacto',
  },
  {
    id: 'biblioteca',
    nome: 'Biblioteca',
    rota: '/biblioteca',
    Icone: IconLivro,
    Pagina: BibliotecaPage,
    subRotas: [
      { caminho: '/biblioteca/:id/ler', Pagina: LeitorPage },
      { caminho: '/biblioteca/:id', Pagina: LivroPage },
    ],
    SecaoHoje: BibliotecaHoje,
    hojeTamanho: 'compacto',
  },
]
