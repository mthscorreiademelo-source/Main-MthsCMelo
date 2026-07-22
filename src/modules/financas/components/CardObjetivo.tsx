import { formatarBRL } from '../db'
import { evolucaoObjetivo, guardadoNoMes } from '../orcamento'
import { Sparkline } from './Graficos'
import type { Objetivo } from '../types'

/** Card de um objetivo/caixinha: progresso, mini-gráfico de evolução e aporte do mês. */
export function CardObjetivo({ objetivo, mes, onClick }: { objetivo: Objetivo; mes: string; onClick: () => void }) {
  const o = objetivo
  const frac = o.alvoCentavos > 0 ? o.atualCentavos / o.alvoCentavos : 0
  const cor = o.cor ?? '#7c9885'
  const serie = evolucaoObjetivo(o.historico)
  const guardadoMes = guardadoNoMes(o.historico, mes)
  const meta = o.aporteMensalCentavos ?? 0
  const bateu = meta > 0 && guardadoMes >= meta
  return (
    <button onClick={onClick} className="cursor-pointer rounded-xl border border-line p-3 text-left transition-colors hover:border-muted/40">
      <div className="flex items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full text-[15px]" style={{ backgroundColor: `color-mix(in srgb, ${cor} 16%, transparent)` }}>{o.icone ?? '🎯'}</span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{o.nome}</span>
        {bateu ? <span title="Meta do mês batida" aria-label="meta do mês batida">⭐</span> : <span className="text-[11px] text-muted">＋</span>}
      </div>
      <div className="mt-2 flex items-end gap-1">
        <span className="text-[22px] font-bold leading-none">{Math.round(frac * 100)}</span>
        <span className="text-[13px] font-semibold leading-none text-muted">%</span>
        {serie.length >= 2 && (
          <span className="ml-auto">
            <Sparkline valores={serie} cor={cor} largura={72} altura={26} />
          </span>
        )}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-hover">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, frac * 100)}%`, backgroundColor: cor }} />
      </div>
      <div className="mt-1.5 text-[11px] text-muted">{formatarBRL(o.atualCentavos)} de {formatarBRL(o.alvoCentavos)}</div>
      {meta > 0 && (
        <div className="mt-0.5 text-[10.5px] text-muted">
          Este mês: <span className={bateu ? 'font-semibold text-accent' : 'font-medium text-ink'}>{formatarBRL(guardadoMes)}</span> / {formatarBRL(meta)}
        </div>
      )}
    </button>
  )
}
