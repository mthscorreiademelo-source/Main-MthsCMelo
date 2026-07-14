import type { ComponentType, SVGProps } from 'react'
import { IconCheckCircle, IconDocumento, IconSol } from './components/Icons'
import { HojePage } from '../modules/hoje/HojePage'
import { TarefasPage } from '../modules/tarefas/TarefasPage'
import { NotasPage } from '../modules/notas/NotasPage'
import { EditorNotaPage } from '../modules/notas/EditorNotaPage'

export interface ModuloDef {
  id: string
  nome: string
  rota: string
  Icone: ComponentType<SVGProps<SVGSVGElement>>
  Pagina: ComponentType
  /** Rotas internas do módulo (ex.: detalhe/editor), fora da sidebar. */
  subRotas?: { caminho: string; Pagina: ComponentType }[]
}

/**
 * Registro central de módulos ("áreas da vida").
 * Para adicionar um módulo novo: crie a pasta em src/modules/, a página,
 * a tabela no schema Dexie (se precisar de dados) e uma entrada aqui.
 */
export const MODULOS: ModuloDef[] = [
  { id: 'hoje', nome: 'Hoje', rota: '/', Icone: IconSol, Pagina: HojePage },
  { id: 'tarefas', nome: 'Tarefas', rota: '/tarefas', Icone: IconCheckCircle, Pagina: TarefasPage },
  {
    id: 'notas',
    nome: 'Notas',
    rota: '/notas',
    Icone: IconDocumento,
    Pagina: NotasPage,
    subRotas: [{ caminho: '/notas/:id', Pagina: EditorNotaPage }],
  },
]
