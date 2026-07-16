import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { IconChevron, IconFechar } from '../../../core/components/Icons'
import { obterArquivo, salvarLivro } from '../db'
import { useLivro } from '../hooks'
import { LeitorEpub } from './LeitorEpub'
import { LeitorPaginado } from './LeitorPaginado'
import { ORDEM_TEMAS, TEMAS, type Controles, type TemaLeitor } from './temas'

const CHAVE_TEMA = 'lume:leitor:tema'
const CHAVE_FONTE = 'lume:leitor:fonte'

type Preparo =
  | { modo: 'carregando' }
  | { modo: 'epub' }
  | { modo: 'paginado'; total: number; provider: (n: number) => Promise<string | undefined> }
  | { modo: 'erro'; msg: string }

const IMG_EXT = /\.(jpe?g|png|webp|gif|avif)$/i

export function LeitorPage() {
  const { id } = useParams()
  const livro = useLivro(id)
  const [blob, setBlob] = useState<Blob | null | undefined>(undefined)
  const [preparo, setPreparo] = useState<Preparo>({ modo: 'carregando' })
  const [chrome, setChrome] = useState(true)
  const [pct, setPct] = useState(0)

  const [tema, setTema] = useState<TemaLeitor>(
    () => (localStorage.getItem(CHAVE_TEMA) as TemaLeitor) || 'claro',
  )
  const [fontePct, setFontePct] = useState<number>(
    () => Number(localStorage.getItem(CHAVE_FONTE)) || 100,
  )
  useEffect(() => localStorage.setItem(CHAVE_TEMA, tema), [tema])
  useEffect(() => localStorage.setItem(CHAVE_FONTE, String(fontePct)), [fontePct])

  const controles = useRef<Controles | null>(null)
  const registrarControles = useCallback((c: Controles) => {
    controles.current = c
  }, [])

  // Carrega o arquivo local.
  useEffect(() => {
    if (!id) return
    let vivo = true
    obterArquivo(id).then((b) => vivo && setBlob(b ?? null))
    return () => {
      vivo = false
    }
  }, [id])

  // Ao abrir, quem só "queria ler" passa a estar "lendo".
  useEffect(() => {
    if (livro && livro.status === 'quero_ler') salvarLivro({ ...livro, status: 'lendo' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livro?.id])

  // Prepara o provedor de páginas para PDF/CBZ (EPUB é direto no engine).
  useEffect(() => {
    if (!blob || !livro) return
    let vivo = true
    const urls: string[] = []

    ;(async () => {
      try {
        if (livro.formato === 'epub') {
          if (vivo) setPreparo({ modo: 'epub' })
          return
        }
        if (livro.formato === 'cbz') {
          const { default: JSZip } = await import('jszip')
          const zip = await JSZip.loadAsync(blob)
          const nomes = Object.keys(zip.files)
            .filter((n) => IMG_EXT.test(n) && !zip.files[n].dir)
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
          const cache = new Map<number, string>()
          const provider = async (n: number) => {
            if (cache.has(n)) return cache.get(n)
            const b = await zip.file(nomes[n])?.async('blob')
            if (!b) return undefined
            const url = URL.createObjectURL(b)
            urls.push(url)
            cache.set(n, url)
            return url
          }
          if (vivo) setPreparo({ modo: 'paginado', total: nomes.length, provider })
          return
        }
        // PDF
        const pdfjs = await import('pdfjs-dist')
        const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default
        const doc = await pdfjs.getDocument({ data: await blob.arrayBuffer() }).promise
        const cache = new Map<number, string>()
        const provider = async (n: number) => {
          if (cache.has(n)) return cache.get(n)
          const pagina = await doc.getPage(n + 1)
          const base = pagina.getViewport({ scale: 1 })
          const escala = Math.min(2.5, 1400 / base.width)
          const viewport = pagina.getViewport({ scale: escala })
          const canvas = document.createElement('canvas')
          canvas.width = Math.round(viewport.width)
          canvas.height = Math.round(viewport.height)
          const ctx = canvas.getContext('2d')!
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          await pagina.render({ canvasContext: ctx, viewport }).promise
          const url = canvas.toDataURL('image/jpeg', 0.8)
          cache.set(n, url)
          return url
        }
        if (vivo) setPreparo({ modo: 'paginado', total: doc.numPages, provider })
      } catch (e) {
        if (vivo) setPreparo({ modo: 'erro', msg: (e as Error).message })
      }
    })()

    return () => {
      vivo = false
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [blob, livro?.id, livro?.formato]) // eslint-disable-line react-hooks/exhaustive-deps

  // Salva o progresso (com debounce) de volta no livro.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onProgresso = useCallback(
    (novoPct: number, localizacao: string) => {
      setPct(novoPct)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        if (!livro) return
        salvarLivro({ ...livro, progresso: novoPct, localizacao })
      }, 700)
    },
    [livro],
  )

  const inicialPaginado = useMemo(() => {
    const n = Number(livro?.localizacao)
    return Number.isFinite(n) ? n : 0
  }, [livro?.localizacao])

  const cores = TEMAS[tema]

  if (livro === null) {
    return <Ausente texto="Livro não encontrado." />
  }
  if (blob === null) {
    return (
      <Ausente texto="O arquivo deste livro não está neste aparelho. Importe-o aqui para ler." />
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" style={{ backgroundColor: cores.bg, color: cores.fg }}>
      {/* Conteúdo do leitor */}
      <div className="absolute inset-0">
        {preparo.modo === 'carregando' && (
          <div className="flex h-full items-center justify-center text-sm opacity-70">Abrindo…</div>
        )}
        {preparo.modo === 'erro' && (
          <div className="flex h-full items-center justify-center px-8 text-center text-sm opacity-80">
            Não consegui abrir este arquivo. ({preparo.msg})
          </div>
        )}
        {preparo.modo === 'epub' && blob && (
          <LeitorEpub
            blob={blob}
            tema={tema}
            fontePct={fontePct}
            inicial={livro?.localizacao}
            onProgresso={onProgresso}
            registrarControles={registrarControles}
          />
        )}
        {preparo.modo === 'paginado' && (
          <LeitorPaginado
            total={preparo.total}
            provider={preparo.provider}
            inicial={inicialPaginado}
            onProgresso={onProgresso}
            registrarControles={registrarControles}
          />
        )}
      </div>

      {/* Zonas de toque: esquerda (anterior), centro (mostrar/ocultar barras), direita (próxima) */}
      <div className="absolute inset-0 z-10 flex">
        <button className="h-full w-[30%] cursor-w-resize" aria-label="Página anterior" onClick={() => controles.current?.prev()} />
        <button className="h-full flex-1" aria-label="Mostrar controles" onClick={() => setChrome((v) => !v)} />
        <button className="h-full w-[30%] cursor-e-resize" aria-label="Próxima página" onClick={() => controles.current?.next()} />
      </div>

      {/* Barra superior */}
      {chrome && (
        <div
          className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 px-3 py-2.5 backdrop-blur"
          style={{ backgroundColor: `${cores.bg}e6` }}
        >
          <Link
            to={`/biblioteca/${id}`}
            className="flex size-9 items-center justify-center rounded-full hover:bg-black/10"
            aria-label="Fechar leitor"
          >
            <IconFechar width={18} height={18} />
          </Link>
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{livro?.titulo}</span>
          {livro?.formato === 'epub' && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFontePct((f) => Math.max(70, f - 10))}
                className="flex size-9 items-center justify-center rounded-full text-[13px] hover:bg-black/10"
                aria-label="Diminuir fonte"
              >
                A−
              </button>
              <button
                onClick={() => setFontePct((f) => Math.min(180, f + 10))}
                className="flex size-9 items-center justify-center rounded-full text-[17px] font-semibold hover:bg-black/10"
                aria-label="Aumentar fonte"
              >
                A+
              </button>
            </div>
          )}
          <button
            onClick={() =>
              setTema((t) => ORDEM_TEMAS[(ORDEM_TEMAS.indexOf(t) + 1) % ORDEM_TEMAS.length])
            }
            className="flex h-9 items-center rounded-full border px-3 text-[13px] font-medium"
            style={{ borderColor: `${cores.fg}33` }}
            aria-label="Trocar tema"
          >
            {tema === 'claro' ? 'Claro' : tema === 'sepia' ? 'Sépia' : 'Escuro'}
          </button>
        </div>
      )}

      {/* Barra inferior */}
      {chrome && (
        <div
          className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-3 px-4 py-3 backdrop-blur"
          style={{ backgroundColor: `${cores.bg}e6` }}
        >
          <button
            onClick={() => controles.current?.prev()}
            className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-black/10"
            aria-label="Página anterior"
          >
            <IconChevron width={18} height={18} style={{ transform: 'rotate(90deg)' }} />
          </button>
          <div className="flex-1">
            <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: `${cores.fg}22` }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cores.fg }} />
            </div>
          </div>
          <span className="w-10 shrink-0 text-right text-[12px] tabular-nums opacity-70">{pct}%</span>
          <button
            onClick={() => controles.current?.next()}
            className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-black/10"
            aria-label="Próxima página"
          >
            <IconChevron width={18} height={18} style={{ transform: 'rotate(-90deg)' }} />
          </button>
        </div>
      )}
    </div>
  )
}

function Ausente({ texto }: { texto: string }) {
  const { id } = useParams()
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
      <p className="text-sm text-muted">{texto}</p>
      <Link to={`/biblioteca/${id ?? ''}`} className="text-sm underline">
        Voltar
      </Link>
    </div>
  )
}
