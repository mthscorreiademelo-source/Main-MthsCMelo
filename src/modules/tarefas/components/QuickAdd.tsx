import { useMemo, useState, type FormEvent } from 'react'
import { IconCalendario, IconMais } from '../../../core/components/Icons'
import { rotuloData } from '../../../core/dates'
import { corPrioridade, criarTarefa, interpretarEntrada } from '../db'
import type { Projeto } from '../types'

interface Props {
  projetos: Projeto[]
  /** Data aplicada quando o texto não traz uma (ex.: hoje). */
  dataPadrao?: string
  /** Projeto aplicado quando o texto não traz `#projeto`. */
  projetoPadrao?: string
  placeholder?: string
}

export function QuickAdd({ projetos, dataPadrao, projetoPadrao, placeholder = 'Adicionar tarefa…' }: Props) {
  const [texto, setTexto] = useState('')
  const parsed = useMemo(() => interpretarEntrada(texto, projetos), [texto, projetos])
  const dataFinal = parsed.data ?? dataPadrao
  const projetoFinal = parsed.projetoId ?? projetoPadrao
  const projeto = projetos.find((p) => p.id === projetoFinal)

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    if (!parsed.titulo.trim()) return
    await criarTarefa({
      titulo: parsed.titulo,
      data: dataFinal,
      prioridade: parsed.prioridade,
      projetoId: projetoFinal,
    })
    setTexto('')
  }

  const temChips = !!(parsed.data || parsed.prioridade || parsed.projetoId)

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
          className="min-w-0 flex-1 bg-transparent py-3 text-[15px] outline-none placeholder:text-muted/70"
        />
      </div>
      {temChips && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2.5 text-[12px]">
          {parsed.data && (
            <span className="flex items-center gap-1 rounded-full bg-hover px-2 py-1 font-medium">
              <IconCalendario width={12} height={12} />
              {rotuloData(parsed.data)}
            </span>
          )}
          {parsed.prioridade && (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-1 font-medium text-white"
              style={{ backgroundColor: corPrioridade(parsed.prioridade) }}
            >
              P{parsed.prioridade}
            </span>
          )}
          {projeto && parsed.projetoId && (
            <span className="flex items-center gap-1 rounded-full bg-hover px-2 py-1 font-medium">
              <span className="size-2 rounded-full" style={{ backgroundColor: projeto.cor ?? 'var(--vida-muted)' }} />
              {projeto.nome}
            </span>
          )}
          <span className="text-[11px] text-muted/60">
            dica: “hoje”, “amanhã”, “p1”, “#{projetos[0]?.nome ?? 'projeto'}”
          </span>
        </div>
      )}
      <input type="submit" hidden />
    </form>
  )
}
