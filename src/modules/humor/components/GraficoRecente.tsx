import { useMemo } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import { hojeISO } from '../../../core/dates'
import { humorDe } from '../humor'
import type { HumorTipo, Registro } from '../types'

/** Barras dos últimos N dias — altura pela média do humor, cor pelo nível. */
export function GraficoRecente({
  registros,
  humorTipos,
  dias = 14,
}: {
  registros: Registro[]
  humorTipos: HumorTipo[]
  dias?: number
}) {
  const serie = useMemo(() => {
    const porDia = new Map<string, { soma: number; n: number }>()
    for (const r of registros) {
      const a = porDia.get(r.data) ?? { soma: 0, n: 0 }
      a.soma += r.nivel
      a.n += 1
      porDia.set(r.data, a)
    }
    const hoje = parseISO(hojeISO())
    return Array.from({ length: dias }, (_, i) => {
      const data = format(subDays(hoje, dias - 1 - i), 'yyyy-MM-dd')
      const a = porDia.get(data)
      const media = a ? a.soma / a.n : null
      return { data, media }
    })
  }, [registros, dias])

  return (
    <div className="flex h-24 items-end gap-1.5">
      {serie.map(({ data, media }) => {
        const nivel = media ? (Math.round(media) as HumorTipo['nivel']) : null
        const cor = nivel ? humorDe(humorTipos, nivel).cor : null
        const altura = media ? 20 + ((media - 1) / 4) * 80 : 8
        return (
          <div
            key={data}
            className="flex-1 rounded-full transition-all"
            style={{
              height: `${altura}%`,
              backgroundColor: cor ?? 'var(--vida-line)',
              opacity: cor ? 1 : 0.45,
            }}
          />
        )
      })}
    </div>
  )
}
