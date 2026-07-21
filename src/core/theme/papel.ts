/**
 * "Papel" do app — a cor de fundo exata, personalizável para o modo claro e o
 * escuro. Ao escolher um fundo, as tonalidades de superfície (cards), hover e
 * linhas são derivadas automaticamente dele, para o app parecer um caderno
 * coeso (do branco ao amarelado no claro; do preto ao cinza no escuro).
 */

export type Tema = 'light' | 'dark'

export const PADRAO_LIGHT = '#ffffff'
export const PADRAO_DARK = '#191919'

const CHAVE = (t: Tema) => (t === 'dark' ? 'lume-papel-dark' : 'lume-papel-light')

export const PRESETS_LIGHT: { nome: string; cor: string }[] = [
  { nome: 'Branco', cor: '#ffffff' },
  { nome: 'Branco quente', cor: '#fbfaf6' },
  { nome: 'Marfim', cor: '#f7f3ea' },
  { nome: 'Creme', cor: '#f3ecdd' },
  { nome: 'Pergaminho', cor: '#eee4cf' },
  { nome: 'Areia', cor: '#e8ddc7' },
]
export const PRESETS_DARK: { nome: string; cor: string }[] = [
  { nome: 'Preto', cor: '#0c0c0c' },
  { nome: 'Grafite', cor: '#191919' },
  { nome: 'Ardósia', cor: '#1c1f22' },
  { nome: 'Chumbo', cor: '#242424' },
  { nome: 'Cinza escuro', cor: '#2b2b2b' },
  { nome: 'Café', cor: '#221e1b' },
]

export function getPapel(tema: Tema): string {
  try {
    return localStorage.getItem(CHAVE(tema)) || (tema === 'dark' ? PADRAO_DARK : PADRAO_LIGHT)
  } catch {
    return tema === 'dark' ? PADRAO_DARK : PADRAO_LIGHT
  }
}

/* --------------------------------- cor ------------------------------------ */

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)]
}
function rgbHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}
/** Mistura `hex` em direção a `alvo` (0..1). */
function mistura(hex: string, alvo: [number, number, number], amt: number): string {
  const [r, g, b] = hexRgb(hex)
  return rgbHex(r + (alvo[0] - r) * amt, g + (alvo[1] - g) * amt, b + (alvo[2] - b) * amt)
}

/** Aplica o papel do tema atual (ou limpa os overrides se for o padrão). */
export function aplicarPapel(tema: Tema): void {
  const bg = getPapel(tema)
  const root = document.documentElement.style
  const padrao = tema === 'dark' ? PADRAO_DARK : PADRAO_LIGHT
  const props = ['--vida-bg', '--vida-surface', '--vida-hover', '--vida-line']
  if (bg.toLowerCase() === padrao.toLowerCase()) {
    for (const p of props) root.removeProperty(p)
    return
  }
  // No claro escurece um pouco; no escuro clareia um pouco.
  const alvo: [number, number, number] = tema === 'dark' ? [255, 255, 255] : [0, 0, 0]
  const [fSurface, fHover, fLine] = tema === 'dark' ? [0.05, 0.09, 0.13] : [0.03, 0.055, 0.1]
  root.setProperty('--vida-bg', bg)
  root.setProperty('--vida-surface', mistura(bg, alvo, fSurface))
  root.setProperty('--vida-hover', mistura(bg, alvo, fHover))
  root.setProperty('--vida-line', mistura(bg, alvo, fLine))
}

export function setPapel(tema: Tema, cor: string, temaAtual: Tema): void {
  try {
    localStorage.setItem(CHAVE(tema), cor)
  } catch {
    /* ignore */
  }
  if (tema === temaAtual) aplicarPapel(tema)
}
