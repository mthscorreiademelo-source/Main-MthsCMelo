import { useState, type FormEvent } from 'react'
import { IconMais } from '../../../core/components/Icons'
import { criarTarefa } from '../db'

interface Props {
  /** Data ISO aplicada às tarefas criadas aqui (ex.: hoje). */
  dataPadrao?: string
  placeholder?: string
}

export function QuickAdd({ dataPadrao, placeholder = 'Adicionar tarefa…' }: Props) {
  const [titulo, setTitulo] = useState('')

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return
    await criarTarefa(titulo, dataPadrao)
    setTitulo('')
  }

  return (
    <form
      onSubmit={aoEnviar}
      className="flex min-h-12 items-center gap-1 rounded-lg border border-line bg-surface/60 px-2 transition-colors focus-within:border-muted/50"
    >
      <span className="flex size-11 items-center justify-center text-muted">
        <IconMais />
      </span>
      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder={placeholder}
        enterKeyHint="done"
        className="min-w-0 flex-1 bg-transparent py-3 text-[15px] outline-none placeholder:text-muted/70"
      />
    </form>
  )
}
