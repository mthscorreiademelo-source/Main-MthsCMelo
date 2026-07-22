import { lazy, type ComponentType, type SVGProps } from 'react'
import {
  IconCalendario,
  IconCarrinho,
  IconChama,
  IconCheckCircle,
  IconCifrao,
  IconDocumento,
  IconHumor,
  IconLivro,
  IconLocal,
  IconPasta,
  IconPata,
  IconSaude,
  IconSol,
} from './components/Icons'
// A Hoje é a tela inicial — fica no bundle principal para pintar na hora.
import { HojePage } from '../modules/hoje/HojePage'

/**
 * Carrega uma página sob demanda (code-splitting por rota). As páginas usam
 * export NOMEADO, então mapeamos para `default` que o React.lazy espera. Cada
 * módulo vira um chunk separado — o download inicial passa a ser só Hoje + shell,
 * e Finanças/Saúde/Biblioteca/etc. só chegam quando o usuário abre.
 */
function tela(loader: () => Promise<Record<string, unknown>>, nome: string): ComponentType {
  return lazy(() => loader().then((m) => ({ default: m[nome] as ComponentType }))) as unknown as ComponentType
}

const TarefasPage = tela(() => import('../modules/tarefas/TarefasPage'), 'TarefasPage')
const NotasPage = tela(() => import('../modules/notas/NotasPage'), 'NotasPage')
const EditorNotaPage = tela(() => import('../modules/notas/EditorNotaPage'), 'EditorNotaPage')
const GrupoPage = tela(() => import('../modules/notas/GrupoPage'), 'GrupoPage')
const AgendaPage = tela(() => import('../modules/agenda/AgendaPage'), 'AgendaPage')
const HabitosPage = tela(() => import('../modules/habitos/HabitosPage'), 'HabitosPage')
const HabitoDetalhePage = tela(() => import('../modules/habitos/HabitoDetalhePage'), 'HabitoDetalhePage')
const HabitosEstatisticasPage = tela(() => import('../modules/habitos/HabitosEstatisticasPage'), 'HabitosEstatisticasPage')
const HumorPage = tela(() => import('../modules/humor/HumorPage'), 'HumorPage')
const SaudePage = tela(() => import('../modules/saude/SaudePage'), 'SaudePage')
const FinancasPage = tela(() => import('../modules/financas/FinancasPage'), 'FinancasPage')
const BibliotecaPage = tela(() => import('../modules/biblioteca/BibliotecaPage'), 'BibliotecaPage')
const LivroPage = tela(() => import('../modules/biblioteca/LivroPage'), 'LivroPage')
const CompiladoPage = tela(() => import('../modules/biblioteca/CompiladoPage'), 'CompiladoPage')
const LeitorPage = tela(() => import('../modules/biblioteca/leitor/LeitorPage'), 'LeitorPage')
const ProjetosPage = tela(() => import('../modules/projetos/ProjetosPage'), 'ProjetosPage')
const PetsPage = tela(() => import('../modules/pets/PetsPage'), 'PetsPage')
const PetWorkspacePage = tela(() => import('../modules/pets/PetWorkspacePage'), 'PetWorkspacePage')
const ComprasPage = tela(() => import('../modules/compras/ComprasPage'), 'ComprasPage')
const ItemDespensaPage = tela(() => import('../modules/compras/ItemDespensaPage'), 'ItemDespensaPage')
const AquisicaoPage = tela(() => import('../modules/compras/AquisicaoPage'), 'AquisicaoPage')
const LugaresPage = tela(() => import('../modules/lugares/LugaresPage'), 'LugaresPage')

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
  },
  {
    id: 'agenda',
    nome: 'Agenda',
    rota: '/agenda',
    Icone: IconCalendario,
    Pagina: AgendaPage,
  },
  {
    id: 'notas',
    nome: 'Notas e Cadernos',
    rota: '/notas',
    Icone: IconDocumento,
    Pagina: NotasPage,
    subRotas: [
      { caminho: '/notas/grupo/:id', Pagina: GrupoPage },
      { caminho: '/notas/:id', Pagina: EditorNotaPage },
    ],
  },
  {
    id: 'habitos',
    nome: 'Hábitos e Rotinas',
    rota: '/habitos',
    Icone: IconChama,
    Pagina: HabitosPage,
    subRotas: [
      { caminho: '/habitos/estatisticas', Pagina: HabitosEstatisticasPage },
      { caminho: '/habitos/:id', Pagina: HabitoDetalhePage },
    ],
  },
  {
    id: 'humor',
    nome: 'Humor',
    rota: '/humor',
    Icone: IconHumor,
    Pagina: HumorPage,
    telaCheia: true,
  },
  {
    id: 'saude',
    nome: 'Saúde',
    rota: '/saude',
    Icone: IconSaude,
    Pagina: SaudePage,
  },
  {
    id: 'financas',
    nome: 'Finanças',
    rota: '/financas',
    Icone: IconCifrao,
    Pagina: FinancasPage,
  },
  {
    id: 'biblioteca',
    nome: 'Biblioteca',
    rota: '/biblioteca',
    Icone: IconLivro,
    Pagina: BibliotecaPage,
    subRotas: [
      { caminho: '/biblioteca/compilado/:id', Pagina: CompiladoPage },
      { caminho: '/biblioteca/:id/ler', Pagina: LeitorPage },
      { caminho: '/biblioteca/:id', Pagina: LivroPage },
    ],
  },
  {
    id: 'projetos',
    nome: 'Projetos',
    rota: '/projetos',
    Icone: IconPasta,
    Pagina: ProjetosPage,
    subRotas: [{ caminho: '/projetos/:id', Pagina: ProjetosPage }],
  },
  {
    id: 'pets',
    nome: 'Pets',
    rota: '/pets',
    Icone: IconPata,
    Pagina: PetsPage,
    subRotas: [{ caminho: '/pets/:id', Pagina: PetWorkspacePage }],
  },
  {
    id: 'compras',
    nome: 'Compras',
    rota: '/compras',
    Icone: IconCarrinho,
    Pagina: ComprasPage,
    subRotas: [
      { caminho: '/compras/despensa/:id', Pagina: ItemDespensaPage },
      { caminho: '/compras/aquisicao/:id', Pagina: AquisicaoPage },
    ],
  },
  {
    id: 'lugares',
    nome: 'Lugares',
    rota: '/lugares',
    Icone: IconLocal,
    Pagina: LugaresPage,
  },
]
