import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { IconCheck } from '../../../core/components/Icons'
import { hojeISO } from '../../../core/dates'
import { alternarDia, calcularStreak, ultimosDias } from '../db'
import type { Habito } from '../types'

interface Props {
  habito: Habito
  diasFeitos: Set<string>
  onAbrir: (habito: Habito) => void
}

const DIAS_VISIVEIS = 7

export function HabitoItem({ habito, diasFeitos, onAbrir }: Props) {
  const dias = ultimosDias(DIAS_VISIVEIS)
  const hoje = hojeISO()
  const streak = calcularStreak(diasFeitos, hoje)

  return (
    <li className="flex flex-col gap-2 rounded-lg px-2 py-3 transition-colors hover:bg-hover/50 sm:flex-row sm:items-center sm:gap-3">
      <button
        onClick={() => onAbrir(habito)}
        className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
      >
        <span className="truncate text-[15px] font-medium">{habito.nome}</span>
        {streak > 0 && (
          <span className="shrink-0 rounded-full bg-hover px-2 py-0.5 text-[12px] font-semibold text-muted">
            🔥 {streak} {streak === 1 ? 'dia' : 'dias'}
          </span>
        )}
      </button>

      <div className="flex shrink-0 items-center gap-1.5">
        {dias.map((dia) => {
          const feito = diasFeitos.has(dia)
          const ehHoje = dia === hoje
          const inicial = format(parseISO(dia), 'EEEEE', { locale: ptBR }).toUpperCase()
          return (
            <button
              key={dia}
              onClick={() => alternarDia(habito.id, dia)}
              aria-label={`${habito.nome} em ${dia}`}
              aria-pressed={feito}
              className="flex min-h-11 w-9 cursor-pointer flex-col items-center gap-1"
            >
              <span className={`text-[10px] ${ehHoje ? 'font-bold text-ink' : 'text-muted/70'}`}>
                {inicial}
              </span>
              <span
                className={`flex size-7 items-center justify-center rounded-full border transition-all ${
                  feito
                    ? 'border-accent bg-accent text-white'
                    : ehHoje
                      ? 'border-ink/40 text-transparent'
                      : 'border-line text-transparent'
                }`}
              >
                <IconCheck width={14} height={14} strokeWidth={2.4} />
              </span>
            </button>
          )
        })}
      </div>
    </li>
  )
}
