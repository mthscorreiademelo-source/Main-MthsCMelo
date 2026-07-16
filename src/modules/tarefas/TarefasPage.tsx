import { useMemo, useState } from 'react'
import { EmptyState } from '../../core/components/EmptyState'
import {
  IconCaixaEntrada,
  IconCalendario,
  IconCheckCircle,
  IconMais,
  IconSol,
} from '../../core/components/Icons'
import { hojeISO, rotuloData } from '../../core/dates'
import { QuickAdd } from './components/QuickAdd'
import { TaskEditorSheet } from './components/TaskEditorSheet'
import { TaskList } from './components/TaskList'
import { EditorProjeto } from './components/EditorProjeto'
import {
  filtrarConcluidas,
  filtrarEntrada,
  filtrarHoje,
  filtrarProjeto,
  filtrarProximas,
} from './db'
import { useProjetos, useTarefas } from './hooks'
import type { Projeto, Task } from './types'

type Visao = 'hoje' | 'proximas' | 'entrada' | 'concluidas' | { projeto: string }

function chaveVisao(v: Visao): string {
  return typeof v === 'string' ? v : `projeto:${v.projeto}`
}

export function TarefasPage() {
  const tarefas = useTarefas()
  const projetos = useProjetos()
  const [visao, setVisao] = useState<Visao>('hoje')
  const [selecionada, setSelecionada] = useState<Task | null>(null)
  const [editorProjeto, setEditorProjeto] = useState<Projeto | null | undefined>(undefined)

  const todas = useMemo(() => tarefas ?? [], [tarefas])
  const ps = projetos ?? []

  const listas = useMemo(
    () => ({
      hoje: filtrarHoje(todas),
      proximas: filtrarProximas(todas),
      entrada: filtrarEntrada(todas),
      concluidas: filtrarConcluidas(todas),
    }),
    [todas],
  )

  const projetoAtual = typeof visao === 'object' ? ps.find((p) => p.id === visao.projeto) : undefined
  const listaProjeto = projetoAtual ? filtrarProjeto(todas, projetoAtual.id) : []

  const contagem = (p: Projeto) => todas.filter((t) => !t.concluidaEm && t.projetoId === p.id && !t.paiId).length

  const smart: { id: Visao; rotulo: string; Icone: typeof IconSol; qtd: number }[] = [
    { id: 'hoje', rotulo: 'Hoje', Icone: IconSol, qtd: listas.hoje.length },
    { id: 'proximas', rotulo: 'Próximas', Icone: IconCalendario, qtd: listas.proximas.length },
    { id: 'entrada', rotulo: 'Entrada', Icone: IconCaixaEntrada, qtd: listas.entrada.length },
    { id: 'concluidas', rotulo: 'Concluídas', Icone: IconCheckCircle, qtd: 0 },
  ]

  const vKey = chaveVisao(visao)
  const ehProjeto = typeof visao === 'object'

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      {/* Navegação de visões */}
      <nav className="flex flex-wrap gap-1.5" aria-label="Visões de tarefas">
        {smart.map((s) => {
          const ativa = vKey === chaveVisao(s.id)
          return (
            <button
              key={chaveVisao(s.id)}
              onClick={() => setVisao(s.id)}
              className={`flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium transition-colors ${
                ativa ? 'bg-ink text-surface' : 'bg-hover text-muted hover:text-ink'
              }`}
            >
              <s.Icone width={15} height={15} />
              {s.rotulo}
              {s.qtd > 0 && <span className={ativa ? 'opacity-70' : 'text-muted/70'}>{s.qtd}</span>}
            </button>
          )
        })}
      </nav>

      {/* Projetos */}
      <div className="flex flex-wrap items-center gap-1.5">
        {ps.map((p) => {
          const ativa = ehProjeto && (visao as { projeto: string }).projeto === p.id
          return (
            <button
              key={p.id}
              onClick={() => setVisao({ projeto: p.id })}
              onDoubleClick={() => setEditorProjeto(p)}
              className={`flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium transition-colors ${
                ativa ? 'bg-ink text-surface' : 'bg-hover text-muted hover:text-ink'
              }`}
            >
              <span className="size-2.5 rounded-full" style={{ backgroundColor: p.cor ?? 'var(--vida-muted)' }} />
              {p.nome}
              {contagem(p) > 0 && <span className={ativa ? 'opacity-70' : 'text-muted/70'}>{contagem(p)}</span>}
            </button>
          )
        })}
        <button
          onClick={() => setEditorProjeto(null)}
          className="flex min-h-9 items-center gap-1 rounded-full border border-dashed border-line px-3 text-[13px] text-muted transition-colors hover:text-ink"
        >
          <IconMais width={14} height={14} /> Projeto
        </button>
      </div>

      {/* Cabeçalho do projeto (com editar) */}
      {ehProjeto && projetoAtual && (
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <span className="size-3 rounded-full" style={{ backgroundColor: projetoAtual.cor ?? 'var(--vida-muted)' }} />
            {projetoAtual.nome}
          </h1>
          <button onClick={() => setEditorProjeto(projetoAtual)} className="text-[13px] text-muted hover:text-ink">
            Editar
          </button>
        </div>
      )}

      {/* Quick add (some na visão Concluídas) */}
      {visao !== 'concluidas' && (
        <QuickAdd
          projetos={ps}
          dataPadrao={visao === 'hoje' ? hojeISO() : undefined}
          projetoPadrao={ehProjeto ? (visao as { projeto: string }).projeto : undefined}
          placeholder={visao === 'hoje' ? 'Adicionar tarefa para hoje…' : 'Adicionar tarefa…'}
        />
      )}

      {/* Conteúdo */}
      {tarefas && (
        <Conteudo
          visao={visao}
          listas={listas}
          listaProjeto={listaProjeto}
          todas={todas}
          projetos={ps}
          onAbrir={setSelecionada}
        />
      )}

      <TaskEditorSheet task={selecionada} projetos={ps} todas={todas} onFechar={() => setSelecionada(null)} />
      <EditorProjeto
        projeto={editorProjeto}
        onFechar={() => setEditorProjeto(undefined)}
        onCriado={(id) => setVisao({ projeto: id })}
      />
    </div>
  )
}

