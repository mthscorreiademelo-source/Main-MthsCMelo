export type TemaLeitor = 'claro' | 'sepia' | 'escuro'

export const TEMAS: Record<TemaLeitor, { bg: string; fg: string }> = {
  claro: { bg: '#faf9f7', fg: '#2b2a26' },
  sepia: { bg: '#f4ecd8', fg: '#4a3f2f' },
  escuro: { bg: '#16151a', fg: '#c9c7c2' },
}

export const ORDEM_TEMAS: TemaLeitor[] = ['claro', 'sepia', 'escuro']

export interface Controles {
  prev: () => void
  next: () => void
}

export interface PropsEngine {
  blob: Blob
  tema: TemaLeitor
  fontePct: number
  inicial?: string
  onProgresso: (pct: number, localizacao: string) => void
  registrarControles: (c: Controles) => void
}
