import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { IconChevron, IconEtiqueta, IconFechar } from '../../../core/components/Icons'
import { CORES_DESTAQUE, criarDestaque, criarNota, obterArquivo, salvarLivro } from '../db'
import { useDestaquesLivro, useLivro, useNotasLivro } from '../hooks'
import { LeitorEpub } from './LeitorEpub'
import { LeitorPaginado } from './LeitorPaginado'
import { ORDEM_TEMAS, TEMAS, type Controles, type TemaLeitor } from './temas'

const CHAVE_TEMA = 'lume:leitor:tema'
const CHAVE_FONTE = 'lume:leitor:fonte'

type Preparo =
  | { modo: 'carregando' }
  | { modo: 'epub' }
  | { modo: 'paginado'; total: number; provider: (n: number) => Promise<string | undefined> }
  | { modo: 'incompativel' }
  | { modo: 'erro'; msg: string }

const IMG_EXT = /\.(jpe?g|png|webp|gif|avif)$/i

export function LeitorPage() {
  const { id } = useParams()
  const livro = useLivro(id)
  const [blob, setBlob] = useState<Blob | null | undefined>(undefined)
  const [preparo, setPreparo] = useState<Preparo>({ modo: 'carregando' })
  const [chrome, setChrome] = useState(true)
  const [pct, setPct] = useState(0)
  const destaques = useDestaquesLivro(id) ?? []
  const notas = useNotasLivro(id) ?? []
  const [selecao, setSelecao] = useState<{ cfi: string; texto: string; capitulo?: string } | null>(null)
  const [notaTexto, setNotaTexto] = useState<string | null>(null)
  const [irParaCfi, setIrParaCfi] = useState<string | undefined>(undefined)
  const [painel, setPainel] = useState(false)

  const onSelecao = useCallback((cfi: string, texto: string, capitulo?: string) => {
    setSelecao({ cfi, texto, capitulo })
    setChrome(false)
  }, [])

  async function destacar(cor: string) {
    if (!selecao || !id) return
    await criarDestaque({ livroId: id, trecho: selecao.texto, cfi: selecao.cfi, capitulo: selecao.capitulo, cor })
    setSelecao(null)
  }
  async function salvarNota() {
    if (!selecao || !id || !notaTexto?.trim()) return
    await criarNota({ livroId: id, resumo: notaTexto.trim(), trecho: selecao.texto, cfi: selecao.cfi, capitulo: selecao.capitulo })
    setNotaTexto(null)
    setSelecao(null)
  }

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
        if (livro.formato === 'mobi') {
          if (vivo) setPreparo({ modo: 'incompativel' })
          return
        }
        if (livro.formato === 'epub') {
          if (vivo) setPreparo({ modo: 'epub' })
          return
        }
        if (livro.formato === 'cbz' || livro.formato === 'cbr') {
          // CBZ é sempre ZIP. CBR pode ser RAR (o comum) OU um ZIP renomeado —
          // olhamos os primeiros bytes pra decidir o descompactador certo.
          const { detectarCompactacao } = await import('../descompactar')
          const container = livro.formato === 'cbz' ? 'zip' : await detectarCompactacao(blob)

          if (container === 'zip') {
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

          if (container === 'rar') {
            const { abrirCbrRar } = await import('../descompactar')
            const { nomes, extrair } = await abrirCbrRar(blob)
            if (nomes.length === 0) throw new Error('Não encontrei imagens neste arquivo.')
            const cache = new Map<number, string>()
            const provider = async (n: number) => {
              if (cache.has(n)) return cache.get(n)
              const b = await extrair(nomes[n])
              if (!b) return undefined
              const url = URL.createObjectURL(b)
              urls.push(url)
              cache.set(n, url)
              return url
            }
            if (vivo) setPreparo({ modo: 'paginado', total: nomes.length, provider })
            return
          }

          throw new Error('Não reconheci o formato deste quadrinho (não é ZIP nem RAR).')
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
        {preparo.modo === 'incompativel' && (
          <div className="mx-auto flex h-full max-w-sm flex-col items-center justify-center gap-3 px-8 text-center">
            <p className="text-sm opacity-80">
              A leitura de arquivos MOBI ainda não é suportada aqui. Converta o livro para
              EPUB ou PDF para ler — o livro continua na sua estante para organizar e avaliar.
            </p>
            <Link to={`/biblioteca/${id}`} className="text-sm underline opacity-90">
              Voltar ao livro
            </Link>
          </div>
        )}
        {preparo.modo === 'epub' && blob && (
          // margem vertical para o texto não ficar sob a barra de título/progresso
          <div className="h-full w-full px-2" style={{ paddingTop: 60, paddingBottom: 60 }}>
            <LeitorEpub
              blob={blob}
              tema={tema}
              fontePct={fontePct}
              inicial={livro?.localizacao}
              onProgresso={onProgresso}
              registrarControles={registrarControles}
              destaques={destaques}
              onSelecao={onSelecao}
              irParaCfi={irParaCfi ?? livro?.localizacao}
              onAbrirDestaque={() => setPainel(true)}
            />
          </div>
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
          {livro?.formato === 'epub' && (
            <button
              onClick={() => setPainel(true)}
              className="relative flex size-9 items-center justify-center rounded-full hover:bg-black/10"
              aria-label="Marcadores"
            >
              <IconEtiqueta width={17} height={17} />
              {destaques.length + notas.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">{destaques.length + notas.length}</span>
              )}
            </button>
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

      {/* Barra de seleção → destacar / criar nota */}
      {selecao && notaTexto === null && (
        <div className="absolute inset-x-0 bottom-0 z-40 flex flex-col items-center gap-2 p-4">
          <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2 shadow-lg">
            {CORES_DESTAQUE.map((c) => (
              <button key={c} onClick={() => destacar(c)} className="size-7 rounded-full ring-1 ring-black/10 transition-transform hover:scale-110" style={{ backgroundColor: c }} aria-label={`Destacar ${c}`} />
            ))}
            <span className="mx-0.5 h-6 w-px bg-line" />
            <button onClick={() => setNotaTexto('')} className="rounded-full bg-ink px-3 py-1.5 text-[13px] font-medium text-surface">✎ Nota</button>
            <button onClick={() => setSelecao(null)} className="rounded-full px-2 py-1.5 text-[13px] text-muted hover:text-ink" aria-label="Cancelar">✕</button>
          </div>
        </div>
      )}

      {/* Compositor de nota */}
      {selecao && notaTexto !== null && (
        <div className="absolute inset-x-0 bottom-0 z-40 flex flex-col gap-2 border-t border-line bg-surface p-4 text-ink">
          <p className="line-clamp-2 border-l-2 border-accent pl-2 text-[13px] italic text-muted">"{selecao.texto}"</p>
          <textarea autoFocus value={notaTexto} onChange={(e) => setNotaTexto(e.target.value)} rows={3} placeholder="Sua anotação…" className="w-full resize-none rounded-lg border border-line bg-bg px-3 py-2 text-[14px] outline-none focus:border-muted/60" />
          <div className="flex justify-end gap-2">
            <button onClick={() => { setNotaTexto(null); setSelecao(null) }} className="rounded-full px-3 py-1.5 text-[13px] text-muted">Cancelar</button>
            <button onClick={salvarNota} className="rounded-full bg-ink px-4 py-1.5 text-[13px] font-medium text-surface">Salvar nota</button>
          </div>
        </div>
      )}

      {/* Painel de marcadores (destaques + notas) */}
      {painel && (
        <div className="absolute inset-0 z-50 flex">
          <button className="flex-1 bg-black/30" aria-label="Fechar" onClick={() => setPainel(false)} />
          <div className="flex w-80 max-w-[85%] flex-col bg-surface text-ink shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="text-[14px] font-semibold">Marcadores</span>
              <button onClick={() => setPainel(false)} aria-label="Fechar"><IconFechar width={17} height={17} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {destaques.length === 0 && notas.length === 0 && <p className="p-4 text-center text-[13px] text-muted">Selecione um trecho na leitura para destacar ou anotar.</p>}
              {destaques.length > 0 && <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Destaques</div>}
              {destaques.sort((a, b) => b.criadoEm - a.criadoEm).map((d) => (
                <button key={d.id} onClick={() => { if (d.cfi) setIrParaCfi(d.cfi); setPainel(false) }} className="mb-2 block w-full rounded-lg border-l-4 bg-hover/50 p-2.5 text-left" style={{ borderColor: d.cor }}>
                  <span className="line-clamp-3 text-[13px]">{d.trecho}</span>
                  {d.capitulo && <span className="mt-1 block text-[11px] text-muted">{d.capitulo}</span>}
                </button>
              ))}
              {notas.length > 0 && <div className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted">Notas</div>}
              {notas.sort((a, b) => b.criadoEm - a.criadoEm).map((n) => (
                <button key={n.id} onClick={() => { if (n.cfi) setIrParaCfi(n.cfi); setPainel(false) }} className="mb-2 block w-full rounded-lg border border-line p-2.5 text-left">
                  {n.trecho && <span className="mb-1 line-clamp-2 border-l-2 border-accent pl-1.5 text-[12px] italic text-muted">"{n.trecho}"</span>}
                  <span className="line-clamp-3 text-[13px]">{n.resumo}</span>
                </button>
              ))}
            </div>
          </div>
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
