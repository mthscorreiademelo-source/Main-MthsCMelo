import type { PontoSerie } from '../analise'

export interface SerieChart {
  nome: string
  cor: string
  pontos: PontoSerie[]
  /** normaliza numa escala própria (cada série tem magnitude diferente). */
}

/** Gráfico de múltiplas linhas (ex.: Passos, Sono, FC na semana). Cada série é
 *  normalizada na própria escala (0–1) para caberem juntas. */
export function GraficoMultiLinha({ series, rotulos, altura = 170 }: {
  series: SerieChart[]
  rotulos: string[]
  altura?: number
}) {
  const L = 520
  const A = altura
  const padX = 8
  const padTop = 10
  const padBottom = 20
  const n = rotulos.length
  const px = (i: number) => padX + (i / Math.max(1, n - 1)) * (L - padX * 2)
  const norm = (s: SerieChart) => {
    const vals = s.pontos.map((p) => p.valor).filter((v): v is number => v != null)
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const span = max - min || 1
    return (v: number) => padTop + (1 - (v - min) / span) * (A - padTop - padBottom)
  }
  return (
    <svg viewBox={`0 0 ${L} ${A}`} className="w-full">
      {series.map((s) => {
        const y = norm(s)
        let d = ''
        s.pontos.forEach((p, i) => {
          if (p.valor == null) return
          d += `${d ? 'L' : 'M'} ${px(i)},${y(p.valor)} `
        })
        return (
          <g key={s.nome}>
            <path d={d} fill="none" stroke={s.cor} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
            {s.pontos.map((p, i) => (p.valor != null ? <circle key={i} cx={px(i)} cy={y(p.valor)} r="2.6" fill={s.cor} /> : null))}
          </g>
        )
      })}
      {rotulos.map((r, i) => (
        <text key={i} x={px(i)} y={A - 5} textAnchor="middle" className="fill-[var(--vida-muted)]" style={{ fontSize: 9 }}>{r}</text>
      ))}
    </svg>
  )
}

/** Linha única com área (evolução de um marcador/medida ao longo do tempo). */
export function GraficoLinha({ pontos, rotulos, cor = 'var(--vida-accent)', formatar, faixa, altura = 150 }: {
  pontos: (number | null)[]
  rotulos: string[]
  cor?: string
  formatar?: (v: number) => string
  /** faixa de referência [min,max] desenhada como banda suave. */
  faixa?: [number, number]
  altura?: number
}) {
  const vals = pontos.filter((v): v is number => v != null)
  if (vals.length < 1) return <div className="py-6 text-center text-[12px] text-muted">Sem dados suficientes.</div>
  const L = 520
  const A = altura
  const padL = 44
  const padTop = 12
  const padBottom = 20
  let min = Math.min(...vals, ...(faixa ?? []))
  let max = Math.max(...vals, ...(faixa ?? []))
  if (min === max) { min -= 1; max += 1 }
  const span = max - min || 1
  const n = pontos.length
  const px = (i: number) => padL + (i / Math.max(1, n - 1)) * (L - padL - 8)
  const py = (v: number) => padTop + (1 - (v - min) / span) * (A - padTop - padBottom)
  let d = ''
  pontos.forEach((v, i) => { if (v != null) d += `${d ? 'L' : 'M'} ${px(i)},${py(v)} ` })
  return (
    <svg viewBox={`0 0 ${L} ${A}`} className="w-full">
      {faixa && (
        <rect x={padL} y={py(faixa[1])} width={L - padL - 8} height={Math.max(1, py(faixa[0]) - py(faixa[1]))} fill="color-mix(in srgb, var(--vida-accent) 8%, transparent)" />
      )}
      {[max, (max + min) / 2, min].map((v, i) => (
        <g key={i}>
          <line x1={padL} y1={py(v)} x2={L - 8} y2={py(v)} stroke="var(--vida-line)" strokeWidth="1" strokeDasharray="2 4" />
          <text x={0} y={py(v) + 3} className="fill-[var(--vida-muted)]" style={{ fontSize: 9 }}>{formatar ? formatar(v) : Math.round(v)}</text>
        </g>
      ))}
      <path d={d} fill="none" stroke={cor} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      {pontos.map((v, i) => (v != null ? <circle key={i} cx={px(i)} cy={py(v)} r={i === n - 1 ? 3.5 : 2.4} fill={cor} /> : null))}
      {rotulos.map((r, i) => (i % Math.ceil(n / 6) === 0 || i === n - 1 ? <text key={i} x={px(i)} y={A - 5} textAnchor="middle" className="fill-[var(--vida-muted)]" style={{ fontSize: 8.5 }}>{r}</text> : null))}
    </svg>
  )
}

/** Barra de progresso rotulada (meta). */
export function BarraMeta({ frac, cor }: { frac: number; cor: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-hover">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, frac * 100)}%`, backgroundColor: cor }} />
    </div>
  )
}
