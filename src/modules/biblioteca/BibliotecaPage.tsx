import { useMemo, useState } from 'react'
import { EmptyState } from '../../core/components/EmptyState'
import { IconLivro, IconMais } from '../../core/components/Icons'
import { CartaoLivro } from './components/CartaoLivro'
import { AdicionarLivro } from './components/AdicionarLivro'
import { useLivros } from './hooks'
import type { StatusLeitura } from './types'

type Filtro = 'todos' | StatusLeitura

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'lendo', rotulo: 'Lendo' },
  { valor: 'quero_ler', rotulo: 'Quero ler' },
  { valor: 'lido', rotulo: 'Lido' },
  { valor: 'abandonado', rotulo: 'Abandonei' },
]

export function BibliotecaPage() {
  const livros = useLivros()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busca, setBusca] = useState('')
  const [adicionando, setAdicionando] = useState(false)

  const visiveis = useMemo(() => {
    const b = busca.trim().toLowerCase()
    return [...(livros ?? [])]
      .filter((l) => (filtro === 'todos' ? true : l.status === filtro))
      .filter(
        (l) =>
          !b ||
          l.titulo.toLowerCase().includes(b) ||
          (l.autor ?? '').toLowerCase().includes(b),
      )
      .sort((a, b2) => (b2.atualizadoEm ?? b2.adicionadoEm) - (a.atualizadoEm ?? a.adicionadoEm))
  }, [livros, filtro, busca])

  const vazio = livros && (livros.length === 0 || visiveis.length === 0)

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Biblioteca</h1>
        <button
          onClick={() => setAdicionando(true)}
          className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full bg-ink px-4 text-[14px] font-medium text-surface transition-opacity hover:opacity-90"
        >
          <IconMais width={16} height={16} />
          Adicionar
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por título ou autor…"
          className="min-h-10 w-full rounded-lg border border-line bg-surface px-3 text-[14px] outline-none focus:border-muted/60"
        />
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              onClick={() => setFiltro(f.valor)}
              className={`min-h-8 cursor-pointer rounded-full px-3 text-[13px] font-medium transition-colors ${
                filtro === f.valor ? 'bg-ink text-surface' : 'bg-hover text-muted hover:text-ink'
              }`}
            >
              {f.rotulo}
            </button>
          ))}
        </div>
      </div>

      {vazio ? (
        <EmptyState
          icone={<IconLivro />}
          titulo={busca || filtro !== 'todos' ? 'Nada aqui' : 'Sua estante está vazia'}
          descricao={
            busca || filtro !== 'todos'
              ? 'Tente outro filtro ou busca.'
              : 'Adicione um livro, quadrinho ou mangá — com ou sem o arquivo.'
          }
        />
      ) : (
        <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {visiveis.map((l) => (
            <CartaoLivro key={l.id} livro={l} />
          ))}
        </div>
      )}

      {adicionando && <AdicionarLivro onFechar={() => setAdicionando(false)} />}
    </div>
  )
}
