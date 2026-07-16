import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../../core/components/Button'
import { Sheet } from '../../../core/components/Sheet'
import { IconLixeira, IconMais } from '../../../core/components/Icons'
import {
  alternarConclusao,
  atualizarTarefa,
  corPrioridade,
  criarTarefa,
  excluirTarefa,
  PRIORIDADES,
  subtarefas,
} from '../db'
import type { Projeto, Task, TipoRecorrencia } from '../types'

interface Props {
  task: Task | null
  projetos: Projeto[]
  todas: Task[]
  onFechar: () => void
}

const CAMPO =
  'min-h-11 rounded-lg border border-line bg-transparent px-3 text-[15px] outline-none focus:border-muted/50'
const ROTULO = 'text-[13px] font-medium text-muted'

const RECORRENCIAS: { valor: TipoRecorrencia | ''; rotulo: string }[] = [
  { valor: '', rotulo: 'Não repete' },
  { valor: 'diaria', rotulo: 'Diariamente' },
  { valor: 'semanal', rotulo: 'Semanalmente' },
  { valor: 'mensal', rotulo: 'Mensalmente' },
  { valor: 'anual', rotulo: 'Anualmente' },
]

export function TaskEditorSheet({ task, projetos, todas, onFechar }: Props) {
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [data, setData] = useState('')
  const [horario, setHorario] = useState('')
  const [duracao, setDuracao] = useState('')
  const [blocoData, setBlocoData] = useState('')
  const [blocoInicio, setBlocoInicio] = useState('')
  const [novaSub, setNovaSub] = useState('')
  const [novaLabel, setNovaLabel] = useState('')
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)

  useEffect(() => {
    if (task) {
      setTitulo(task.titulo)
      setDescricao(task.descricao ?? '')
      setData(task.data ?? '')
      setHorario(task.horario ?? '')
      setDuracao(task.duracaoMin != null ? String(task.duracaoMin) : '')
      setBlocoData(task.blocoData ?? '')
      setBlocoInicio(task.blocoInicio ?? '')
      setNovaSub('')
      setNovaLabel('')
      setConfirmandoExclusao(false)
    }
  }, [task?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!task) return <Sheet aberto={false} titulo="Tarefa" onFechar={onFechar}><div /></Sheet>

  const filhas = subtarefas(todas, task.id)
  const labels = task.labels ?? []

  function salvarTitulo(v: string) {
    setTitulo(v)
    if (task && v.trim()) atualizarTarefa(task.id, { titulo: v.trim() })
  }
  function salvarDescricao(v: string) {
    setDescricao(v)
    if (task) atualizarTarefa(task.id, { descricao: v.trim() || undefined })
  }
  function salvarData(v: string) {
    setData(v)
    if (task) atualizarTarefa(task.id, { data: v || undefined })
  }
  function salvarHorario(v: string) {
    setHorario(v)
    if (task) atualizarTarefa(task.id, { horario: v || undefined })
  }
  function salvarDuracao(v: string) {
    setDuracao(v)
    if (task) atualizarTarefa(task.id, { duracaoMin: v ? Math.max(5, Number(v) || 0) : undefined })
  }
  function salvarBlocoData(v: string) {
    setBlocoData(v)
    if (task) atualizarTarefa(task.id, { blocoData: v || undefined })
  }
  function salvarBlocoInicio(v: string) {
    setBlocoInicio(v)
    if (task) atualizarTarefa(task.id, { blocoInicio: v || undefined })
  }
  function definirRecorrencia(tipo: TipoRecorrencia | '') {
    if (!task) return
    atualizarTarefa(task.id, { recorrencia: tipo ? { tipo } : undefined })
  }
  function adicionarLabel(e: FormEvent) {
    e.preventDefault()
    const l = novaLabel.trim()
    if (!task || !l || labels.includes(l)) return
    atualizarTarefa(task.id, { labels: [...labels, l] })
    setNovaLabel('')
  }
  function removerLabel(l: string) {
    if (!task) return
    const rest = labels.filter((x) => x !== l)
    atualizarTarefa(task.id, { labels: rest.length ? rest : undefined })
  }
  async function adicionarSub(e: FormEvent) {
    e.preventDefault()
    if (!task || !novaSub.trim()) return
    await criarTarefa({ titulo: novaSub, paiId: task.id, projetoId: task.projetoId })
    setNovaSub('')
  }
  async function aoExcluir() {
    if (!task) return
    if (!confirmandoExclusao) {
      setConfirmandoExclusao(true)
      return
    }
    await excluirTarefa(task.id)
    onFechar()
  }

  return (
    <Sheet aberto={!!task} titulo="Tarefa" onFechar={onFechar}>
      <div className="flex flex-col gap-5">
        <input
          value={titulo}
          onChange={(e) => salvarTitulo(e.target.value)}
          placeholder="Título"
          className="w-full bg-transparent text-xl font-semibold outline-none placeholder:text-muted/60"
        />

        {/* Prioridade */}
        <div className="flex flex-col gap-1.5">
          <span className={ROTULO}>Prioridade</span>
          <div className="flex gap-1.5">
            {PRIORIDADES.map((p) => {
              const ativo = task.prioridade === p.valor
              return (
                <button
                  key={p.valor}
                  onClick={() => atualizarTarefa(task.id, { prioridade: p.valor })}
                  className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border text-[14px] font-semibold transition-colors"
                  style={{
                    borderColor: ativo ? p.cor : 'var(--vida-line)',
                    backgroundColor: ativo ? `${p.cor}1a` : 'transparent',
                    color: ativo ? p.cor : 'var(--vida-muted)',
                  }}
                >
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: p.cor }} />P
                  {p.valor}
                </button>
              )
            })}
          </div>
        </div>

        {/* Prazo (data + horário-limite) + duração */}
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={ROTULO}>Prazo (data)</span>
            <input type="date" value={data} onChange={(e) => salvarData(e.target.value)} className={CAMPO} />
          </label>
          <label className="flex w-28 flex-col gap-1.5">
            <span className={ROTULO}>Horário-limite</span>
            <input type="time" value={horario} onChange={(e) => salvarHorario(e.target.value)} className={CAMPO} />
          </label>
          <label className="flex w-24 flex-col gap-1.5">
            <span className={ROTULO}>Duração</span>
            <input
              type="number"
              min={5}
              step={5}
              value={duracao}
              onChange={(e) => salvarDuracao(e.target.value)}
              placeholder="min"
              className={CAMPO}
            />
          </label>
        </div>

        {/* Bloco de tempo dedicado (quando vou fazer) */}
        <div className="flex flex-col gap-1.5 rounded-lg border border-line/70 bg-surface/40 p-2.5">
          <span className="text-[13px] font-medium text-muted">Bloco de tempo dedicado</span>
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-[12px] text-muted">Dia</span>
              <input type="date" value={blocoData} onChange={(e) => salvarBlocoData(e.target.value)} className={CAMPO} />
            </label>
            <label className="flex w-28 flex-col gap-1">
              <span className="text-[12px] text-muted">Início</span>
              <input type="time" value={blocoInicio} onChange={(e) => salvarBlocoInicio(e.target.value)} className={CAMPO} />
            </label>
          </div>
          <p className="text-[11px] text-muted/80">
            Aparece como bloco na Agenda (arraste para reposicionar). O horário-limite vira uma marca no dia do prazo.
          </p>
        </div>

        {/* Projeto + recorrência */}
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={ROTULO}>Projeto</span>
            <select
              value={task.projetoId ?? ''}
              onChange={(e) => atualizarTarefa(task.id, { projetoId: e.target.value || undefined })}
              className={CAMPO}
            >
              <option value="">Entrada</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={ROTULO}>Repetir</span>
            <select
              value={task.recorrencia?.tipo ?? ''}
              onChange={(e) => definirRecorrencia(e.target.value as TipoRecorrencia | '')}
              className={CAMPO}
            >
              {RECORRENCIAS.map((r) => (
                <option key={r.valor} value={r.valor}>
                  {r.rotulo}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Labels */}
        <div className="flex flex-col gap-1.5">
          <span className={ROTULO}>Etiquetas</span>
          {labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {labels.map((l) => (
                <span key={l} className="flex items-center gap-1 rounded-full bg-hover px-2.5 py-1 text-[13px]">
                  {l}
                  <button onClick={() => removerLabel(l)} className="text-muted hover:text-ink" aria-label={`Remover ${l}`}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <form onSubmit={adicionarLabel}>
            <input
              value={novaLabel}
              onChange={(e) => setNovaLabel(e.target.value)}
              placeholder="Adicionar etiqueta e Enter"
              className={`${CAMPO} w-full`}
            />
          </form>
        </div>

        {/* Descrição */}
        <label className="flex flex-col gap-1.5">
          <span className={ROTULO}>Descrição</span>
          <textarea
            value={descricao}
            onChange={(e) => salvarDescricao(e.target.value)}
            placeholder="Detalhes, links, contexto…"
            rows={4}
            className="w-full resize-none rounded-lg border border-line bg-transparent px-3 py-2.5 text-[15px] leading-relaxed outline-none placeholder:text-muted/60 focus:border-muted/50"
          />
        </label>

        {/* Subtarefas */}
        <div className="flex flex-col gap-1.5">
          <span className={ROTULO}>
            Subtarefas {filhas.length > 0 && `· ${filhas.filter((f) => f.concluidaEm).length}/${filhas.length}`}
          </span>
          <ul className="flex flex-col">
            {filhas.map((f) => (
              <li key={f.id} className="flex items-center gap-2 py-1">
                <button
                  role="checkbox"
                  aria-checked={!!f.concluidaEm}
                  onClick={() => alternarConclusao(f)}
                  className="flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px]"
                  style={{
                    borderColor: corPrioridade(f.prioridade),
                    backgroundColor: f.concluidaEm ? corPrioridade(f.prioridade) : 'transparent',
                  }}
                >
                  {f.concluidaEm && <span className="text-[10px] text-white">✓</span>}
                </button>
                <span className={`text-[14px] ${f.concluidaEm ? 'text-muted line-through' : ''}`}>{f.titulo}</span>
              </li>
            ))}
          </ul>
          <form onSubmit={adicionarSub} className="flex items-center gap-1">
            <span className="flex size-6 items-center justify-center text-muted">
              <IconMais width={15} height={15} />
            </span>
            <input
              value={novaSub}
              onChange={(e) => setNovaSub(e.target.value)}
              placeholder="Adicionar subtarefa"
              className="min-w-0 flex-1 bg-transparent py-1.5 text-[14px] outline-none placeholder:text-muted/60"
            />
          </form>
        </div>

        <Button variante="perigo" onClick={aoExcluir} className="self-start">
          <IconLixeira width={16} height={16} />
          {confirmandoExclusao ? 'Confirmar exclusão' : 'Excluir tarefa'}
        </Button>
      </div>
    </Sheet>
  )
}
