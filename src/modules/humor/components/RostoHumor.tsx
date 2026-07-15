import type { SVGProps } from 'react'
import type { NivelHumor } from '../types'

/** Traços da boca por nível — de tristeza (∩) a alegria (U). */
const BOCAS: Record<NivelHumor, string> = {
  1: 'M8 16.4 Q12 12.6 16 16.4',
  2: 'M8.5 15.7 Q12 13.9 15.5 15.7',
  3: 'M8.6 15 H15.4',
  4: 'M8.5 14.5 Q12 16.4 15.5 14.5',
  5: 'M8 14 Q12 17.6 16 14',
}

/** Olhos por nível — preocupados (1), neutros (2–4), felizes fechados (5). */
function Olhos({ nivel }: { nivel: NivelHumor }) {
  if (nivel === 1) {
    return (
      <>
        <path d="M8.3 9.2 L10 10.1" />
        <path d="M15.7 9.2 L14 10.1" />
      </>
    )
  }
  if (nivel === 5) {
    return (
      <>
        <path d="M8.2 10.3 Q9.1 9.1 10 10.3" />
        <path d="M14 10.3 Q14.9 9.1 15.8 10.3" />
      </>
    )
  }
  return (
    <>
      <path d="M9.1 9.9 h.01" strokeWidth={2.4} />
      <path d="M14.9 9.9 h.01" strokeWidth={2.4} />
    </>
  )
}

/** Rosto exclusivo do Lume para um nível de humor — só o glifo, cor via currentColor. */
export function RostoHumor({
  nivel,
  ...props
}: { nivel: NivelHumor } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <Olhos nivel={nivel} />
      <path d={BOCAS[nivel]} />
    </svg>
  )
}

/**
 * Disco de humor tocável — usado no fluxo de captura.
 * Anima na seleção: cresce e preenche com a cor.
 */
export function DiscoHumor({
  nivel,
  cor,
  ativo,
  tamanho = 60,
  onClick,
  rotulo,
}: {
  nivel: NivelHumor
  cor: string
  ativo: boolean
  tamanho?: number
  onClick?: () => void
  rotulo?: string
}) {
  return (
    <button
      onClick={onClick}
      aria-label={rotulo}
      aria-pressed={ativo}
      className="flex cursor-pointer flex-col items-center gap-2 outline-none"
    >
      <span
        className="flex items-center justify-center rounded-full transition-all duration-300 ease-out"
        style={{
          width: tamanho,
          height: tamanho,
          backgroundColor: ativo ? cor : `${cor}1f`,
          transform: ativo ? 'scale(1.12)' : 'scale(1)',
          boxShadow: ativo ? `0 8px 24px -8px ${cor}` : 'none',
        }}
      >
        <RostoHumor
          nivel={nivel}
          width="58%"
          height="58%"
          style={{ color: ativo ? '#fff' : cor }}
        />
      </span>
      {rotulo && (
        <span
          className={`text-center text-[12px] leading-tight transition-colors ${
            ativo ? 'font-semibold text-ink' : 'text-muted'
          }`}
        >
          {rotulo}
        </span>
      )}
    </button>
  )
}
