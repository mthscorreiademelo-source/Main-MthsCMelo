import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, IconButton } from '../../../core/components/Button'
import {
  IconAbrir,
  IconArquivo,
  IconDocumento,
  IconDownload,
  IconFechar,
  IconImagem,
  IconLixeira,
  IconMais,
  IconMusica,
  IconPasta,
  IconVideo,
} from '../../../core/components/Icons'
import { EmptyState } from '../../../core/components/EmptyState'
import {
  categoriaDe,
  excluirArquivo,
  extensaoDe,
  formatarTamanho,
  ORDEM_CATEGORIAS,
  ROTULO_CATEGORIA,
  salvarArquivo,
  textoDoArquivo,
  urlDoArquivo,
  type Categoria,
} from '../arquivos'
import type { ArquivoRef } from '../types'

const ICONE_CATEGORIA: Record<Categoria, typeof IconArquivo> = {
  imagem: IconImagem,
  video: IconVideo,
  audio: IconMusica,
  pdf: IconDocumento,
  texto: IconDocumento,
  outro: IconArquivo,
}

interface Props {
  arquivos: ArquivoRef[]
  onMudar: (arquivos: ArquivoRef[]) => void
}

export function ArquivosPainel({ arquivos, onMudar }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [ocupado, setOcupado] = useState(false)
  const [preview, setPreview] = useState<ArquivoRef | null>(null)

  const porCategoria = useMemo(() => {
    const mapa = new Map<Categoria, ArquivoRef[]>()
    for (const a of arquivos) {
      const c = categoriaDe(a)
      if (!mapa.has(c)) mapa.set(c, [])
      mapa.get(c)!.push(a)
    }
    return mapa
  }, [arquivos])

  async function adicionar(lista: FileList) {
    setOcupado(true)
    try {
      const novos: ArquivoRef[] = []
      for (const arquivo of Array.from(lista)) {
        novos.push(await salvarArquivo(arquivo))
      }
      onMudar([...arquivos, ...novos])
    } finally {
      setOcupado(false)
    }
  }

  async function remover(ref: ArquivoRef) {
    await excluirArquivo(ref.id)
    onMudar(arquivos.filter((a) => a.id !== ref.id))
  }

  return (
    <div className="flex flex-col gap-5">
      <button
        onClick={() => inputRef.current?.click()}
        disabled={ocupado}
        className="flex min-h-12 cursor-pointer items-center gap-1 rounded-lg border border-dashed border-line bg-surface/60 px-2 text-[15px] text-muted transition-colors hover:border-muted/50 hover:text-ink disabled:opacity-60"
      >
        <span className="flex size-11 items-center justify-center">
          <IconMais />
        </span>
        {ocupado ? 'Importando…' : 'Adicionar arquivos'}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) adicionar(e.target.files)
          e.target.value = ''
        }}
      />

      {arquivos.length === 0 && (
        <EmptyState
          icone={<IconPasta />}
          titulo="Nenhum arquivo ainda"
          descricao="Importe PDFs, imagens, vídeos, áudios, textos — eles ficam agrupados por tipo aqui."
        />
      )}

      {ORDEM_CATEGORIAS.filter((c) => porCategoria.has(c)).map((c) => {
        const lista = porCategoria.get(c)!
        const Icone = ICONE_CATEGORIA[c]
        return (
          <section key={c} className="flex flex-col gap-2">
            <h3 className="flex items-center gap-1.5 px-1 text-[13px] font-medium text-muted">
              <Icone width={15} height={15} />
              {ROTULO_CATEGORIA[c]} · {lista.length}
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {lista.map((a) => (
                <CartaoArquivo
                  key={a.id}
                  arquivo={a}
                  onAbrir={() => setPreview(a)}
                  onExcluir={() => remover(a)}
                />
              ))}
            </div>
          </section>
        )
      })}

      {preview && <Visualizador arquivo={preview} onFechar={() => setPreview(null)} />}
    </div>
  )
}

