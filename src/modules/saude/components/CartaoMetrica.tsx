import { useMemo } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import { hojeISO } from '../../../core/dates'
import { IconeFator } from '../../../core/components/icones'
import type { DefMetrica } from '../db'
import type { SaudeDia } from '../types'

/** Cartão de uma métrica: valor mais recente + mini-gráfico dos últimos dias. */
export function CartaoMetrica({
  def,
  dias,
  onAbrir,
}: {
  def: DefMetrica
  dias: SaudeDia[]
  onAbrir: () => void
}) {
  const { serie, ultimo } = useMemo(() => {
    const porData = new Map(dias.map((d) => [d.data, d[def.chave]]))
    const hoje = parseISO(hojeISO())
    const serie = Array.from({ length: 14 }, (_, i) => {
      const data = format(subDays(hoje, 13 - i), 'yyyy-MM-dd')
      const v = porData.get(data)
      return typeof v === 'number' ? v : null
    })
    const comValor = serie.filter((v): v is number => v != null)
    const ultimo = comValor.length ? comValor[comValor.length - 1] : null
    return { serie, ultimo }
  }, [dias, def.chave])

  const max = Math.max(1, ...serie.map((v) => v ?? 0))

  return (
    <button
      onClick={onAbrir}
      className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-line p-3 text-left transition-colors hover:border-muted/40"
    >
      <div className="flex items-center gap-1.5">
        <IconeFator nome={def.icone} width={15} height={15} style={{ color: def.cor }} />
        <span className="text-[12px] text-muted">{def.nome}</span>
      </div>
      <span className="text-[17px] font-bold">{ultimo != null ? def.formatar(ultimo) : '—'}</span>
      <div className="flex h-8 items-end gap-[3px]">
        {serie.map((v, i) => (
          <span
            key={i}
            className="flex-1 rounded-full"
            style={{
              height: `${v != null ? 12 + (v / max) * 88 : 6}%`,
              backgroundColor: v != null ? def.cor : 'var(--vida-line)',
              opacity: v != null ? 1 : 0.5,
            }}
          />
        ))}
      </div>
    </button>
  )
}
