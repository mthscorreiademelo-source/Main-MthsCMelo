/**
 * Tokens de atalho na Captura Rápida: `#projeto/categoria` e `@pessoa`.
 *
 * Determinístico e honesto — nada de rede nem IA. As sugestões vêm apenas de
 * dados que já existem no app (projetos de Tarefas, categorias do orçamento,
 * pessoas que já apareceram em eventos). O `#` casa com um projeto existente
 * pelo nome; se não casar, vale como rótulo de categoria livre.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'

export type TipoToken = 'projeto' | 'categoria' | 'pessoa'

export interface Sugestao {
  tipo: TipoToken
  /** rótulo exibido (com acentos/espaços). */
  rotulo: string
  /** valor inserido no texto após o sigilo (sem espaços). */
  token: string
  /** id do projeto, quando `tipo === 'projeto'`. */
  id?: string
  cor?: string
}

export interface FontesTokens {
  projetos: { id: string; nome: string; cor?: string }[]
  categorias: string[]
  pessoas: string[]
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const semEspaco = (s: string) => s.replace(/\s+/g, '')

/** Reúne, de forma reativa, as fontes de sugestão a partir do banco. */
export function useFontesTokens(): FontesTokens {
  return (
    useLiveQuery(async () => {
      const [projetos, linhas, eventos] = await Promise.all([
        db.projetos.toArray(),
        db.orcamentoLinhas.toArray(),
        db.eventos.toArray(),
      ])
      const cats = new Set<string>()
      for (const l of linhas) {
        if (l.nome) cats.add(l.nome)
        for (const c of l.categorias ?? []) cats.add(c)
      }
      const pessoas = new Set<string>()
      for (const e of eventos) for (const p of e.participantes ?? []) if (p?.trim()) pessoas.add(p.trim())
      return {
        projetos: projetos.map((p) => ({ id: p.id, nome: p.nome, cor: p.cor })),
        categorias: [...cats].sort((a, b) => a.localeCompare(b, 'pt-BR')),
        pessoas: [...pessoas].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      }
    }, []) ?? { projetos: [], categorias: [], pessoas: [] }
  )
}

/** Resultado de resolver os tokens de um texto. */
export interface TokensResolvidos {
  /** texto sem os tokens (o que vira título). */
  textoLimpo: string
  pessoa?: string
  categoria?: string
  projetoId?: string
  projetoNome?: string
}

const RE_TOKEN = /(^|\s)([#@])([\p{L}\p{N}_-]+)/gu

/** Extrai `#`/`@` de um texto e resolve contra as fontes conhecidas. */
export function resolverTokens(texto: string, fontes: FontesTokens): TokensResolvidos {
  const r: TokensResolvidos = { textoLimpo: texto }
  let limpo = texto
  const matches = [...texto.matchAll(RE_TOKEN)]
  for (const m of matches) {
    const [full, , sigilo, corpo] = m
    const alvo = semAcento(corpo)
    if (sigilo === '#') {
      const proj = fontes.projetos.find(
        (p) => semEspaco(semAcento(p.nome)) === alvo || semAcento(p.nome) === alvo,
      )
      if (proj && !r.projetoId) {
        r.projetoId = proj.id
        r.projetoNome = proj.nome
      } else if (!r.categoria) {
        const cat = fontes.categorias.find((c) => semEspaco(semAcento(c)) === alvo)
        r.categoria = cat ?? corpo[0].toUpperCase() + corpo.slice(1)
      }
    } else if (sigilo === '@' && !r.pessoa) {
      const pes = fontes.pessoas.find((p) => semEspaco(semAcento(p)) === alvo)
      r.pessoa = pes ?? corpo
    }
    limpo = limpo.replace(full, m[1] ? ' ' : '')
  }
  r.textoLimpo = limpo.replace(/\s+/g, ' ').trim()
  return r
}

/** Token que está sendo digitado logo antes do cursor (para o autocomplete). */
export function tokenAtivo(texto: string, caret: number): { sigilo: '#' | '@'; query: string; inicio: number } | null {
  const antes = texto.slice(0, caret)
  const m = antes.match(/([#@])([\p{L}\p{N}_-]*)$/u)
  if (!m) return null
  // Só ativa logo após início ou espaço, para não pegar e-mails etc.
  const idx = caret - m[0].length
  if (idx > 0 && !/\s/.test(texto[idx - 1])) return null
  return { sigilo: m[1] as '#' | '@', query: semAcento(m[2]), inicio: idx }
}

/** Filtra as sugestões para o token ativo. */
export function sugestoesPara(
  ativo: { sigilo: '#' | '@'; query: string },
  fontes: FontesTokens,
): Sugestao[] {
  const q = ativo.query
  const casa = (s: string) => !q || semAcento(s).includes(q)
  if (ativo.sigilo === '@') {
    return fontes.pessoas
      .filter(casa)
      .slice(0, 6)
      .map((p) => ({ tipo: 'pessoa', rotulo: p, token: semEspaco(p) }))
  }
  const proj: Sugestao[] = fontes.projetos
    .filter((p) => casa(p.nome))
    .slice(0, 5)
    .map((p) => ({ tipo: 'projeto', rotulo: p.nome, token: semEspaco(p.nome), id: p.id, cor: p.cor }))
  const cat: Sugestao[] = fontes.categorias
    .filter(casa)
    .slice(0, 5)
    .map((c) => ({ tipo: 'categoria', rotulo: c, token: semEspaco(c) }))
  return [...proj, ...cat].slice(0, 8)
}
