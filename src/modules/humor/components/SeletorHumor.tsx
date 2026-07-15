import { HUMORES } from '../humor'
import type { NivelHumor } from '../types'

interface Props {
  valor?: NivelHumor
  onEscolher: (nivel: NivelHumor) => void
}

/** Linha de 5 rostos para escolher o humor do dia — inspirado no Daylio. */
export function SeletorHumor({ valor, onEscolher }: Props) {
  return (
    <div className="flex items-stretch justify-between gap-1.5">
      {HUMORES.map((h) => {
        const ativo = valor === h.nivel
        return (
          <button
            key={h.nivel}
            onClick={() => onEscolher(h.nivel)}
            aria-label={h.rotulo}
            aria-pressed={ativo}
            className="flex flex-1 cursor-pointer flex-col items-center gap-1.5 rounded-xl py-1 transition-transform active:scale-95"
          >
            <span
              className="flex aspect-square w-full max-w-14 items-center justify-center rounded-full transition-all"
              style={{
                backgroundColor: ativo ? h.cor : `${h.cor}22`,
                boxShadow: ativo ? `0 0 0 2px var(--vida-bg), 0 0 0 4px ${h.cor}` : 'none',
              }}
            >
              <Rosto nivel={h.nivel} cor={ativo ? '#fff' : h.cor} />
            </span>
            <span className={`text-[11px] ${ativo ? 'font-semibold text-ink' : 'text-muted'}`}>
              {h.rotulo}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Rostinho SVG que muda a boca conforme o nível. */
function Rosto({ nivel, cor }: { nivel: NivelHumor; cor: string }) {
  const bocas: Record<NivelHumor, string> = {
    1: 'M8.5 15.5c.9-1.1 2.1-1.7 3.5-1.7s2.6.6 3.5 1.7',
    2: 'M8.7 14.8c.9-.6 2-.9 3.3-.9s2.4.3 3.3.9',
    3: 'M8.5 14.5h7',
    4: 'M8.7 14.2c.9.6 2 .9 3.3.9s2.4-.3 3.3-.9',
    5: 'M8.5 13.5c.9 1.1 2.1 1.7 3.5 1.7s2.6-.6 3.5-1.7',
  }
  return (
    <svg
      width="60%"
      height="60%"
      viewBox="0 0 24 24"
      fill="none"
      stroke={cor}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={bocas[nivel]} />
      <path d="M9 9.8h.01M15 9.8h.01" strokeWidth={2.6} />
    </svg>
  )
}
