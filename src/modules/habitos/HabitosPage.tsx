import { useMemo, useState, type FormEvent } from 'react'
import { EmptyState } from '../../core/components/EmptyState'
import { IconChama, IconMais } from '../../core/components/Icons'
import { HabitoEditorSheet } from './components/HabitoEditorSheet'
import { HabitoItem } from './components/HabitoItem'
import { criarHabito, ordenarHabitos } from './db'
import { diasPorHabito, useHabitos, useRegistros } from './hooks'
import type { Habito } from './types'

export function HabitosPage() {
  const habitos = useHabitos()
  const registros = useRegistros()
  const [nome, setNome] = useState('')
  const [selecionado, setSelecionado] = useState<Habito | null>(null)

  const dias = useMemo(() => diasPorHabito(registros ?? []), [registros])
  const lista = useMemo(() => ordenarHabitos(habitos ?? []), [habitos])

  async function aoAdicionar(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    await criarHabito(nome)
    setNome('')
  }

  const VAZIO = new Set<string>()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <form
        onSubmit={aoAdicionar}
        className="flex min-h-12 items-center gap-1 rounded-lg border border-line bg-surface/60 px-2 transition-colors focus-within:border-muted/50"
      >
        <span className="flex size-11 items-center justify-center text-muted">
          <IconMais />
        </span>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Novo hábito (ex.: ler 10 páginas)…"
          enterKeyHint="done"
          className="min-w-0 flex-1 bg-transparent py-3 text-[15px] outline-none placeholder:text-muted/70"
        />
      </form>

      {habitos && lista.length === 0 && (
        <EmptyState
          icone={<IconChama />}
          titulo="Nenhum hábito ainda"
          descricao="Crie um hábito e marque os dias em que cumprir — a sequência cuida da motivação."
        />
      )}

      <ul className="flex flex-col divide-y divide-line/60">
        {lista.map((h) => (
          <HabitoItem
            key={h.id}
            habito={h}
            diasFeitos={dias.get(h.id) ?? VAZIO}
            onAbrir={setSelecionado}
          />
        ))}
      </ul>

      <HabitoEditorSheet
        habito={selecionado}
        diasFeitos={selecionado ? (dias.get(selecionado.id) ?? VAZIO) : VAZIO}
        onFechar={() => setSelecionado(null)}
      />
    </div>
  )
}
