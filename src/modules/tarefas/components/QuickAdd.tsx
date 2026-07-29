import { useMemo, useState, type FormEvent } from 'react'
import { IconEtiqueta, IconLixeira, IconMais } from '../../../core/components/Icons'
import { rotuloData } from '../../../core/dates'
import { criarTarefa, PRIORIDADES } from '../db'
import { interpretarTarefa } from '../interpretar'
import type { Prioridade, Projeto } from '../types'

interface Props {
  projetos: Projeto[]
  /** Data aplicada quando o texto não traz uma (ex.: hoje). */
  dataPadrao?: string
  /** Projeto aplicado quando o texto não traz `#projeto`. */
  projetoPadrao?: string
  /** Dia planejado (bloco) aplicado por herdar o contexto da visão atual (ex.: dia do Calendário). */
  blocoDataPadrao?: string
  /** Etiqueta aplicada por herdar o contexto da visão atual (ex.: aba de uma etiqueta). */
  labelPadrao?: string
  placeholder?: string
  /** Texto inicial (ex.: vindo de uma captura rápida). */
  textoInicial?: string
  /** Chamado após criar (recebe o id criado, ex.: para fechar o modal / desfazer). */
  aoConcluir?: (id?: string) => void
  autoFocus?: boolean
}

const CAMPO =
  'min-h-9 rounded-lg border border-line bg-transparent px-2 text-[13px] outline-none focus:border-muted/50'

interface BlocoRascunho {
  data?: string
  inicio?: string
  duracaoMin: number
}

