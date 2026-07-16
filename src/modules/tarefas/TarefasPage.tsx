import { useMemo, useState } from 'react'
import { EmptyState } from '../../core/components/EmptyState'
import {
  IconCaixaEntrada,
  IconCalendario,
  IconCheckCircle,
  IconEtiqueta,
  IconLupa,
  IconMais,
  IconSol,
} from '../../core/components/Icons'
import { hojeISO, rotuloData } from '../../core/dates'
import { QuickAdd } from './components/QuickAdd'
import { TaskEditorSheet } from './components/TaskEditorSheet'
import { TaskList } from './components/TaskList'
import { EditorProjeto } from './components/EditorProjeto'
import { CalendarioTarefas } from './components/CalendarioTarefas'
import {
  buscar,
  filtrarConcluidas,
  filtrarEntrada,
  filtrarHoje,
  filtrarLabel,
  filtrarProjeto,
  filtrarProximas,
  todasLabels,
} from './db'
import { useProjetos, useTarefas } from './hooks'
import type { Projeto, Task } from './types'

type Visao =
  | 'hoje'
  | 'proximas'
  | 'entrada'
  | 'concluidas'
  | 'calendario'
  | { projeto: string }
  | { label: string }

function chaveVisao(v: Visao): string {
  if (typeof v === 'string') return v
  return 'projeto' in v ? `projeto:${v.projeto}` : `label:${v.label}`
}

