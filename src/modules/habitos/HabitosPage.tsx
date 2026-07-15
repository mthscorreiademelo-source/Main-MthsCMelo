import { useMemo, useState, type FormEvent } from 'react'
import { addMonths, format, parseISO } from 'date-fns'
import { EmptyState } from '../../core/components/EmptyState'
import { IconButton } from '../../core/components/Button'
import { IconChama, IconMais, IconSetaEsquerda } from '../../core/components/Icons'
import { rotuloMes } from '../../core/dates'
import { HabitoEditorSheet } from './components/HabitoEditorSheet'
import { HabitoMes } from './components/HabitoMes'
import { criarHabito, ordenarHabitos } from './db'
import { diasPorHabito, useHabitos, useRegistros } from './hooks'
import type { Habito } from './types'

export function HabitosPage() {
  const habitos = useHabitos()
  const registros = useRegistros()
  const [nome, setNome] = useState('')
  const [selecionado, setSelecionado] = useState<Habito | null>(null)
  const [mes, setMes] = useState(() => format(new Date(), 'yyyy-MM'))

  const dias = useMemo(() => diasPorHabito(registros ?? []), [registros])
  const lista = useMemo(() => ordenarHabitos(habitos ?? []), [habitos])

  function mudarMes(delta: number) {
    setMes(format(addMonths(parseISO(`${mes}-01`), delta), 'yyyy-MM'))
  }

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

      {lista.length > 0 && (
        <div className="flex items-center justify-between">
          <IconButton onClick={() => mudarMes(-1)} aria-label="Mês anterior">
            <IconSetaEsquerda width={18} height={18} />
          </IconButton>
          <h2 className="text-[15px] font-semibold">{rotuloMes(mes)}</h2>
          <IconButton onClick={() => mudarMes(1)} aria-label="Próximo mês">
            <IconSetaEsquerda width={18} height={18} className="rotate-180" />
          </IconButton>
        </div>
      )}

      {habitos && lista.length === 0 && (
        <EmptyState
          icone={<IconChama />}
          titulo="Nenhum hábito ainda"
          descricao="Crie um hábito e marque os dias em que cumprir — a sequência cuida da motivação."
        />
      )}

      <div className="flex flex-col gap-3">
        {lista.map((h) => (
          <HabitoMes
            key={h.id}
            habito={h}
            mes={mes}
            diasFeitos={dias.get(h.id) ?? VAZIO}
            onAbrir={setSelecionado}
          />
        ))}
      </div>

      <HabitoEditorSheet
        habito={selecionado}
        diasFeitos={selecionado ? (dias.get(selecionado.id) ?? VAZIO) : VAZIO}
        onFechar={() => setSelecionado(null)}
      />
    </div>
  )
}
