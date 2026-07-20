import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EmptyState } from '../../core/components/EmptyState'
import { IconLivro, IconMais, IconLixeira, IconSetaEsquerda } from '../../core/components/Icons'
import { AdicionarLivro } from './components/AdicionarLivro'
import { CartaoLivro } from './components/CartaoLivro'
import { EditorTags } from './components/EditorTags'
import { removerCompilado, rotuloTipo, salvarLivro } from './db'
import { useLivro, useVolumes } from './hooks'
import { gerarMiniatura } from './importar'
import type { Livro } from './types'

/** Página de um compilado (série de quadrinho/mangá): capa + volumes. */
export function CompiladoPage() {
  const { id } = useParams()
  const compilado = useLivro(id)
  const volumes = useVolumes(id)
  const navigate = useNavigate()
  const inputCapa = useRef<HTMLInputElement>(null)
  const [titulo, setTitulo] = useState('')
  const [adicionando, setAdicionando] = useState(false)

  useEffect(() => {
    if (compilado) setTitulo(compilado.titulo)
  }, [compilado?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (compilado === undefined) {
    return <p className="py-16 text-center text-sm text-muted">Carregando…</p>
  }
  if (compilado === null || !compilado.ehCompilado) {
    return (
      <div className="py-16 text-center text-sm text-muted">
        Compilado não encontrado.{' '}
        <Link to="/biblioteca" className="underline">
          Voltar
        </Link>
      </div>
    )
  }

  const salvar = (mudancas: Partial<Livro>) => salvarLivro({ ...compilado, ...mudancas })
  const ordenados = [...(volumes ?? [])].sort(
    (a, b) => (a.numero ?? 9999) - (b.numero ?? 9999) || a.titulo.localeCompare(b.titulo),
  )

  async function excluir() {
    if (!confirm(`Excluir o compilado "${compilado!.titulo}" e todos os seus volumes? Isso não pode ser desfeito.`))
      return
    await removerCompilado(compilado!.id)
    navigate('/biblioteca')
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <Link to="/biblioteca" className="flex items-center gap-1 text-[13px] text-muted hover:text-ink">
        <IconSetaEsquerda width={16} height={16} />
        Biblioteca
      </Link>

      <div className="flex gap-4">
        <div className="w-28 shrink-0">
          <button
            onClick={() => inputCapa.current?.click()}
            className="flex aspect-[2/3] w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-line bg-surface shadow-sm transition-colors hover:border-muted/50"
            aria-label={compilado.capa ? 'Trocar capa' : 'Adicionar capa'}
          >
            {compilado.capa ? (
              <img src={compilado.capa} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-muted/60">
                <IconLivro width={26} height={26} />
                <span className="text-[11px]">Adicionar capa</span>
              </span>
            )}
          </button>
          <input
            ref={inputCapa}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              const mini = await gerarMiniatura(f, 400)
              if (mini) salvar({ capa: mini })
            }}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onBlur={() => titulo.trim() && salvar({ titulo: titulo.trim() })}
            className="w-full bg-transparent text-lg font-bold outline-none"
            placeholder="Nome da série"
          />
          <span className="text-[12px] text-muted/70">
            Compilado · {rotuloTipo(compilado.tipo)} · {ordenados.length} volume{ordenados.length === 1 ? '' : 's'}
          </span>
          <EditorTags
            tags={compilado.generos ?? []}
            onChange={(t) => salvar({ generos: t.length ? t : undefined })}
            rotulo="Gêneros"
            placeholder="ex.: ação, aventura"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">Volumes</h2>
        <button
          onClick={() => setAdicionando(true)}
          className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full bg-ink px-4 text-[14px] font-medium text-surface transition-opacity hover:opacity-90"
        >
          <IconMais width={16} height={16} />
          Adicionar volume
        </button>
      </div>

      {ordenados.length === 0 ? (
        <EmptyState
          icone={<IconLivro />}
          titulo="Sem volumes ainda"
          descricao="Adicione o primeiro volume desta série — cada um com seu próprio arquivo."
        />
      ) : (
        <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {ordenados.map((v) => (
            <CartaoLivro key={v.id} livro={v} />
          ))}
        </div>
      )}

      <button
        onClick={excluir}
        className="flex items-center gap-1.5 self-start text-[13px] text-red-500 hover:text-red-600"
      >
        <IconLixeira width={16} height={16} />
        Excluir compilado
      </button>

      {adicionando && (
        <AdicionarLivro
          onFechar={() => setAdicionando(false)}
          compiladoAlvo={{ id: compilado.id, tipo: compilado.tipo, titulo: compilado.titulo }}
        />
      )}
    </div>
  )
}