function CartaoArquivo({
  arquivo,
  onAbrir,
  onExcluir,
}: {
  arquivo: ArquivoRef
  onAbrir: () => void
  onExcluir: () => void
}) {
  const [confirmando, setConfirmando] = useState(false)
  const cat = categoriaDe(arquivo)
  const Icone = ICONE_CATEGORIA[cat]
  const [thumb, setThumb] = useState<string | null>(null)

  // miniatura para imagens
  useEffect(() => {
    let url: string | null = null
    let vivo = true
    if (cat === 'imagem') {
      urlDoArquivo(arquivo.id).then((u) => {
        if (vivo && u) {
          url = u
          setThumb(u)
        } else if (u) URL.revokeObjectURL(u)
      })
    }
    return () => {
      vivo = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [arquivo.id, cat])

  async function baixar() {
    const url = await urlDoArquivo(arquivo.id)
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = arquivo.nome
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border border-line">
      <button
        onClick={onAbrir}
        aria-label={`Abrir ${arquivo.nome}`}
        className="flex aspect-video cursor-pointer items-center justify-center bg-surface"
      >
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-muted">
            <Icone width={26} height={26} />
            {extensaoDe(arquivo.nome) && (
              <span className="text-[11px] font-semibold tracking-wide">
                {extensaoDe(arquivo.nome)}
              </span>
            )}
          </span>
        )}
      </button>
      <div className="flex items-center gap-1 px-2 py-1.5">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{arquivo.nome}</span>
          <span className="block text-[11px] text-muted">{formatarTamanho(arquivo.tamanho)}</span>
        </span>
        <IconButton onClick={baixar} aria-label="Baixar" className="size-8">
          <IconDownload width={16} height={16} />
        </IconButton>
        <IconButton
          onClick={() => {
            if (!confirmando) {
              setConfirmando(true)
              setTimeout(() => setConfirmando(false), 3000)
            } else {
              onExcluir()
            }
          }}
          aria-label={confirmando ? 'Confirmar exclusão' : 'Excluir arquivo'}
          className={`size-8 ${confirmando ? 'text-danger' : ''}`}
        >
          <IconLixeira width={16} height={16} />
        </IconButton>
      </div>
    </div>
  )
}

function Visualizador({ arquivo, onFechar }: { arquivo: ArquivoRef; onFechar: () => void }) {
  const cat = categoriaDe(arquivo)
  const [url, setUrl] = useState<string | null>(null)
  const [texto, setTexto] = useState<string | null>(null)

  useEffect(() => {
    let u: string | null = null
    let vivo = true
    if (cat === 'texto') {
      textoDoArquivo(arquivo.id).then((t) => vivo && setTexto(t))
    } else {
      urlDoArquivo(arquivo.id).then((r) => {
        if (vivo && r) {
          u = r
          setUrl(r)
        } else if (r) URL.revokeObjectURL(r)
      })
    }
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', aoTeclar)
    return () => {
      vivo = false
      if (u) URL.revokeObjectURL(u)
      window.removeEventListener('keydown', aoTeclar)
    }
  }, [arquivo.id, cat, onFechar])

  async function baixar() {
    const u = url ?? (await urlDoArquivo(arquivo.id))
    if (!u) return
    const a = document.createElement('a')
    a.href = u
    a.download = arquivo.nome
    a.click()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/70">
      <header className="flex items-center gap-2 px-3 py-2 text-white">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{arquivo.nome}</span>
        <button
          onClick={baixar}
          className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-medium hover:bg-white/15"
        >
          <IconDownload width={16} height={16} />
          Baixar
        </button>
        <IconButton onClick={onFechar} aria-label="Fechar" className="text-white hover:bg-white/15 hover:text-white">
          <IconFechar />
        </IconButton>
      </header>
      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        {cat === 'imagem' && url && (
          <img src={url} alt="" className="max-h-full max-w-full object-contain" />
        )}
        {cat === 'video' && url && (
          <video src={url} controls autoPlay className="max-h-full max-w-full rounded-lg" />
        )}
        {cat === 'audio' && url && (
          <audio src={url} controls autoPlay className="w-full max-w-md" />
        )}
        {cat === 'pdf' && url && (
          <iframe src={url} title={arquivo.nome} className="h-full w-full rounded-lg bg-white" />
        )}
        {cat === 'texto' && texto !== null && (
          <pre className="max-h-full w-full max-w-2xl overflow-auto rounded-lg bg-bg p-4 text-[13px] whitespace-pre-wrap text-ink">
            {texto}
          </pre>
        )}
        {cat === 'outro' && (
          <div className="flex flex-col items-center gap-3 text-white">
            <IconArquivo width={48} height={48} />
            <p className="text-sm">Este tipo de arquivo não tem pré-visualização.</p>
            <Button variante="primaria" onClick={baixar}>
              <IconAbrir width={16} height={16} />
              Baixar arquivo
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
