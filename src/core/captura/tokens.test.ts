import { describe, expect, it } from 'vitest'
import { resolverTokens, sugestoesPara, tokenAtivo, type FontesTokens } from './tokens'

const fontes: FontesTokens = {
  projetos: [
    { id: 'p1', nome: 'Trabalho' },
    { id: 'p2', nome: 'Casa Nova' },
  ],
  categorias: ['Mercado', 'Saúde'],
  pessoas: ['Ana', 'João Silva'],
}

describe('resolverTokens', () => {
  it('resolve #projeto pelo nome e limpa o título', () => {
    const r = resolverTokens('Ligar para cliente #Trabalho amanha', fontes)
    expect(r.projetoId).toBe('p1')
    expect(r.projetoNome).toBe('Trabalho')
    expect(r.textoLimpo).toBe('Ligar para cliente amanha')
  })

  it('casa projeto multi-palavra sem espaços e resolve @pessoa', () => {
    const r = resolverTokens('Reuniao #CasaNova com @Ana', fontes)
    expect(r.projetoId).toBe('p2')
    expect(r.pessoa).toBe('Ana')
    expect(r.textoLimpo).toBe('Reuniao com')
  })

  it('usa categoria conhecida quando o # não é projeto', () => {
    const r = resolverTokens('Gastei no #Mercado', fontes)
    expect(r.categoria).toBe('Mercado')
    expect(r.projetoId).toBeUndefined()
  })

  it('trata # desconhecido como categoria livre', () => {
    const r = resolverTokens('Ideia #ProjetoNovo', fontes)
    expect(r.categoria).toBe('ProjetoNovo')
  })
})

describe('tokenAtivo (autocomplete)', () => {
  it('detecta o token sendo digitado após espaço', () => {
    expect(tokenAtivo('ola #Tra', 8)).toEqual({ sigilo: '#', query: 'tra', inicio: 4 })
  })
  it('não ativa dentro de um e-mail (sem espaço antes do @)', () => {
    expect(tokenAtivo('a@b', 3)).toBeNull()
  })
  it('ativa no início do texto', () => {
    expect(tokenAtivo('@An', 3)?.sigilo).toBe('@')
  })
})

describe('sugestoesPara', () => {
  it('# sugere projetos e categorias', () => {
    const s = sugestoesPara({ sigilo: '#', query: '' }, fontes)
    expect(s.some((x) => x.tipo === 'projeto')).toBe(true)
    expect(s.some((x) => x.tipo === 'categoria')).toBe(true)
  })
  it('@ sugere só pessoas, filtrando por query', () => {
    const s = sugestoesPara({ sigilo: '@', query: 'ana' }, fontes)
    expect(s).toHaveLength(1)
    expect(s[0]).toMatchObject({ tipo: 'pessoa', rotulo: 'Ana' })
  })
})
