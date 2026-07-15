import { useMemo } from 'react'
import { IconCheck, IconMenuPontos } from '../../../core/components/Icons'
import { DIAS_SEMANA, hojeISO, semanasDoMes } from '../../../core/dates'
import { alternarDia, calcularStreak } from '../db'
import type { Habito } from '../types'

interface Props {
  habito: Habito
  mes: string
  diasFeitos: Set<string>
  onAbrir: (habito: Habito) => void
}

/** Cartão de um hábito com o mês inteiro em grade — estilo Habit Now, no visual do Lume. */
export function HabitoMes({ habito, mes, diasFeitos, onAbrir }: Props) {
  const hoje = hojeISO()
  const semanas = useMemo(() => semanasDoMes(mes), [mes])
  const streak = calcularStreak(diasFeitos, hoje)

  // dias cumpridos dentro deste mês
  const feitosNoMes = useMemo(() => {
    let n = 0
    for (const d of diasFeitos) if (d.startsWith(`${mes}-`)) n++
    return n
  }, [diasFeitos, mes])

  const totalDias = semanas.flat().filter(Boolean).length

  return (
    <section className="rounded-xl border border-line p-3">
      <div className="mb-3 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{habito.nome}</p>
          <p className="text-[12px] text-muted">
            {feitosNoMes} de {totalDias} dias
            {streak > 0 && <span className="ml-1.5">· 🔥 {streak}</span>}
          </p>
        </div>
        <button
          onClick={() => onAbrir(habito)}
          aria-label={`Abrir ${habito.nome}`}
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-ink"
        >
          <IconMenuPontos width={18} height={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DIAS_SEMANA.map((d, i) => (
          <span key={i} className="pb-0.5 text-center text-[10px] font-medium text-muted/70">
            {d}
          </span>
        ))}
        {semanas.flat().map((dia, i) => {
          if (!dia) return <span key={i} />
          const feito = diasFeitos.has(dia)
          const ehHoje = dia === hoje
          const futuro = dia > hoje
          const numero = Number(dia.slice(-2))
          return (
            <button
              key={i}
              onClick={() => alternarDia(habito.id, dia)}
              disabled={futuro}
              aria-label={`${habito.nome} em ${dia}`}
              aria-pressed={feito}
              className={`flex aspect-square items-center justify-center rounded-md text-[12px] transition-all ${
                futuro ? 'cursor-default text-muted/25' : 'cursor-pointer'
              } ${
                feito
                  ? 'bg-accent font-semibold text-white'
                  : ehHoje
                    ? 'text-ink ring-2 ring-accent ring-inset'
                    : !futuro
                      ? 'bg-hover/60 text-muted hover:bg-hover'
                      : ''
              }`}
            >
              {feito ? <IconCheck width={13} height={13} strokeWidth={2.6} /> : numero}
            </button>
          )
        })}
      </div>
    </section>
  )
}
