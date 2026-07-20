/** Mini sparkline (evolução do patrimônio) — SVG suave, sem eixos. */
export function Sparkline({ valores, cor = 'var(--vida-accent)', largura = 120, altura = 44 }: {
  valores: number[]
  cor?: string
  largura?: number
  altura?: number
}) {
  if (valores.length < 2) return <div style={{ width: largura, height: altura }} />
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const span = max - min || 1
  const px = (i: number) => (i / (valores.length - 1)) * largura
  const py = (v: number) => altura - 4 - ((v - min) / span) * (altura - 8)
  const pts = valores.map((v, i) => `${px(i)},${py(v)}`)
  const d = `M ${pts.join(' L ')}`
  const area = `${d} L ${largura},${altura} L 0,${altura} Z`
  return (
    <svg width={largura} height={altura} viewBox={`0 0 ${largura} ${altura}`} className="overflow-visible">
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.18" />
          <stop offset="100%" stopColor={cor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark)" />
      <path d={d} fill="none" stroke={cor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={px(valores.length - 1)} cy={py(valores[valores.length - 1])} r="3" fill={cor} />
    </svg>
  )
}

/** Gráfico de linha da evolução patrimonial, com área, pontos e rótulos de mês. */
export function GraficoEvolucao({
  serie,
  formatarCurto,
  cor = 'var(--vida-accent)',
}: {
  serie: { mes: string; valor: number }[]
  formatarCurto: (c: number) => string
  cor?: string
}) {
  const L = 520
  const A = 150
  const padY = 16
  const padL = 46
  if (serie.length < 2) return <div className="text-[13px] text-muted">Dados insuficientes.</div>
  const vals = serie.map((s) => s.valor)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const px = (i: number) => padL + (i / (serie.length - 1)) * (L - padL - 8)
  const py = (v: number) => padY + (1 - (v - min) / span) * (A - padY * 2)
  const pts = serie.map((s, i) => `${px(i)},${py(s.valor)}`)
  const d = `M ${pts.join(' L ')}`
  const area = `${d} L ${px(serie.length - 1)},${A - padY} L ${px(0)},${A - padY} Z`
  const nomeMes = (m: string) => ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(m.slice(5, 7)) - 1]
  const linhasY = [max, (max + min) / 2, min]
  return (
    <svg viewBox={`0 0 ${L} ${A + 18}`} className="w-full">
      <defs>
        <linearGradient id="evo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.16" />
          <stop offset="100%" stopColor={cor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {linhasY.map((v, i) => (
        <g key={i}>
          <line x1={padL} y1={py(v)} x2={L - 8} y2={py(v)} stroke="var(--vida-line)" strokeWidth="1" strokeDasharray="2 4" />
          <text x={0} y={py(v) + 3} className="fill-[var(--vida-muted)]" style={{ fontSize: 9 }}>{formatarCurto(v)}</text>
        </g>
      ))}
      <path d={area} fill="url(#evo)" />
      <path d={d} fill="none" stroke={cor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {serie.map((s, i) => (
        <g key={s.mes}>
          <circle cx={px(i)} cy={py(s.valor)} r={i === serie.length - 1 ? 4 : 2.5} fill={cor} />
          <text x={px(i)} y={A + 12} textAnchor="middle" className="fill-[var(--vida-muted)]" style={{ fontSize: 9 }}>{nomeMes(s.mes)}</text>
        </g>
      ))}
    </svg>
  )
}
