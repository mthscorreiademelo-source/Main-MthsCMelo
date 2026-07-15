import { useMemo } from 'react'
import { DIAS_SEMANA, hojeISO, semanasDoMes } from '../../../core/dates'
import { humorDe } from '../humor'
import type { HumorRegistro, NivelHumor } from '../types'

interface Props {
  mes: string
  registros: Map<string, HumorRegistro>
  dataSel: string
  onSelecionar: (data: string) => void
}

/** Calendário do mês colorido pelo humor de cada dia — estilo Daylio. */
export function CalendarioHumor({ mes, registros, dataSel, onSelecionar }: Props) {
  const hoje = hojeISO()
  const semanas = useMemo(() => semanasDoMes(mes), [mes])

  return (
    <div className="grid grid-cols-7 gap-1">
      {DIAS_SEMANA.map((d, i) => (
        <span key={i} className="pb-0.5 text-center text-[10px] font-medium text-muted/70">
          {d}
        </span>
      ))}
      {semanas.flat().map((dia, i) => {
        if (!dia) return <span key={i} />
        const reg = registros.get(dia)
        const ehHoje = dia === hoje
        const selecionado = dia === dataSel
        const futuro = dia > hoje
        const numero = Number(dia.slice(-2))
        const cor = reg ? humorDe(reg.nivel as NivelHumor).cor : undefined
        return (
          <button
            key={i}
            onClick={() => onSelecionar(dia)}
            disabled={futuro}
            aria-label={`${dia}${reg ? ` — ${humorDe(reg.nivel).rotulo}` : ''}`}
            className={`flex aspect-square items-center justify-center rounded-lg text-[12px] transition-all ${
              futuro ? 'cursor-default text-muted/25' : 'cursor-pointer'
            } ${cor ? 'font-semibold text-white' : !futuro ? 'bg-hover/60 text-muted hover:bg-hover' : ''} ${
              selecionado ? 'ring-2 ring-ink ring-inset' : ehHoje && !cor ? 'ring-2 ring-accent ring-inset text-ink' : ''
            }`}
            style={cor ? { backgroundColor: cor } : undefined}
          >
            {numero}
          </button>
        )
      })}
    </div>
  )
}
