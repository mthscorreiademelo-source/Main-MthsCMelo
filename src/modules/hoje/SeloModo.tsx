import { IconLua, IconSol } from '../../core/components/Icons'
import type { Modo, TomModo } from './modo'

/**
 * Selo do "modo do momento" — o rótulo curto do topo (ex.: "Manhã · Planejar")
 * com um ícone de dia/noite. Cor pela identidade do LUME: acento para foco/planejar,
 * perigo para atenção, neutro (calmo) para os momentos de desacelerar/descanso.
 */

const ESTILO: Record<TomModo, string> = {
  planejar: 'text-accent bg-accent/10 ring-accent/25',
  foco: 'text-accent bg-accent/10 ring-accent/25',
  atencao: 'text-danger bg-danger/10 ring-danger/30',
  calmo: 'text-muted bg-surface ring-line',
}

export function SeloModo({ modo }: { modo: Modo }) {
  const Icone = modo.diurno ? IconSol : IconLua
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold ring-1 ring-inset ${ESTILO[modo.tom]}`}
      title="Modo do momento"
    >
      <Icone width={14} height={14} className="shrink-0" />
      {modo.rotulo}
    </span>
  )
}
