import type { ComponentType, SVGProps } from 'react'
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
import { HojePage } from '../modules/hoje/HojePage'
import { TarefasPage } from '../modules/tarefas/TarefasPage'
import { NotasPage } from '../modules/notas/NotasPage'
import { EditorNotaPage } from '../modules/notas/EditorNotaPage'
import { GrupoPage } from '../modules/notas/GrupoPage'
import { AgendaPage } from '../modules/agenda/AgendaPage'
import { HabitosPage } from '../modules/habitos/HabitosPage'
import { HabitoDetalhePage } from '../modules/habitos/HabitoDetalhePage'
import { HabitosEstatisticasPage } from '../modules/habitos/HabitosEstatisticasPage'
import { HumorPage } from '../modules/humor/HumorPage'
import { SaudePage } from '../modules/saude/SaudePage'
import { FinancasPage } from '../modules/financas/FinancasPage'
import { BibliotecaPage } from '../modules/biblioteca/BibliotecaPage'
import { LivroPage } from '../modules/biblioteca/LivroPage'
import { CompiladoPage } from '../modules/biblioteca/CompiladoPage'
import { LeitorPage } from '../modules/biblioteca/leitor/LeitorPage'
import { ProjetosPage } from '../modules/projetos/ProjetosPage'
import { PetsPage } from '../modules/pets/PetsPage'
import { PetWorkspacePage } from '../modules/pets/PetWorkspacePage'
import { ComprasPage } from '../modules/compras/ComprasPage'
import { ItemDespensaPage } from '../modules/compras/ItemDespensaPage'
import { AquisicaoPage } from '../modules/compras/AquisicaoPage'
import { LugaresPage } from '../modules/lugares/LugaresPage'

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
