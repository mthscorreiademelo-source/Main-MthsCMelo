import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../../../core/components/EmptyState'
import { IconLivro } from '../../../core/components/Icons'
import { CartaoLivro } from './CartaoLivro'
import { autoresDe, statusDerivadoSerie } from '../db'
import { useLivros } from '../hooks'
import type { Livro, StatusLeitura } from '../types'

type Filtro = 'todos' | StatusLeitura
type Criterio = 'atualizado' | 'adicionado' | 'titulo' | 'autor' | 'ano' | 'nota'

const CRITERIOS: { valor: Criterio; rotulo: string }[] = [
  { valor: 'atualizado', rotulo: 'Recentes' },
  { valor: 'adicionado', rotulo: 'Adição' },
  { valor: 'titulo', rotulo: 'Título' },
  { valor: 'autor', rotulo: 'Autor' },
  { valor: 'ano', rotulo: 'Ano' },
  { valor: 'nota', rotulo: 'Nota' },
]

function compararPor(criterio: Criterio, a: Livro, b: Livro): number {
  let d: number
  switch (criterio) {
    case 'adicionado': d = a.adicionadoEm - b.adicionadoEm; break
    case 'titulo': d = a.titulo.localeCompare(b.titulo, 'pt', { sensitivity: 'base' }); break
    case 'autor': d = (autoresDe(a)[0] ?? '~').localeCompare(autoresDe(b)[0] ?? '~', 'pt', { sensitivity: 'base' }); break
    case 'ano': d = (a.ano ?? 0) - (b.ano ?? 0); break
    case 'nota': d = (a.nota ?? 0) - (b.nota ?? 0); break
    default: d = (a.atualizadoEm ?? a.adicionadoEm) - (b.atualizadoEm ?? b.adicionadoEm)
  }
  return d || a.titulo.localeCompare(b.titulo, 'pt', { sensitivity: 'base' })
}

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'lendo', rotulo: 'Lendo' },
  { valor: 'quero_ler', rotulo: 'Quero ler' },
  { valor: 'lido', rotulo: 'Lido' },
  { valor: 'abandonado', rotulo: 'Abandonei' },
]

const SENTINELA_AVULSO = ' avulsos'

