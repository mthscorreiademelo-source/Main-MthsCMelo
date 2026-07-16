import type { ReactElement, SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

function Svg(props: P) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={18}
      height={18}
      {...props}
    />
  )
}

/** Ícones minimalistas para fatores e categorias — chave → componente. */
export const ICONES_HUMOR: Record<string, (p: P) => ReactElement> = {
  coracao: (p) => (
    <Svg {...p}>
      <path d="M12 20s-7-4.4-7-9.3A3.7 3.7 0 0 1 12 8a3.7 3.7 0 0 1 7 2.7C19 15.6 12 20 12 20Z" />
    </Svg>
  ),
  sol: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2m0 14v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M3 12h2m14 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Svg>
  ),
  lua: (p) => (
    <Svg {...p}>
      <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z" />
    </Svg>
  ),
  folha: (p) => (
    <Svg {...p}>
      <path d="M5 19c0-8 5-13 14-13 0 9-5 14-13 14a8 8 0 0 1-1-1Z" />
      <path d="M9 15c2-3 5-5 8-6" />
    </Svg>
  ),
  raio: (p) => (
    <Svg {...p}>
      <path d="M13 3 5 13h5l-1 8 8-11h-5l1-7Z" />
    </Svg>
  ),
  onda: (p) => (
    <Svg {...p}>
      <path d="M3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
      <path d="M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
    </Svg>
  ),
  gota: (p) => (
    <Svg {...p}>
      <path d="M12 3c3.5 4 6 7 6 10a6 6 0 0 1-12 0c0-3 2.5-6 6-10Z" />
    </Svg>
  ),
  chama: (p) => (
    <Svg {...p}>
      <path d="M12 3c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1.4.6-2.4 1.5-3.3C10 8 11 6 12 3Z" />
    </Svg>
  ),
  garfo: (p) => (
    <Svg {...p}>
      <path d="M7 3v6a2 2 0 0 0 4 0V3M9 9v12" />
      <path d="M16 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4v9" />
    </Svg>
  ),
  corrida: (p) => (
    <Svg {...p}>
      <circle cx="14" cy="5" r="1.6" />
      <path d="M13 9l-3 2 2 3 1 5M13 9l3 1 2 3M10 11l-4 1M12 14l-2 6" />
    </Svg>
  ),
  maleta: (p) => (
    <Svg {...p}>
      <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
      <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3.5 12.5h17" />
    </Svg>
  ),
  livro: (p) => (
    <Svg {...p}>
      <path d="M4 5.5A2 2 0 0 1 6 4h6v15H6a2 2 0 0 0-2 1.2Z" />
      <path d="M20 5.5A2 2 0 0 0 18 4h-6v15h6a2 2 0 0 1 2 1.2Z" />
    </Svg>
  ),
  pessoas: (p) => (
    <Svg {...p}>
      <circle cx="9" cy="8" r="2.6" />
      <path d="M4 19c0-3 2.2-5 5-5s5 2 5 5" />
      <path d="M16 6.2A2.5 2.5 0 0 1 16 11M20 19c0-2.4-1.3-4.2-3.3-4.8" />
    </Svg>
  ),
}

export function IconeFator({ nome, ...props }: { nome?: string } & P) {
  const Componente = (nome && ICONES_HUMOR[nome]) || ICONES_HUMOR.folha
  return <Componente {...props} />
}

/** Lista de chaves disponíveis — usada no editor de personalização (Fase 3). */
export const CHAVES_ICONE = Object.keys(ICONES_HUMOR)
