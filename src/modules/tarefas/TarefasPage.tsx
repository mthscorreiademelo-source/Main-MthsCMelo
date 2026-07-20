import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EmptyState } from '../../core/components/EmptyState'
import {
  IconBandeira,
  IconCaixaEntrada,
  IconCalendario,
  IconCheckCircle,
  IconEtiqueta,
  IconLupa,
  IconMais,
  IconSol,
} from '../../core/components/Icons'
import { hojeISO, rotuloData } from '../../core/dates'
import { paraHHMM } from '../agenda/db'
import { useEventos } from '../agenda/hooks'
import { CalendarioTarefas } from './components/CalendarioTarefas'
import { EditorProjeto } from './components/EditorProjeto'
import { QuickAdd } from './components/QuickAdd'
import { TaskEditorSheet } from './components/TaskEditorSheet'
import { TaskList } from './components/TaskList'
import {
  atualizarTarefa,
  buscar,
  corPrioridade,
  estaAtrasada,
  estaPendente,
  filtrarConcluidas,
  filtrarEntrada,
  filtrarHoje,
  filtrarLabel,
  filtrarProjeto,
  filtrarProximas,
  todasLabels,
} from './db'
import {
  focoDoDia,
  indicadoresDia,
  insightsTarefas,
  janelasLivres,
  ordenarInteligente,
  prioridadeMaxima,
  resumoMes,
  sugerirBloco,
} from './execucao'
import { useProjetos, useTarefas } from './hooks'
import type { Projeto, Task } from './types'

type Aba = 'hoje' | 'proximas' | 'atrasadas' | 'tudo'
const CARTAO = 'rounded-2xl border border-line bg-surface/50 p-4'
const ROTULO = 'text-[11px] font-semibold uppercase tracking-wide text-muted'

