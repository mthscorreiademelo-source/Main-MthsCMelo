import { useSyncExternalStore } from 'react'
import { ACOES, ACOES_HOJE_PADRAO, type IdAcao } from './acoes'

/**
 * Personalização da seção "Ações rápidas" do Hoje — guardada em localStorage.
 * Fase 1: quais ações aparecem, em que ordem, e tamanho compacto/expandido.
 */

export type TamanhoAcoes = 'compacto' | 'expandido'

const CHAVE_ACOES = 'lume-qa-acoes'
const CHAVE_TAMANHO = 'lume-qa-tamanho'
const IDS_VALIDOS = new Set(ACOES.map((a) => a.id))

interface Config {
  acoes: IdAcao[]
  tamanho: TamanhoAcoes
}

function ler(): Config {
  let acoes = ACOES_HOJE_PADRAO
  try {
    const bruto = localStorage.getItem(CHAVE_ACOES)
    if (bruto) {
      const arr = JSON.parse(bruto) as IdAcao[]
      if (Array.isArray(arr)) acoes = arr.filter((id) => IDS_VALIDOS.has(id))
    }
  } catch { /* usa padrão */ }
  const tamanho = (localStorage.getItem(CHAVE_TAMANHO) as TamanhoAcoes) || 'compacto'
  return { acoes, tamanho: tamanho === 'expandido' ? 'expandido' : 'compacto' }
}

let cache: Config = ler()
const ouvintes = new Set<() => void>()

function emitir() {
  cache = ler()
  ouvintes.forEach((o) => o())
}

export function definirAcoesHoje(acoes: IdAcao[]) {
  localStorage.setItem(CHAVE_ACOES, JSON.stringify(acoes))
  emitir()
}

export function alternarAcaoHoje(id: IdAcao) {
  const atual = cache.acoes
  const nova = atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]
  definirAcoesHoje(nova)
}

export function definirTamanhoAcoes(t: TamanhoAcoes) {
  localStorage.setItem(CHAVE_TAMANHO, t)
  emitir()
}

export function useConfigAcoes(): Config {
  return useSyncExternalStore(
    (fn) => { ouvintes.add(fn); return () => ouvintes.delete(fn) },
    () => cache,
  )
}
