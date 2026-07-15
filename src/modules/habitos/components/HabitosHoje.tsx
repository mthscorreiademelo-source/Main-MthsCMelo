import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { IconCheck } from '../../../core/components/Icons'
import { hojeISO } from '../../../core/dates'
import { alternarDia, calcularStreak, ordenarHabitos } from '../db'
import { diasPorHabito, useHabitos, useRegistros } from '../hooks'

/** Seção compacta de hábitos para a tela Hoje: um toque marca o dia. */
export function HabitosHoje() {
  const habitos = useHabitos()
  const registros = useRegistros()
  const dias = useMemo(() => diasPorHabito(registros ?? []), [registros])
  const lista = ordenarHabitos(habitos ?? [])
  const hoje = hojeISO()

  if (lista.length === 0) return null

  const feitos = lista.filter((h) => dias.get(h.id)?.has(hoje)).length

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[13px] font-medium text-muted">
          Hábitos · {feitos}/{lista.length}
        </h2>
        <Link to="/habitos" className="text-[13px] text-muted hover:text-ink">
          ver todos
        </Link>
      </div>
      <ul className="flex flex-col">
        {lista.map((h) => {
          const diasFeitos = dias.get(h.id) ?? new Set<string>()
          const feitoHoje = diasFeitos.has(hoje)
          const streak = calcularStreak(diasFeitos, hoje)
          return (
            <li key={h.id}>
              <button
                onClick={() => alternarDia(h.id, hoje)}
                aria-pressed={feitoHoje}
                className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-lg px-2 transition-colors hover:bg-hover"
              >
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full border transition-all ${
                    feitoHoje
                      ? 'border-accent bg-accent text-white'
                      : 'border-muted/50 text-transparent'
                  }`}
                >
                  <IconCheck width={14} height={14} strokeWidth={2.4} />
                </span>
                <span
                  className={`min-w-0 flex-1 truncate text-left text-[15px] ${
                    feitoHoje ? 'text-muted line-through' : ''
                  }`}
                >
                  {h.nome}
                </span>
                {streak > 0 && (
                  <span className="shrink-0 text-[12px] text-muted">🔥 {streak}</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