export function QuickAdd({
  projetos,
  dataPadrao,
  projetoPadrao,
  blocoDataPadrao,
  labelPadrao,
  placeholder = 'Adicionar tarefa…',
  textoInicial,
  aoConcluir,
  autoFocus,
}: Props) {
  const [texto, setTexto] = useState(textoInicial ?? '')
  const parsed = useMemo(() => interpretarTarefa(texto, projetos), [texto, projetos])

  // Overrides manuais (undefined = "segue o que foi reconhecido no texto/herdado da visão").
  const [ovData, setOvData] = useState<string | undefined>()
  const [ovHorario, setOvHorario] = useState<string | undefined>()
  const [ovPrioridade, setOvPrioridade] = useState<Prioridade | undefined>()
  const [ovDuracao, setOvDuracao] = useState<string | undefined>()
  const [ovDuracaoMinBloco, setOvDuracaoMinBloco] = useState('')
  const [ovProjetoId, setOvProjetoId] = useState<string | undefined>()
  // undefined = segue o reconhecido/herdado; null = usuário removeu o bloco; objeto = criado/ajustado manualmente.
  const [ovBloco, setOvBloco] = useState<BlocoRascunho | null | undefined>()

  const dataFinal = (ovData ?? parsed.data ?? dataPadrao) || undefined
  const horarioFinal = (ovHorario ?? parsed.horario) || undefined
  const prioridadeFinal = ovPrioridade ?? parsed.prioridade
  const duracaoStr = ovDuracao ?? (parsed.duracaoMin != null ? String(parsed.duracaoMin) : '')
  const projetoIdRaw = ovProjetoId ?? parsed.projetoId ?? projetoPadrao
  const projetoFinal = projetos.find((p) => p.id === projetoIdRaw)

  const blocoHerdado: BlocoRascunho | undefined = blocoDataPadrao ? { data: blocoDataPadrao, duracaoMin: 30 } : undefined
  const blocoFinal: BlocoRascunho | undefined =
    ovBloco !== undefined ? (ovBloco ?? undefined) : (parsed.bloco ?? blocoHerdado)

  function reiniciar() {
    setTexto('')
    setOvData(undefined)
    setOvHorario(undefined)
    setOvPrioridade(undefined)
    setOvDuracao(undefined)
    setOvDuracaoMinBloco('')
    setOvProjetoId(undefined)
    setOvBloco(undefined)
  }

  function adicionarBlocoManual() {
    setOvBloco({ data: dataFinal, duracaoMin: 30 })
  }
  function editarBloco(patch: Partial<BlocoRascunho>) {
    setOvBloco({ ...(blocoFinal ?? { duracaoMin: 30 }), ...patch })
  }
  function removerBloco() {
    setOvBloco(null)
  }

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    if (!parsed.titulo.trim()) return
    const duracaoFinal = duracaoStr ? Math.max(5, Number(duracaoStr) || 0) : undefined
    const duracaoMinBlocoFinal = ovDuracaoMinBloco ? Math.max(5, Number(ovDuracaoMinBloco) || 0) : undefined
    const id = await criarTarefa({
      titulo: parsed.titulo,
      data: dataFinal,
      horario: horarioFinal,
      duracaoMin: duracaoFinal,
      duracaoMinBloco: duracaoMinBlocoFinal,
      bloco: blocoFinal ? { data: blocoFinal.data ?? dataFinal, inicio: blocoFinal.inicio, duracaoMin: blocoFinal.duracaoMin } : undefined,
      prioridade: prioridadeFinal,
      projetoId: projetoIdRaw || undefined,
      labels: labelPadrao ? [labelPadrao] : undefined,
    })
    reiniciar()
    aoConcluir?.(id)
  }

  return (
    <form
      onSubmit={aoEnviar}
      className="flex flex-col rounded-xl border border-line bg-surface/60 transition-colors focus-within:border-muted/50"
    >
      <div className="flex min-h-12 items-center gap-1 px-2">
        <span className="flex size-9 items-center justify-center text-accent">
          <IconMais />
        </span>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={placeholder}
          enterKeyHint="done"
          autoFocus={autoFocus}
          className="min-w-0 flex-1 bg-transparent py-3 text-[15px] outline-none placeholder:text-muted/70"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2 text-[12px]">
        {/* Prioridade */}
        <div className="flex gap-1">
          {PRIORIDADES.map((p) => {
            const ativo = prioridadeFinal === p.valor
            return (
              <button
                key={p.valor}
                type="button"
                onClick={() => setOvPrioridade(ativo ? undefined : p.valor)}
                title={p.rotulo}
                className="flex size-7 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors"
                style={{
                  borderColor: ativo ? p.cor : 'var(--vida-line)',
                  backgroundColor: ativo ? `${p.cor}1a` : 'transparent',
                  color: ativo ? p.cor : 'var(--vida-muted)',
                }}
              >
                P{p.valor}
              </button>
            )
          })}
        </div>

        {/* Prazo */}
        <label className="flex items-center gap-1">
          <input type="date" value={dataFinal ?? ''} onChange={(e) => setOvData(e.target.value)} className={CAMPO} />
          {dataFinal && <span className="text-[11px] text-muted">{rotuloData(dataFinal)}</span>}
        </label>

        {/* Horário-limite */}
        <label className="flex items-center gap-1 text-muted">
          até
          <input type="time" value={horarioFinal ?? ''} onChange={(e) => setOvHorario(e.target.value)} className={CAMPO} />
        </label>

        {/* Duração */}
        <label className="flex items-center gap-1 text-muted">
          <input
            type="number"
            min={5}
            step={5}
            value={duracaoStr}
            onChange={(e) => setOvDuracao(e.target.value)}
            placeholder="min"
            className={`${CAMPO} w-16`}
          />
          min
        </label>

        {/* Projeto */}
        <select value={projetoIdRaw ?? ''} onChange={(e) => setOvProjetoId(e.target.value)} className={CAMPO}>
          <option value="">Entrada</option>
          {projetos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        {projetoFinal && (
          <span className="size-2 rounded-full" style={{ backgroundColor: projetoFinal.cor ?? 'var(--vida-muted)' }} />
        )}

        {labelPadrao && (
          <span className="flex items-center gap-1 rounded-full bg-hover px-2 py-1 font-medium">
            <IconEtiqueta width={12} height={12} />
            {labelPadrao}
          </span>
        )}
      </div>

      {/* Bloco de tempo planejado */}
      <div className="px-3 pb-2">
        {blocoFinal ? (
          <div className="flex flex-wrap items-end gap-1.5 rounded-md border border-line/60 p-1.5 text-[12px]">
            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted">Dia planejado</span>
              <input
                type="date"
                value={blocoFinal.data ?? ''}
                onChange={(e) => editarBloco({ data: e.target.value || undefined })}
                className={CAMPO}
              />
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted">Início</span>
              <input
                type="time"
                value={blocoFinal.inicio ?? ''}
                onChange={(e) => editarBloco({ inicio: e.target.value || undefined })}
                className={CAMPO}
              />
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted">Min</span>
              <input
                type="number"
                min={5}
                step={5}
                value={blocoFinal.duracaoMin}
                onChange={(e) => editarBloco({ duracaoMin: Math.max(5, Number(e.target.value) || 0) })}
                className={`${CAMPO} w-16`}
              />
            </label>
            <button
              type="button"
              onClick={removerBloco}
              aria-label="Remover bloco planejado"
              className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-danger"
            >
              <IconLixeira width={13} height={13} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={adicionarBlocoManual}
            className="flex items-center gap-1 rounded-full border border-dashed border-line px-2 py-1 text-[11px] text-muted hover:text-ink"
          >
            <IconMais width={11} height={11} /> Bloco de tempo planejado
          </button>
        )}
      </div>

      {/* Tempo mínimo do bloco (se dividir) */}
      <label className="flex items-center gap-1.5 px-3 pb-3 text-[11px] text-muted">
        Tempo mínimo do bloco (se dividir)
        <input
          type="number"
          min={5}
          step={5}
          value={ovDuracaoMinBloco}
          onChange={(e) => setOvDuracaoMinBloco(e.target.value)}
          placeholder="min"
          className={`${CAMPO} w-16`}
        />
      </label>

      <p className="px-3 pb-2.5 text-[11px] text-muted/60">
        dica: “hoje”, “amanhã”, “dia 5 de agosto”, “p1”, “#{projetos[0]?.nome ?? 'projeto'}”, “às 9h”, “até 18h”, “por 2
        horas”
      </p>

      <input type="submit" hidden />
    </form>
  )
}
