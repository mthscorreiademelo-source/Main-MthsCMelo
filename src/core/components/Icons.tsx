import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function base(props: IconProps) {
  return {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...props,
  }
}

export function IconMenu(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

export function IconSol(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

export function IconLua(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z" />
    </svg>
  )
}

export function IconCheckCircle(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.2 2.3 2.3 4.7-4.8" />
    </svg>
  )
}

export function IconMais(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function IconCalendario(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17M8 2.8V6m8-3.2V6" />
    </svg>
  )
}

export function IconLixeira(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 6.5h15M9.5 6V4.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V6M6.5 6.5l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12" />
    </svg>
  )
}

export function IconFechar(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  )
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  )
}

export function IconDownload(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 4v11m0 0 4.5-4.5M12 15l-4.5-4.5M4.5 19.5h15" />
    </svg>
  )
}

export function IconUpload(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 15V4m0 0 4.5 4.5M12 4 7.5 8.5M4.5 19.5h15" />
    </svg>
  )
}

export function IconChama(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 21c3.9 0 6.5-2.5 6.5-6.1 0-2.5-1.4-4.4-2.8-6C14.4 7.4 13.4 5.6 13 3.5c-2.4 1.5-3.3 3.6-3.2 5.6.1 1.3-.8 1.6-1.5.8-.4-.5-.7-1.1-.8-1.9-1.3 1.5-2 3.5-2 5.4C5.5 18.5 8.1 21 12 21Z" />
    </svg>
  )
}

export function IconDocumento(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 3.5h8.5L19 8v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1-1.5Z" />
      <path d="M14 3.5V8h5M8.5 12.5h7m-7 4h4.5" />
    </svg>
  )
}

export function IconSetaEsquerda(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M19 12H5m0 0 6.5-6.5M5 12l6.5 6.5" />
    </svg>
  )
}

export function IconCaixaEntrada(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 13.5h4.6l1.5 2.5h4.8l1.5-2.5h4.6" />
      <path d="M5.6 5.5h12.8a2 2 0 0 1 2 1.8l.6 6.2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5l.6-6.2a2 2 0 0 1 2-1.8Z" />
    </svg>
  )
}