export function TarefasPage() {
  const tarefas = useTarefas()
  const projetos = useProjetos()
  const [visao, setVisao] = useState<Visao>('hoje')
  const [selecionada, setSelecionada] = useState<Task | null>(null)
  const [editorProjeto, setEditorProjeto] = useState<Projeto | null | undefined>(undefined)
  const [busca, setBusca] = useState('')
  const [buscaAberta, setBuscaAberta] = useState(false)

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
  const labels = useMemo(() => todasLabels(todas), [todas])
  const resultadosBusca = useMemo(() => (busca.trim() ? buscar(todas, busca) : []), [todas, busca])

  const projetoAtual = typeof visao === 'object' && 'projeto' in visao ? ps.find((p) => p.id === visao.projeto) : undefined
  const labelAtual = typeof visao === 'object' && 'label' in visao ? visao.label : undefined
  const listaProjeto = projetoAtual ? filtrarProjeto(todas, projetoAtual.id) : []
  const listaLabel = labelAtual ? filtrarLabel(todas, labelAtual) : []

  const contagem = (p: Projeto) => todas.filter((t) => !t.concluidaEm && t.projetoId === p.id && !t.paiId).length

  const smart: { id: Visao; rotulo: string; Icone: typeof IconSol; qtd: number }[] = [
    { id: 'hoje', rotulo: 'Hoje', Icone: IconSol, qtd: listas.hoje.length },
    { id: 'proximas', rotulo: 'Próximas', Icone: IconCalendario, qtd: listas.proximas.length },
    { id: 'entrada', rotulo: 'Entrada', Icone: IconCaixaEntrada, qtd: listas.entrada.length },
    { id: 'calendario', rotulo: 'Calendário', Icone: IconCalendario, qtd: 0 },
    { id: 'concluidas', rotulo: 'Concluídas', Icone: IconCheckCircle, qtd: 0 },
  ]

  const vKey = chaveVisao(visao)
  const ehProjeto = !!projetoAtual
  const emBusca = buscaAberta && !!busca.trim()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      {/* Navegação de visões + busca */}
      <div className="flex items-start gap-2">
        <nav className="flex flex-1 flex-wrap gap-1.5" aria-label="Visões de tarefas">
          {smart.map((s) => {
            const ativa = !emBusca && vKey === chaveVisao(s.id)
            return (
              <button
                key={chaveVisao(s.id)}
                onClick={() => {
                  setVisao(s.id)
                  setBuscaAberta(false)
                }}
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
        <button
          onClick={() => setBuscaAberta((v) => !v)}
          aria-label="Buscar"
          className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-colors ${
            buscaAberta ? 'bg-ink text-surface' : 'text-muted hover:bg-hover hover:text-ink'
          }`}
        >
          <IconLupa width={17} height={17} />
        </button>
      </div>

      {buscaAberta && (
        <input
          autoFocus
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar tarefas, etiquetas…"
          className="min-h-11 rounded-xl border border-line bg-surface/60 px-4 text-[15px] outline-none focus:border-muted/50"
        />
      )}

      {/* Projetos + etiquetas */}
      {!emBusca && (
        <div className="flex flex-wrap items-center gap-1.5">
          {ps.map((p) => {
            const ativa = ehProjeto && projetoAtual!.id === p.id
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

          {labels.map(({ label, qtd }) => {
            const ativa = labelAtual === label
            return (
              <button
                key={label}
                onClick={() => setVisao({ label })}
                className={`flex min-h-9 items-center gap-1 rounded-full px-3 text-[13px] font-medium transition-colors ${
                  ativa ? 'bg-ink text-surface' : 'bg-hover/70 text-muted hover:text-ink'
                }`}
              >
                <IconEtiqueta width={13} height={13} />
                {label}
                <span className={ativa ? 'opacity-70' : 'text-muted/70'}>{qtd}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Cabeçalho do projeto/etiqueta */}
      {!emBusca && ehProjeto && projetoAtual && (
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
      {!emBusca && labelAtual && (
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <IconEtiqueta width={18} height={18} className="text-muted" />
          {labelAtual}
        </h1>
      )}

      {/* Quick add (só nas visões de lista) */}
      {!emBusca && visao !== 'concluidas' && visao !== 'calendario' && (
        <QuickAdd
          projetos={ps}
          dataPadrao={visao === 'hoje' ? hojeISO() : undefined}
          projetoPadrao={ehProjeto ? projetoAtual!.id : undefined}
          placeholder={visao === 'hoje' ? 'Adicionar tarefa para hoje…' : 'Adicionar tarefa…'}
        />
      )}

      {/* Conteúdo */}
      {tarefas &&
        (emBusca ? (
          <TaskList
            tarefas={resultadosBusca}
            todas={todas}
            projetos={ps}
            onAbrir={setSelecionada}
            mostrarProjeto
            vazio={<EmptyState icone={<IconLupa />} titulo="Nada encontrado" descricao="Tente outro termo, etiqueta ou palavra do título." />}
          />
        ) : (
          <Conteudo
            visao={visao}
            listas={listas}
            listaProjeto={listaProjeto}
            listaLabel={listaLabel}
            todas={todas}
            projetos={ps}
            onAbrir={setSelecionada}
          />
        ))}

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
  listaLabel,
  todas,
  projetos,
  onAbrir,
}: {
  visao: Visao
  listas: { hoje: Task[]; proximas: Task[]; entrada: Task[]; concluidas: Task[] }
  listaProjeto: Task[]
  listaLabel: Task[]
  todas: Task[]
  projetos: Projeto[]
  onAbrir: (t: Task) => void
}) {
  const comum = { todas, projetos, onAbrir }

  if (typeof visao === 'object' && 'projeto' in visao) {
    return (
      <TaskList
        {...comum}
        tarefas={listaProjeto}
        aninhar
        arrastavel
        vazio={<EmptyState icone={<IconCheckCircle />} titulo="Projeto vazio" descricao="Adicione a primeira tarefa deste projeto." />}
      />
    )
  }

  if (typeof visao === 'object' && 'label' in visao) {
    return (
      <TaskList
        {...comum}
        tarefas={listaLabel}
        mostrarProjeto
        vazio={<EmptyState icone={<IconEtiqueta />} titulo="Sem tarefas com esta etiqueta" descricao="Adicione a etiqueta a uma tarefa no editor." />}
      />
    )
  }

  if (visao === 'calendario') {
    return <CalendarioTarefas tarefas={todas} todas={todas} projetos={projetos} onAbrir={onAbrir} />
  }

  if (visao === 'proximas') {
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
        arrastavel
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