function fmtTempo(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

export function TarefasPage() {
  const tarefas = useTarefas()
  const projetos = useProjetos()
  const eventos = useEventos()
  const [aba, setAba] = useState<Aba>('hoje')
  const [selecionada, setSelecionada] = useState<Task | null>(null)
  const [editorProjeto, setEditorProjeto] = useState<Projeto | null | undefined>(undefined)
  const [busca, setBusca] = useState('')
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [quickAberto, setQuickAberto] = useState(false)
  const [ordInteligente, setOrdInteligente] = useState(true)
  const [subTudo, setSubTudo] = useState<'entrada' | 'concluidas' | 'calendario' | { projeto: string } | { label: string }>('entrada')

  const todas = useMemo(() => tarefas ?? [], [tarefas])
  const ps = projetos ?? []
  const hoje = hojeISO()
  const evs = useMemo(() => eventos ?? [], [eventos])

  const listaHoje = useMemo(() => filtrarHoje(todas), [todas])
  const listaProximas = useMemo(() => filtrarProximas(todas), [todas])
  const atrasadas = useMemo(() => todas.filter((t) => !t.paiId && estaPendente(t) && estaAtrasada(t)), [todas])
  const labels = useMemo(() => todasLabels(todas), [todas])

  const ind = useMemo(() => indicadoresDia(todas, hoje), [todas, hoje])
  const foco = useMemo(() => focoDoDia(todas, ps, hoje), [todas, ps, hoje])
  const pmax = useMemo(() => prioridadeMaxima(todas, hoje), [todas, hoje])
  const resumo = useMemo(() => resumoMes(todas, hoje.slice(0, 7)), [todas, hoje])
  const insights = useMemo(() => insightsTarefas({ todas, hoje, eventos: evs }), [todas, hoje, evs])

  const gapsHoje = useMemo(() => janelasLivres(evs, todas, hoje), [evs, todas, hoje])
  const sugPmax = pmax && !pmax.blocoData ? sugerirBloco(pmax, gapsHoje) : undefined

  const hojeOrd = useMemo(() => (ordInteligente ? ordenarInteligente(listaHoje, hoje, todas) : listaHoje), [ordInteligente, listaHoje, hoje, todas])

  const feitasFrac = ind.total > 0 ? ind.feitas / ind.total : 0
  const emBusca = buscaAberta && !!busca.trim()
  const resultadosBusca = useMemo(() => (busca.trim() ? buscar(todas, busca) : []), [todas, busca])

  function reservarBloco() {
    if (pmax && sugPmax) atualizarTarefa(pmax.id, { blocoData: hoje, blocoInicio: paraHHMM(sugPmax.inicioMin) })
  }

  const indicadores = [
    {
      rot: 'Minhas tarefas de hoje',
      corpo: (
        <>
          <div className="flex items-end gap-2">
            <span className="text-[34px] font-bold leading-none">{ind.feitas}</span>
            <span className="pb-1 text-[13px] text-muted">de {ind.total} concluídas</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-hover">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${feitasFrac * 100}%` }} />
          </div>
        </>
      ),
    },
    {
      rot: 'Tempo estimado restante',
      corpo: (
        <>
          <div className="flex items-baseline gap-1"><span className="text-[30px] font-bold leading-none">{fmtTempo(ind.tempoRestanteMin)}</span></div>
          <div className="mt-1 text-[12px] text-muted">nas tarefas pendentes de hoje</div>
        </>
      ),
    },
    {
      rot: 'Foco do dia',
      corpo: foco ? (
        <>
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full" style={{ backgroundColor: foco.projeto.cor ?? 'var(--vida-accent)' }} />
            <span className="text-[18px] font-bold leading-tight">{foco.projeto.nome}</span>
          </div>
          <div className="mt-1 text-[12px] text-muted">o projeto que mais pede atenção</div>
        </>
      ) : <div className="text-[13px] text-muted">Sem projeto em destaque hoje.</div>,
    },
    {
      rot: 'Prioridade máxima',
      corpo: pmax ? (
        <>
          <button onClick={() => setSelecionada(pmax)} className="flex items-start gap-2 text-left">
            <IconBandeira width={16} height={16} style={{ color: corPrioridade(pmax.prioridade) }} className="mt-0.5 shrink-0" />
            <span className="text-[15px] font-semibold leading-tight line-clamp-2">{pmax.titulo}</span>
          </button>
          {sugPmax && (
            <button onClick={reservarBloco} className="mt-2 rounded-full bg-accent/12 px-2.5 py-1 text-[11.5px] font-medium text-accent hover:bg-accent/20">
              Reservar {fmtTempo(pmax.duracaoMin ?? 30)} às {paraHHMM(sugPmax.inicioMin)}
            </button>
          )}
        </>
      ) : <div className="text-[13px] text-muted">Nada pendente. 🎉</div>,
    },
  ]

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-[22px] font-bold">Tarefas</h1>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setQuickAberto((v) => !v)} className="flex min-h-9 items-center gap-1.5 rounded-full bg-accent px-3.5 text-[14px] font-medium text-white">
            <IconMais width={16} height={16} /> Nova tarefa
          </button>
          <button onClick={() => setBuscaAberta((v) => !v)} aria-label="Buscar" className={`flex size-9 items-center justify-center rounded-full transition-colors ${buscaAberta ? 'bg-ink text-surface' : 'text-muted hover:bg-hover hover:text-ink'}`}>
            <IconLupa width={17} height={17} />
          </button>
        </div>
      </div>

      {buscaAberta && (
        <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar tarefas, etiquetas…" className="min-h-11 rounded-xl border border-line bg-surface/60 px-4 text-[15px] outline-none focus:border-muted/50" />
      )}
      {quickAberto && <QuickAdd projetos={ps} dataPadrao={hoje} placeholder="Adicionar tarefa…" />}

      {emBusca ? (
        <TaskList tarefas={resultadosBusca} todas={todas} projetos={ps} onAbrir={setSelecionada} mostrarProjeto vazio={<EmptyState icone={<IconLupa />} titulo="Nada encontrado" descricao="Tente outro termo ou etiqueta." />} />
      ) : (
        <>
          {/* Indicadores */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {indicadores.map((c) => (
              <div key={c.rot} className={CARTAO}>
                <span className={ROTULO}>{c.rot}</span>
                <div className="mt-2">{c.corpo}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.7fr_1fr]">
            {/* Coluna principal */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1 rounded-full bg-hover p-0.5">
                  {([['hoje', 'Hoje'], ['proximas', 'Próximas'], ['atrasadas', 'Atrasadas'], ['tudo', 'Tudo']] as const).map(([id, r]) => (
                    <button key={id} onClick={() => setAba(id)} className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium transition-colors ${aba === id ? 'bg-ink text-surface' : 'text-muted hover:text-ink'}`}>
                      {r}
                      {id === 'atrasadas' && atrasadas.length > 0 && <span className="rounded-full bg-danger px-1.5 text-[10px] font-bold text-white">{atrasadas.length}</span>}
                    </button>
                  ))}
                </div>
                {aba === 'hoje' && (
                  <button onClick={() => setOrdInteligente((v) => !v)} className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[12px] font-medium text-muted hover:text-ink" title="Alternar ordenação">
                    {ordInteligente ? '✦ Inteligente' : '↕ Manual'}
                  </button>
                )}
              </div>

              {aba === 'hoje' && (
                <div className={CARTAO}>
                  <TaskList tarefas={hojeOrd} todas={todas} projetos={ps} onAbrir={setSelecionada} ocultarData mostrarProjeto vazio={<EmptyState icone={<IconSol />} titulo="Nada para hoje" descricao="Adicione uma tarefa ou aproveite o dia livre." />} />
                </div>
              )}
              {aba === 'proximas' && <ProximasView listas={listaProximas} todas={todas} projetos={ps} onAbrir={setSelecionada} />}
              {aba === 'atrasadas' && (
                <div className={CARTAO}>
                  <TaskList tarefas={ordenarInteligente(atrasadas, hoje, todas)} todas={todas} projetos={ps} onAbrir={setSelecionada} mostrarProjeto vazio={<EmptyState icone={<IconCheckCircle />} titulo="Nada atrasado" descricao="Você está em dia. 🎉" />} />
                </div>
              )}
              {aba === 'tudo' && (
                <TudoView
                  sub={subTudo}
                  setSub={setSubTudo}
                  projetos={ps}
                  labels={labels}
                  todas={todas}
                  onAbrir={setSelecionada}
                  onNovoProjeto={() => setEditorProjeto(null)}
                  onEditarProjeto={setEditorProjeto}
                />
              )}
            </div>

            {/* Painel lateral */}
            <div className="flex flex-col gap-4">
              <MiniCalendario todas={todas} />
              <div className={CARTAO}>
                <div className="mb-3 flex items-center justify-between"><span className={ROTULO}>Resumo das tarefas</span><span className="text-[11px] text-muted">Este mês</span></div>
                <div className="flex flex-col gap-2.5">
                  {[
                    { r: 'Concluídas', v: resumo.concluidas, cor: '#299438' },
                    { r: 'Em andamento', v: resumo.emAndamento, cor: '#246fe0' },
                    { r: 'Atrasadas', v: resumo.atrasadas, cor: '#d1453b' },
                    { r: 'Não iniciadas', v: resumo.naoIniciadas, cor: 'var(--vida-muted)' },
                  ].map((x) => {
                    const pct = resumo.total > 0 ? Math.round((x.v / resumo.total) * 100) : 0
                    return (
                      <div key={x.r}>
                        <div className="flex items-center justify-between text-[12.5px]"><span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ backgroundColor: x.cor }} />{x.r}</span><span className="font-semibold text-muted">{pct}%</span></div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-hover"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: x.cor }} /></div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="rounded-2xl border border-line bg-accent/[0.06] p-4">
                <span className={ROTULO}>✦ Insights da execução</span>
                <ul className="mt-2.5 flex flex-col gap-2.5">
                  {insights.length === 0 && <li className="text-[13px] text-muted">Conclua algumas tarefas para o Lume observar seus padrões.</li>}
                  {insights.map((i) => (
                    <li key={i.id} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface text-[13px]">{i.icone}</span>
                      <span className="text-[13px] leading-snug">{i.texto}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      <TaskEditorSheet task={selecionada} projetos={ps} todas={todas} onFechar={() => setSelecionada(null)} />
      <EditorProjeto projeto={editorProjeto} onFechar={() => setEditorProjeto(undefined)} onCriado={(id) => { setAba('tudo'); setSubTudo({ projeto: id }) }} />
    </div>
  )
}

/* ------------------------------ próximas view ----------------------------- */

function ProximasView({ listas, todas, projetos, onAbrir }: { listas: Task[]; todas: Task[]; projetos: Projeto[]; onAbrir: (t: Task) => void }) {
  const grupos = new Map<string, Task[]>()
  for (const t of listas) {
    const arr = grupos.get(t.data!) ?? []
    arr.push(t)
    grupos.set(t.data!, arr)
  }
  if (grupos.size === 0) return <EmptyState icone={<IconCalendario />} titulo="Nada agendado" descricao="Tarefas com data futura aparecem aqui." />
  return (
    <div className="flex flex-col gap-3">
      {[...grupos.entries()].map(([dia, tks]) => (
        <div key={dia} className="rounded-2xl border border-line bg-surface/50 p-3">
          <h2 className="mb-1 px-1 text-[13px] font-semibold text-muted">{rotuloData(dia)}</h2>
          <TaskList tarefas={tks} todas={todas} projetos={projetos} onAbrir={onAbrir} ocultarData mostrarProjeto vazio={null} />
        </div>
      ))}
    </div>
  )
}

/* -------------------------------- tudo view ------------------------------- */

function TudoView({ sub, setSub, projetos, labels, todas, onAbrir, onNovoProjeto, onEditarProjeto }: {
  sub: 'entrada' | 'concluidas' | 'calendario' | { projeto: string } | { label: string }
  setSub: (s: 'entrada' | 'concluidas' | 'calendario' | { projeto: string } | { label: string }) => void
  projetos: Projeto[]
  labels: { label: string; qtd: number }[]
  todas: Task[]
  onAbrir: (t: Task) => void
  onNovoProjeto: () => void
  onEditarProjeto: (p: Projeto) => void
}) {
  const chave = typeof sub === 'string' ? sub : 'projeto' in sub ? `p:${sub.projeto}` : `l:${sub.label}`
  const projAtual = typeof sub === 'object' && 'projeto' in sub ? projetos.find((p) => p.id === sub.projeto) : undefined
  const labelAtual = typeof sub === 'object' && 'label' in sub ? sub.label : undefined
  const comum = { todas, projetos, onAbrir }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {([['entrada', 'Entrada'], ['calendario', 'Calendário'], ['concluidas', 'Concluídas']] as const).map(([id, r]) => (
          <button key={id} onClick={() => setSub(id)} className={`min-h-8 rounded-full px-3 text-[13px] font-medium transition-colors ${chave === id ? 'bg-ink text-surface' : 'bg-hover text-muted hover:text-ink'}`}>{r}</button>
        ))}
        <span className="mx-1 h-4 w-px bg-line" />
        {projetos.map((p) => (
          <button key={p.id} onClick={() => setSub({ projeto: p.id })} onDoubleClick={() => onEditarProjeto(p)} className={`flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors ${chave === `p:${p.id}` ? 'bg-ink text-surface' : 'bg-hover text-muted hover:text-ink'}`}>
            <span className="size-2.5 rounded-full" style={{ backgroundColor: p.cor ?? 'var(--vida-muted)' }} />{p.nome}
          </button>
        ))}
        <button onClick={onNovoProjeto} className="flex min-h-8 items-center gap-1 rounded-full border border-dashed border-line px-3 text-[12px] text-muted hover:text-ink"><IconMais width={13} height={13} /> Projeto</button>
        {labels.map(({ label }) => (
          <button key={label} onClick={() => setSub({ label })} className={`flex min-h-8 items-center gap-1 rounded-full px-3 text-[12px] font-medium transition-colors ${chave === `l:${label}` ? 'bg-ink text-surface' : 'bg-hover/70 text-muted hover:text-ink'}`}>
            <IconEtiqueta width={12} height={12} />{label}
          </button>
        ))}
      </div>

      <div className={CARTAO}>
        {projAtual ? (
          <TaskList {...comum} tarefas={filtrarProjeto(todas, projAtual.id)} aninhar arrastavel vazio={<EmptyState icone={<IconCheckCircle />} titulo="Projeto vazio" descricao="Adicione a primeira tarefa deste projeto." />} />
        ) : labelAtual ? (
          <TaskList {...comum} tarefas={filtrarLabel(todas, labelAtual)} mostrarProjeto vazio={<EmptyState icone={<IconEtiqueta />} titulo="Sem tarefas com esta etiqueta" descricao="Adicione a etiqueta a uma tarefa." />} />
        ) : sub === 'calendario' ? (
          <CalendarioTarefas tarefas={todas} todas={todas} projetos={projetos} onAbrir={onAbrir} />
        ) : sub === 'concluidas' ? (
          <TaskList {...comum} tarefas={filtrarConcluidas(todas)} mostrarProjeto vazio={<EmptyState icone={<IconCheckCircle />} titulo="Nada concluído ainda" descricao="As tarefas finalizadas ficam aqui." />} />
        ) : (
          <TaskList {...comum} tarefas={filtrarEntrada(todas)} aninhar arrastavel vazio={<EmptyState icone={<IconCaixaEntrada />} titulo="Entrada vazia" descricao="Tarefas sem projeto aparecem aqui." />} />
        )}
      </div>
    </div>
  )
}

/* ------------------------------ mini calendário --------------------------- */

function MiniCalendario({ todas }: { todas: Task[] }) {
  const [offset, setOffset] = useState(0)
  const hoje = new Date()
  const ref = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1)
  const ano = ref.getFullYear()
  const mes = ref.getMonth()
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay()
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const comTarefa = new Set<number>()
  const mesStr = `${ano}-${String(mes + 1).padStart(2, '0')}`
  for (const t of todas) {
    if (t.concluidaEm) continue
    for (const d of [t.data, t.blocoData]) {
      if (d && d.startsWith(mesStr)) comTarefa.add(Number(d.slice(8, 10)))
    }
  }
  const hojeDia = hoje.getDate()
  const ehMesAtual = offset === 0
  const celulas: (number | null)[] = [...Array(primeiroDiaSemana).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => i + 1)]
  return (
    <div className={CARTAO}>
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => setOffset((o) => o - 1)} className="flex size-6 items-center justify-center rounded-full text-muted hover:bg-hover">‹</button>
        <span className="text-[13px] font-semibold capitalize">{format(ref, "MMMM yyyy", { locale: ptBR })}</span>
        <button onClick={() => setOffset((o) => o + 1)} className="flex size-6 items-center justify-center rounded-full text-muted hover:bg-hover">›</button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <span key={i} className="text-[10px] font-medium text-muted/70">{d}</span>)}
        {celulas.map((d, i) => {
          if (d == null) return <span key={i} />
          const eHoje = ehMesAtual && d === hojeDia
          return (
            <span key={i} className="flex flex-col items-center">
              <span className={`flex size-7 items-center justify-center rounded-full text-[12px] ${eHoje ? 'bg-accent font-bold text-white' : ''}`}>{d}</span>
              {comTarefa.has(d) && !eHoje && <span className="mt-0.5 size-1 rounded-full bg-accent" />}
              {comTarefa.has(d) && eHoje && <span className="mt-0.5 size-1 rounded-full bg-transparent" />}
            </span>
          )
        })}
      </div>
    </div>
  )
}