function Conteudo({
  visao,
  listas,
  listaProjeto,
  todas,
  projetos,
  onAbrir,
}: {
  visao: Visao
  listas: { hoje: Task[]; proximas: Task[]; entrada: Task[]; concluidas: Task[] }
  listaProjeto: Task[]
  todas: Task[]
  projetos: Projeto[]
  onAbrir: (t: Task) => void
}) {
  const comum = { todas, projetos, onAbrir }

  if (typeof visao === 'object') {
    return (
      <TaskList
        {...comum}
        tarefas={listaProjeto}
        aninhar
        vazio={<EmptyState icone={<IconCheckCircle />} titulo="Projeto vazio" descricao="Adicione a primeira tarefa deste projeto." />}
      />
    )
  }

  if (visao === 'proximas') {
    // Agrupado por dia.
    const grupos = new Map<string, Task[]>()
    for (const t of listas.proximas) {
      const arr = grupos.get(t.data!) ?? []
      arr.push(t)
      grupos.set(t.data!, arr)
    }
    if (grupos.size === 0) {
      return <EmptyState icone={<IconCalendario />} titulo="Nada agendado" descricao="Tarefas com data futura aparecem aqui." />
    }
    return (
      <div className="flex flex-col gap-4">
        {[...grupos.entries()].map(([dia, tks]) => (
          <section key={dia} className="flex flex-col gap-1">
            <h2 className="px-1 text-[13px] font-semibold text-muted">{rotuloData(dia)}</h2>
            <TaskList {...comum} tarefas={tks} ocultarData mostrarProjeto vazio={null} />
          </section>
        ))}
      </div>
    )
  }

  if (visao === 'concluidas') {
    return (
      <TaskList
        {...comum}
        tarefas={listas.concluidas}
        mostrarProjeto
        vazio={<EmptyState icone={<IconCheckCircle />} titulo="Nada concluído ainda" descricao="As tarefas finalizadas ficam guardadas aqui." />}
      />
    )
  }

  if (visao === 'entrada') {
    return (
      <TaskList
        {...comum}
        tarefas={listas.entrada}
        aninhar
        vazio={<EmptyState icone={<IconCaixaEntrada />} titulo="Entrada vazia" descricao="Tarefas sem projeto aparecem aqui." />}
      />
    )
  }

  // hoje
  return (
    <TaskList
      {...comum}
      tarefas={listas.hoje}
      ocultarData
      mostrarProjeto
      vazio={<EmptyState icone={<IconSol />} titulo="Nada para hoje" descricao="Adicione uma tarefa ou aproveite o dia livre." />}
    />
  )
}
