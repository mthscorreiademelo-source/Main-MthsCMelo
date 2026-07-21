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

export function IconCaneta(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12.8 4.8 19.2 11.2 9.5 20.9 4 22l1.1-5.5 9.7-9.7Z" />
      <path d="m15.5 2.1 6.4 6.4M5.1 16.5l2.4 2.4" />
    </svg>
  )
}

export function IconBorracha(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m8.2 20 -4.1-4.1a1.8 1.8 0 0 1 0-2.5L13.6 3.9a1.8 1.8 0 0 1 2.5 0l4 4a1.8 1.8 0 0 1 0 2.5L11 19.9a1.8 1.8 0 0 1-1.3.6H8.2ZM20.5 20H12M9.3 6.7l8 8" />
    </svg>
  )
}

export function IconDesfazer(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 9h10a6 6 0 0 1 0 12h-4M4 9l4-4M4 9l4 4" />
    </svg>
  )
}

export function IconRefazer(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 9H10a6 6 0 0 0 0 12h4M20 9l-4-4M20 9l-4 4" />
    </svg>
  )
}

export function IconTinteiro(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m13 5.5 5.5 5.5-8.2 8.2c-.5.5-1.1.8-1.8.9l-4 .4.4-4c.1-.7.4-1.3.9-1.8L13 5.5Z" />
      <path d="m11.2 7.3 5.5 5.5M15.5 3l5.5 5.5M7.5 16.5l1-1" />
    </svg>
  )
}

export function IconMarcador(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 15 4.5 19.5M9.8 6.7l7.5 7.5-3.9 3.9a1.5 1.5 0 0 1-2.1 0L5.9 12.7a1.5 1.5 0 0 1 0-2.1l3.9-3.9ZM12.5 4l7.5 7.5" />
    </svg>
  )
}

export function IconPincel(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20.5 3.5c-4.3 1.2-8 4-10.4 7.7l3 3c3.7-2.4 6.4-6.2 7.4-10.7Z" />
      <path d="M9.5 12a4.3 4.3 0 0 0-4.2 3.4c-.3 1.5-1 2.4-1.8 3.1 1.3.6 3 .9 4.3.7a4.2 4.2 0 0 0 3.7-3.9" />
    </svg>
  )
}

export function IconCursor(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 4.2 18.6 11l-5.4 1.6L10 18.4 6 4.2Z" />
      <path d="m13.8 13.6 4.2 5" />
    </svg>
  )
}

export function IconArrastar(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="5.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="5.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconExpandir(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 4H4v5m11-5h5v5M9 20H4v-5m11 5h5v-5" />
    </svg>
  )
}

export function IconContrair(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 9h5V4m6 5h5V4M4 15h5v5m6-5h5v5" transform="rotate(180 12 12)" />
    </svg>
  )
}

export function IconPostIt(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8.2L14.7 19.5H6.5a2 2 0 0 1-2-2v-11Z" />
      <path d="M19.5 14.5h-3a2 2 0 0 0-2 2v3" />
    </svg>
  )
}

export function IconRegua(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="1.8" y="9.5" width="20.4" height="6" rx="1.2" transform="rotate(-35 12 12)" />
      <path d="m8.3 9.9 1.6 2.3m1.9-4.7 1.6 2.3m1.9-4.7 1.6 2.3" transform="rotate(-35 12 12) translate(0 0)" />
    </svg>
  )
}

export function IconSelecao(props: IconProps) {
  return (
    <svg {...base(props)} strokeDasharray="3 3">
      <rect x="4.5" y="4.5" width="15" height="15" rx="2.5" />
    </svg>
  )
}

export function IconPasta(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h3.8l2 2.2h7.7a1.5 1.5 0 0 1 1.5 1.5v8.3a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5V6.5Z" />
    </svg>
  )
}

export function IconArquivo(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 3.5h8.5L19 8v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1-1.5Z" />
      <path d="M14 3.5V8h5" />
    </svg>
  )
}

