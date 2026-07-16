import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { IconAbrir, IconLivro, IconLixeira, IconSetaEsquerda } from '../../core/components/Icons'
import { rotuloData } from '../../core/dates'
import { EstrelasNota } from './components/EstrelasNota'
import { removerLivro, rotuloTipo, salvarLivro, STATUS } from './db'
import { useLivro } from './hooks'
import { gerarMiniatura } from './importar'
import type { Livro, StatusLeitura } from './types'

const CAMPO =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-[15px] outline-none focus:border-muted/60'

function tamanhoLegivel(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function LivroPage() {
  const { id } = useParams()
  const livro = useLivro(id)
  const navigate = useNavigate()

  const [titulo, setTitulo] = useState('')
  const [autor, setAutor] = useState('')
  const [resenha, setResenha] = useState('')
  const [generos, setGeneros] = useState('')
  const inputCapa = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!livro) return
    setTitulo(livro.titulo)
    setAutor(livro.autor ?? '')
    setResenha(livro.resenha ?? '')
    setGeneros((livro.generos ?? []).join(', '))
  }, [livro?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (livro === undefined) {
    return <p className="py-16 text-center text-sm text-muted">Carregando…</p>
  }
  if (livro === null) {
    return (
      <div className="py-16 text-center text-sm text-muted">
        Livro não encontrado.{' '}
        <Link to="/biblioteca" className="underline">
          Voltar
        </Link>
      </div>
    )
  }

  const salvar = (mudancas: Partial<Livro>) => salvarLivro({ ...livro, ...mudancas })

  async function excluir() {
    if (!confirm('Remover este livro da biblioteca? O arquivo local também será apagado.')) return
    await removerLivro(livro!.id)
    navigate('/biblioteca')
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <Link to="/biblioteca" className="flex items-center gap-1 text-[13px] text-muted hover:text-ink">
        <IconSetaEsquerda width={16} height={16} />
        Biblioteca
      </Link>

      <div className="flex gap-4">
        <div className="flex w-28 shrink-0 flex-col gap-1.5">
          <button
            onClick={() => inputCapa.current?.click()}
            className="flex aspect-[2/3] w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-line bg-surface shadow-sm transition-colors hover:border-muted/50"
            aria-label={livro.capa ? 'Trocar capa' : 'Adicionar capa'}
          >
            {livro.capa ? (
              <img src={livro.capa} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-muted/60">
                <IconLivro width={26} height={26} />
                <span className="text-[11px]">Adicionar capa</span>
              </span>
            )}
          </button>
          {livro.capa && (
            <button
              onClick={() => salvar({ capa: undefined })}
              className="text-[11px] text-muted transition-colors hover:text-ink"
            >
              remover capa
            </button>
          )}
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
            placeholder="Título"
          />
          <input
            value={autor}
            onChange={(e) => setAutor(e.target.value)}
            onBlur={() => salvar({ autor: autor.trim() || undefined })}
            className="w-full bg-transparent text-[14px] text-muted outline-none"
            placeholder="Autor"
          />
          <EstrelasNota nota={livro.nota ?? 0} onChange={(n) => salvar({ nota: n })} />
          <span className="text-[12px] text-muted/70">
            {rotuloTipo(livro.tipo)} · adicionado {rotuloData(new Date(livro.adicionadoEm).toISOString().slice(0, 10))}
          </span>
        </div>
      </div>

      {/* Estante (status) */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS.map((s) => (
          <button
            key={s.valor}
            onClick={() => salvar({ status: s.valor as StatusLeitura })}
            className={`min-h-9 cursor-pointer rounded-full px-3.5 text-[13px] font-medium transition-colors ${
              livro.status === s.valor ? 'bg-ink text-surface' : 'bg-hover text-muted hover:text-ink'
            }`}
          >
            {s.rotulo}
          </button>
        ))}
      </div>

      {/* Progresso */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[13px] font-medium text-muted">
          <span>Progresso</span>
          <span>{livro.progresso ?? 0}%{livro.paginasTotais ? ` · ${livro.paginasTotais} pág.` : ''}</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={livro.progresso ?? 0}
          onChange={(e) => salvar({ progresso: Number(e.target.value) })}
          className="w-full accent-ink"
        />
      </div>

      {/* Resenha */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-muted">Resenha</span>
        <textarea
          value={resenha}
          onChange={(e) => setResenha(e.target.value)}
          onBlur={() => salvar({ resenha: resenha.trim() || undefined })}
          rows={4}
          placeholder="O que você achou?"
          className={CAMPO}
        />
      </label>

      {/* Gêneros */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-muted">Gêneros / tags</span>
        <input
          value={generos}
          onChange={(e) => setGeneros(e.target.value)}
          onBlur={() =>
            salvar({
              generos: generos
                .split(',')
                .map((g) => g.trim())
                .filter(Boolean),
            })
          }
          placeholder="ex.: ficção, fantasia"
          className={CAMPO}
        />
      </label>

      {livro.temArquivo && (
        <div className="flex flex-col gap-2">
          <Link
            to={`/biblioteca/${livro.id}/ler`}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ink text-[15px] font-medium text-surface transition-opacity hover:opacity-90"
          >
            <IconAbrir width={18} height={18} />
            {(livro.progresso ?? 0) > 0 ? 'Continuar lendo' : 'Ler'}
          </Link>
          <p className="text-[12px] text-muted/80">
            Arquivo: {livro.arquivoNome} ({livro.formato?.toUpperCase()} · {tamanhoLegivel(livro.arquivoTamanho)})
          </p>
        </div>
      )}

      <button
        onClick={excluir}
        className="flex items-center gap-1.5 self-start text-[13px] text-red-500 hover:text-red-600"
      >
        <IconLixeira width={16} height={16} />
        Remover
      </button>
    </div>
  )
}