/** A estante: busca, filtros, ordenação, gêneros e grade de capas. */
export function Estante({ generoInicial }: { generoInicial?: string | null }) {
  const livros = useLivros()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [genero, setGenero] = useState<string | null>(generoInicial ?? null)
  const [busca, setBusca] = useState('')
  const [agrupar, setAgrupar] = useState(false)
  const [ordenarPor, setOrdenarPor] = useState<Criterio>(() => (localStorage.getItem('lume:bib:sort') as Criterio) || 'atualizado')
  const [asc, setAsc] = useState(() => localStorage.getItem('lume:bib:sortDir') === 'asc')
  useEffect(() => localStorage.setItem('lume:bib:sort', ordenarPor), [ordenarPor])
  useEffect(() => localStorage.setItem('lume:bib:sortDir', asc ? 'asc' : 'desc'), [asc])
  useEffect(() => { if (generoInicial !== undefined) setGenero(generoInicial) }, [generoInicial])

  function mudarCriterio(c: Criterio) { setOrdenarPor(c); setAsc(c === 'titulo' || c === 'autor') }

  const volumesPorSerie = useMemo(() => {
    const m = new Map<string, Livro[]>()
    for (const l of livros ?? []) {
      if (!l.compiladoId) continue
      const arr = m.get(l.compiladoId) ?? []
      arr.push(l); m.set(l.compiladoId, arr)
    }
    return m
  }, [livros])
  const contagemVol = (id: string) => volumesPorSerie.get(id)?.length ?? 0
  const statusEfetivo = (l: Livro) => (l.ehCompilado ? statusDerivadoSerie(volumesPorSerie.get(l.id) ?? []) : l.status)

  const generos = useMemo(() => {
    const conta = new Map<string, number>()
    for (const l of livros ?? []) {
      if (l.compiladoId) continue
      for (const g of l.generos ?? []) conta.set(g, (conta.get(g) ?? 0) + 1)
    }
    return [...conta.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [livros])

  const visiveis = useMemo(() => {
    const b = busca.trim().toLowerCase()
    return [...(livros ?? [])]
      .filter((l) => !l.compiladoId)
      .filter((l) => (filtro === 'todos' ? true : statusEfetivo(l) === filtro))
      .filter((l) => !genero || (l.generos ?? []).includes(genero))
      .filter((l) => !b || l.titulo.toLowerCase().includes(b) || autoresDe(l).some((a) => a.toLowerCase().includes(b)) || (l.colecao ?? '').toLowerCase().includes(b) || (l.generos ?? []).some((g) => g.toLowerCase().includes(b)))
      .sort((a, b2) => (asc ? 1 : -1) * compararPor(ordenarPor, a, b2))
  }, [livros, filtro, genero, busca, ordenarPor, asc]) // eslint-disable-line react-hooks/exhaustive-deps

  const grupos = useMemo(() => {
    if (!agrupar) return null
    const mapa = new Map<string, typeof visiveis>()
    for (const l of visiveis) {
      const k = l.colecao?.trim() || SENTINELA_AVULSO
      const arr = mapa.get(k) ?? []
      arr.push(l); mapa.set(k, arr)
    }
    const entradas = [...mapa.entries()].map(([k, arr]) => ({
      nome: k === SENTINELA_AVULSO ? 'Avulsos' : k, avulso: k === SENTINELA_AVULSO,
      livros: [...arr].sort((a, b) => (a.numero ?? 9999) - (b.numero ?? 9999) || a.titulo.localeCompare(b.titulo)),
    }))
    entradas.sort((a, b) => (a.avulso === b.avulso ? a.nome.localeCompare(b.nome) : a.avulso ? 1 : -1))
    return entradas
  }, [visiveis, agrupar])

  const vazio = livros && (livros.length === 0 || visiveis.length === 0)

  return (
    <div className="flex flex-col gap-3">
      <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por título, autor ou gênero…" className="min-h-10 w-full rounded-lg border border-line bg-surface px-3 text-[14px] outline-none focus:border-muted/60" />
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTROS.map((f) => (
          <button key={f.valor} onClick={() => setFiltro(f.valor)} className={`min-h-8 rounded-full px-3 text-[13px] font-medium transition-colors ${filtro === f.valor ? 'bg-ink text-surface' : 'bg-hover text-muted hover:text-ink'}`}>{f.rotulo}</button>
        ))}
        <span className="flex-1" />
        <select value={ordenarPor} onChange={(e) => mudarCriterio(e.target.value as Criterio)} aria-label="Ordenar por" className="min-h-8 rounded-full bg-hover px-3 text-[13px] font-medium text-muted outline-none hover:text-ink">
          {CRITERIOS.map((c) => <option key={c.valor} value={c.valor}>{c.rotulo}</option>)}
        </select>
        <button onClick={() => setAsc((v) => !v)} aria-label={asc ? 'Crescente' : 'Decrescente'} className="flex min-h-8 w-8 items-center justify-center rounded-full bg-hover text-[14px] font-semibold text-muted hover:text-ink">{asc ? '↑' : '↓'}</button>
        <button onClick={() => setAgrupar((v) => !v)} className={`min-h-8 rounded-full px-3 text-[13px] font-medium transition-colors ${agrupar ? 'bg-ink text-surface' : 'bg-hover text-muted hover:text-ink'}`}>Por coleção</button>
      </div>
      {generos.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] font-medium text-muted/70">Gêneros:</span>
          {generos.map(([g, n]) => (
            <button key={g} onClick={() => setGenero((a) => (a === g ? null : g))} className={`min-h-7 rounded-full px-2.5 text-[12px] font-medium transition-colors ${genero === g ? 'bg-ink text-surface' : 'bg-hover text-muted hover:text-ink'}`}>{g} <span className="opacity-60">{n}</span></button>
          ))}
          {genero && <button onClick={() => setGenero(null)} className="min-h-7 px-1.5 text-[12px] text-muted hover:underline">limpar</button>}
        </div>
      )}
      {vazio ? (
        <EmptyState icone={<IconLivro />} titulo={busca || filtro !== 'todos' || genero ? 'Nada aqui' : 'Sua estante está vazia'} descricao={busca || filtro !== 'todos' || genero ? 'Tente outro filtro ou busca.' : 'Adicione um livro, quadrinho ou mangá — com ou sem o arquivo.'} />
      ) : grupos ? (
        <div className="flex flex-col gap-6">
          {grupos.map((g) => (
            <section key={g.nome} className="flex flex-col gap-2.5">
              <h2 className="px-0.5 text-[13px] font-semibold text-muted">{g.nome} <span className="font-normal opacity-60">· {g.livros.length}</span></h2>
              <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {g.livros.map((l) => <CartaoLivro key={l.id} livro={l} volumes={contagemVol(l.id)} status={statusEfetivo(l)} />)}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {visiveis.map((l) => <CartaoLivro key={l.id} livro={l} volumes={contagemVol(l.id)} status={statusEfetivo(l)} />)}
        </div>
      )}
    </div>
  )
}