export function IconVideo(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="6" width="12" height="12" rx="2" />
      <path d="m15.5 10 5-2.6v9.2l-5-2.6" />
    </svg>
  )
}

export function IconMusica(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 18V6l10-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </svg>
  )
}

export function IconAbrir(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M14 4h6v6m0-6-8.5 8.5M18 13.5V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V8a1.5 1.5 0 0 1 1.5-1.5H11" />
    </svg>
  )
}

export function IconImagem(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m4.5 17.5 4.7-4.4 3.6 3.3 3-2.7 3.7 3.4" />
    </svg>
  )
}

export function IconMenuPontos(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="5" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconLapis(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m14.5 5.2 4.3 4.3M4 20l1-4.5L16.2 4.3a1.6 1.6 0 0 1 2.3 0l1.2 1.2a1.6 1.6 0 0 1 0 2.3L8.5 19 4 20Z" />
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

export function IconCifrao(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3v18M16.5 7.2c-.7-1.2-2.3-2-4.3-2-2.4 0-4.2 1.3-4.2 3.2 0 4.2 8.8 2.2 8.8 6.7 0 1.9-1.9 3.2-4.5 3.2-2.2 0-3.9-.9-4.6-2.2" />
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

export function IconHumor(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5c.9 1.1 2.1 1.7 3.5 1.7s2.6-.6 3.5-1.7" />
      <path d="M9 9.5h.01M15 9.5h.01" strokeWidth={2.4} />
    </svg>
  )
}

export function IconEngrenagem(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" />
    </svg>
  )
}

export function IconSeta(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M12 5l-6 6M12 5l6 6" />
    </svg>
  )
}

export function IconArquivar(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8Z" />
      <path d="M3 4h18v4H3zM10 12h4" />
    </svg>
  )
}

export function IconChevron(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export function IconNuvem(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 18a4 4 0 0 1-.5-7.97 5 5 0 0 1 9.6-1.2A3.5 3.5 0 0 1 18 18H7Z" />
    </svg>
  )
}

export function IconSair(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" />
      <path d="M10 12H3m0 0 3.5-3.5M3 12l3.5 3.5" />
    </svg>
  )
}

export function IconSaude(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 12h3l2-5 3 10 2.5-7 1.5 4h6" />
    </svg>
  )
}

export function IconLivro(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 0 4 21.5z" />
      <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" />
    </svg>
  )
}

export function IconEstrela(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.8L12 16.77 6.8 19.5l.99-5.8-4.21-4.1 5.82-.85z" />
    </svg>
  )
}

export function IconGrafico(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <rect x="7" y="12" width="3" height="5" rx="0.6" />
      <rect x="12" y="8" width="3" height="9" rx="0.6" />
      <rect x="17" y="5" width="3" height="12" rx="0.6" />
    </svg>
  )
}

export function IconSino(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
      <path d="M10.5 20a2 2 0 0 0 3 0" />
    </svg>
  )
}

export function IconRaio(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </svg>
  )
}

export function IconBandeira(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 21V4" />
      <path d="M5 4.5h11l-1.5 3.5L16 11.5H5" />
    </svg>
  )
}

export function IconRepetir(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M17 3l3 3-3 3" />
      <path d="M20 6H8a4 4 0 0 0-4 4v1" />
      <path d="M7 21l-3-3 3-3" />
      <path d="M4 18h12a4 4 0 0 0 4-4v-1" />
    </svg>
  )
}

export function IconEtiqueta(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9z" />
      <circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconRelogio(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

export function IconLista(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <circle cx="3.5" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="18" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconLupa(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function IconPata(props: IconProps) {
  return (
    <svg {...base(props)}>
      <ellipse cx="12" cy="15.5" rx="4.2" ry="3.4" />
      <circle cx="6.4" cy="10.6" r="1.7" />
      <circle cx="10" cy="7.4" r="1.7" />
      <circle cx="14" cy="7.4" r="1.7" />
      <circle cx="17.6" cy="10.6" r="1.7" />
    </svg>
  )
}
