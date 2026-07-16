import { parseISO } from 'date-fns'
import type { DiaHeatmap } from '../progresso'

const VERMELHO = '#d8695e'

function corCelula(d: DiaHeatmap, cor: string): string {
  if (d.estado === 'feito') return cor
  if (d.estado === 'falhou') return VERMELHO
  if (d.estado === 'parcial') return `${cor}${Math.round(40 + d.fracao * 120).toString(16).padStart(2, '0')}`
  return 'var(--vida-line)'
}

/** Mapa de calor estilo GitHub: colunas = semanas, linhas = dias da semana. */
export function Heatmap({ dias, cor }: { dias: DiaHeatmap[]; cor: string }) {
  if (dias.length === 0) return null
  const offset = parseISO(dias[0].data).getDay()
  const celulas: (DiaHeatmap | null)[] = [...Array(offset).fill(null), ...dias]

  return (
    <div className="overflow-x-auto pb-1">
      <div className="grid grid-flow-col gap-[3px]" style={{ gridTemplateRows: 'repeat(7, 1fr)' }}>
        {celulas.map((c, i) =>
          c ? (
            <span
              key={c.data}
              title={`${c.data}${c.estado === 'feito' ? ' · feito' : c.estado === 'falhou' ? ' · não feito' : ''}`}
              className="size-3 rounded-[3px]"
              style={{ backgroundColor: corCelula(c, cor) }}
            />
          ) : (
            <span key={`b${i}`} className="size-3" />
          ),
        )}
      </div>
    </div>
  )
}
