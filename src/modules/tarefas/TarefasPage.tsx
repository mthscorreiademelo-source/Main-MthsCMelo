import { useMemo, useState } from 'react'
import { EmptyState } from '../../core/components/EmptyState'
import { IconCaixaEntrada, IconCheckCircle } from '../../core/components/Icons'
import { hojeISO } from '../../core/dates'
import { QuickAdd } from './components/QuickAdd'
import { TaskEditorSheet } from './components/TaskEditorSheet'
import { TaskList } from './components/TaskList'
import {
  filtrarConcluidas,
  filtrarHoje,
  filtrarPendentes,
  filtrarProximas,
} from './db'
import { useTarefas } from './hooks'
import type { Task } from './types'

type Aba = 'hoje' | 'proximas' | 'todas' | 'concluidas'

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'hoje', rotulo: 'Hoje' },
  { id: 'proximas', rotulo: 'Próximas' },
  { id: 'todas', rotulo: 'Todas' },
  { id: 'concluidas', rotulo: 'Concluídas' },
]

export function TarefasPage() {
  const tarefas = useTarefas()
  const [aba, setAba] = useState<Aba>('hoje')
  const [selecionada, setSelecionada] = useState<Task | null>(null)

  const listas = useMemo(() => {
    const todas = tarefas ?? []
    return {
      hoje: filtrarHoje(todas),
      proximas: filtrarProximas(todas),
      todas: filtrarPendentes(todas),
      concluidas: filtrarConcluidas(todas),
    }
  }, [tarefas])

  const vazios: Record<Aba, { titulo: string; descricao: string }> = {
    hoje: { titulo: 'Nada para hoje', descricao: 'Adicione uma tarefa ou aproveite o dia livre.' },
    proximas: { titulo: 'Nada agendado', descricao: 'Tarefas com data futura aparecem aqui.' },
    todas: { titulo: 'Tudo limpo', descricao: 'Nenhuma tarefa pendente no momento.' },
    concluidas: { titulo: 'Nada concluído ainda', descricao: 'As tarefas finalizadas ficam guardadas aqui.' },
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <QuickAdd
        dataPadrao={aba === 'hoje' ? hojeISO() : undefined}
        placeholder={aba === 'hoje' ? 'Adicionar tarefa para hoje…' : 'Adicionar tarefa…'}
      />

      <nav className="flex gap-1 overflow-x-auto" aria-label="Filtros de tarefas">
        {ABAS.map((a) => {
          const ativa = aba === a.id
          const qtd = listas[a.id].length
          return (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3.5 text-sm font-medium transition-colors ${
                ativa ? 'bg-hover text-ink' : 'text-muted hover:bg-hover/60'
              }`}
            >
              {a.rotulo}
              {qtd > 0 && (
                <span className={`text-xs ${ativa ? 'text-muted' : 'text-muted/60'}`}>
                  {qtd}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {tarefas && (
        <TaskList
          tarefas={listas[aba]}
          onAbrir={setSelecionada}
          ocultarData={aba === 'hoje'}
          vazio={
            <EmptyState
              icone={aba === 'concluidas' ? <IconCheckCircle /> : <IconCaixaEntrada />}
              titulo={vazios[aba].titulo}
              descricao={vazios[aba].descricao}
            />
          }
        />
      )}

      <TaskEditorSheet task={selecionada} onFechar={() => setSelecionada(null)} />
    </div>
  )
}
