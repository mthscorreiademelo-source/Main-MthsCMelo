import type { ReactElement, SVGProps } from 'react'
import { IconMais } from '../../../core/components/Icons'

export type Aba = 'hoje' | 'linha' | 'calendario' | 'insights' | 'estatisticas'

type P = SVGProps<SVGSVGElement>
function S(props: P) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={22}
      height={22}
      {...props}
    />
  )
}

const ICONES: Record<Aba, (p: P) => ReactElement> = {
  hoje: (p) => (
    <S {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2m0 14v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M3 12h2m14 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </S>
  ),
  linha: (p) => (
    <S {...p}>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" strokeWidth={2.4} />
    </S>
  ),
  calendario: (p) => (
    <S {...p}>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
    </S>
  ),
  insights: (p) => (
    <S {...p}>
      <path d="M3 14c2 0 3-1.5 4.5-4S10 3 12 3s3 3 4.5 7 2.5 4 4.5 4" />
    </S>
  ),
  estatisticas: (p) => (
    <S {...p}>
      <path d="M5 20V10M12 20V4M19 20v-7" />
    </S>
  ),
}

const ROTULOS: Record<Aba, string> = {
  hoje: 'Hoje',
  linha: 'Linha',
  calendario: 'Calendário',
  insights: 'Insights',
  estatisticas: 'Estatísticas',
}

const ORDEM: Aba[] = ['hoje', 'linha', 'calendario', 'insights', 'estatisticas']

export function BarraInferior({
  aba,
  onMudar,
  onNovo,
}: {
  aba: Aba
  onMudar: (a: Aba) => void
  onNovo: () => void
}) {
  return (
    <>
      {/* FAB flutuante */}
      <button
        onClick={onNovo}
        aria-label="Novo registro"
        className="absolute right-5 bottom-[88px] z-20 flex size-14 cursor-pointer items-center justify-center rounded-full bg-ink text-bg shadow-lg transition-transform active:scale-90"
      >
        <IconMais width={26} height={26} />
      </button>

      <nav
        className="flex shrink-0 items-stretch border-t border-line bg-bg/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
        aria-label="Seções do Humor"
      >
        {ORDEM.map((a) => {
          const ativo = aba === a
          const Icone = ICONES[a]
          return (
            <button
              key={a}
              onClick={() => onMudar(a)}
              aria-current={ativo ? 'page' : undefined}
              className={`flex min-h-16 flex-1 cursor-pointer flex-col items-center justify-center gap-1 transition-colors ${
                ativo ? 'text-ink' : 'text-muted/70 hover:text-muted'
              }`}
            >
              <Icone width={21} height={21} />
              <span className="text-[10px] font-medium">{ROTULOS[a]}</span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
