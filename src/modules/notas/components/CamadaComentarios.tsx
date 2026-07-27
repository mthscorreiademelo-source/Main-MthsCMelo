import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { nanoid } from 'nanoid'
import type { Camera, Comentario } from '../types'

export interface CamadaComentariosApi {
  /** Atualiza a transformação da camada para acompanhar o quadro (sem re-render). */
  aplicarCamera: (c: Camera) => void
  /** Cria um novo comentário no ponto de mundo e já abre para escrever. */
  novo: (wx: number, wy: number) => void
}

interface Props {
  comentarios: Comentario[]
  /** true quando a ferramenta permite mexer (ponteiro/texto): habilita arrastar. */
  interativo: boolean
  /** Câmera salva da página; ausente = espera a 1ª câmera do quadro antes de aparecer. */
  camInicial?: Camera
  /** Commit dos comentários (entra no histórico de desfazer). */
  onMudar: (novos: Comentario[]) => void
}

/** Tamanho do balãozinho minimizado (unidades de mundo). */
const TAM_BALAO = 40
/** Fonte do cartão aberto (unidades de mundo). */
const FONTE_CARTAO = 15

/** Matriz CSS mundo→tela (mesma transformação do canvas, sem o dpr). */
function matrizCamera(c: Camera): string {
  const s = c.escala
  const cos = Math.cos(c.rot ?? 0)
  const sin = Math.sin(c.rot ?? 0)
  const a = s * cos
  const b = s * sin
  const cc = -s * sin
  const d = s * cos
  const e = -s * (cos * c.x - sin * c.y)
  const f = -s * (sin * c.x + cos * c.y)
  return `matrix(${a}, ${b}, ${cc}, ${d}, ${e}, ${f})`
}

/** Ícone de balão de fala (identidade do LUME: contorno limpo, cor de destaque). */
function IconBalaoFala() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="60%"
      height="60%"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

/**
 * Camada de comentários sobre o quadro. Um único container recebe a
 * transformação da câmera (pan/zoom/rotação da folha); cada comentário fica em
 * coordenadas de mundo e acompanha o quadro — igual à camada de textos.
 * Minimizado vira um balãozinho; ao tocar, abre um cartão para ler/editar.
 */
export const CamadaComentarios = forwardRef<CamadaComentariosApi, Props>(function CamadaComentarios(
  { comentarios, interativo, camInicial, onMudar },
  apiRef,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const camRef = useRef<Camera>(camInicial ?? { x: 0, y: 0, escala: 1 })
  const prontoRef = useRef(!!camInicial)
  const [pronto, setPronto] = useState(!!camInicial)
  // comentário aberto (mostrando o cartão) para leitura/edição
  const [aberto, setAberto] = useState<string | null>(null)
  // comentário novo ainda não salvo (só grava ao fechar se tiver texto)
  const [rascunho, setRascunho] = useState<Comentario | null>(null)
  // pré-visualização durante o arraste (não grava até soltar)
  const [preview, setPreview] = useState<{ id: string; x: number; y: number } | null>(null)
  const arrasto = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number; moveu: boolean } | null>(null)
  const editRef = useRef<HTMLTextAreaElement | null>(null)

  const comentariosRef = useRef(comentarios)
  comentariosRef.current = comentarios
  const rascunhoRef = useRef(rascunho)
  rascunhoRef.current = rascunho
  const abertoRef = useRef(aberto)
  abertoRef.current = aberto

  const aplicarCamera = useCallback((c: Camera) => {
    camRef.current = c
    if (containerRef.current) containerRef.current.style.transform = matrizCamera(c)
    if (!prontoRef.current) {
      prontoRef.current = true
      setPronto(true)
    }
  }, [])

  const setContainer = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el
    if (el && !el.style.transform) el.style.transform = matrizCamera(camRef.current)
  }, [])

  /** Grava o texto do comentário aberto e o fecha (minimiza de volta). */
  const fechar = useCallback(() => {
    const id = abertoRef.current
    if (!id) return
    const novoTexto = editRef.current?.value ?? ''
    setAberto(null)
    const rasc = rascunhoRef.current
    if (rasc && rasc.id === id) {
      setRascunho(null)
      // comentário recém-criado: só entra na lista se recebeu algum texto
      if (novoTexto.trim()) onMudar([...comentariosRef.current, { ...rasc, texto: novoTexto }])
      return
    }
    const antigo = comentariosRef.current.find((c) => c.id === id)
    if (!antigo) return
    if (novoTexto !== antigo.texto) {
      onMudar(comentariosRef.current.map((c) => (c.id === id ? { ...c, texto: novoTexto } : c)))
    }
  }, [onMudar])

  useImperativeHandle(
    apiRef,
    () => ({
      aplicarCamera,
      novo(wx, wy) {
        if (abertoRef.current) fechar()
        const c: Comentario = { id: nanoid(), x: wx, y: wy, texto: '', criadoEm: Date.now() }
        setRascunho(c)
        setAberto(c.id)
      },
    }),
    [aplicarCamera, fechar],
  )

  // ao abrir o cartão: preenche o texto e foca (cursor no fim), antes de pintar
  useLayoutEffect(() => {
    if (!aberto) return
    const el = editRef.current
    if (!el) return
    const rasc = rascunhoRef.current
    const alvo = rasc && rasc.id === aberto ? rasc : comentariosRef.current.find((c) => c.id === aberto)
    el.value = alvo?.texto ?? ''
    el.focus()
    const fim = el.value.length
    el.setSelectionRange(fim, fim)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

  function apagar(id: string) {
    setAberto(null)
    setRascunho((r) => (r && r.id === id ? null : r))
    if (rascunhoRef.current?.id === id) return // rascunho: nada a remover da lista
    onMudar(comentariosRef.current.filter((c) => c.id !== id))
  }

  /* ---------- arrastar o balãozinho ---------- */

  function aoPressionar(e: React.PointerEvent<HTMLButtonElement>, c: Comentario) {
    if (aberto === c.id) return
    if (e.button !== 0) return // meio/direito seguem para pan/menu
    // o balão sempre pode ser aberto (tap); arrastar só quando a ferramenta permite
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    arrasto.current = { id: c.id, sx: e.clientX, sy: e.clientY, ox: c.x, oy: c.y, moveu: false }
  }

  function aoMover(e: React.PointerEvent<HTMLButtonElement>) {
    const a = arrasto.current
    if (!a || !interativo) return
    const c = camRef.current
    const dsx = e.clientX - a.sx
    const dsy = e.clientY - a.sy
    if (!a.moveu && Math.hypot(dsx, dsy) < 4) return
    a.moveu = true
    const cos = Math.cos(c.rot ?? 0)
    const sin = Math.sin(c.rot ?? 0)
    setPreview({
      id: a.id,
      x: a.ox + (dsx * cos + dsy * sin) / c.escala,
      y: a.oy + (-dsx * sin + dsy * cos) / c.escala,
    })
  }

  function aoSoltar(e: React.PointerEvent<HTMLButtonElement>, c: Comentario) {
    const a = arrasto.current
    arrasto.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ok */
    }
    const p = preview
    setPreview(null)
    if (!a) return
    if (a.moveu && p && p.id === a.id) {
      onMudar(comentariosRef.current.map((x) => (x.id === a.id ? { ...x, x: p.x, y: p.y } : x)))
    } else if (!a.moveu) {
      // toque simples sem arrastar: abre o cartão
      setAberto(c.id)
    }
  }

  // fechar ao tocar fora do cartão aberto
  useEffect(() => {
    if (!aberto) return
    const aoApontar = (e: PointerEvent) => {
      const alvo = e.target as HTMLElement | null
      if (alvo?.closest('[data-comentario]')) return
      fechar()
    }
    // adiado para não capturar o mesmo toque que abriu o cartão
    const id = setTimeout(() => window.addEventListener('pointerdown', aoApontar), 0)
    return () => {
      clearTimeout(id)
      window.removeEventListener('pointerdown', aoApontar)
    }
  }, [aberto, fechar])

  const lista = rascunho ? [...comentarios, rascunho] : comentarios

  return (
    <div
      ref={setContainer}
      className="pointer-events-none absolute inset-0"
      style={{ transformOrigin: '0 0', visibility: pronto ? 'visible' : 'hidden' }}
    >
      {lista.map((c) => {
        const pos = preview && preview.id === c.id ? preview : c
        const estaAberto = aberto === c.id
        return (
          <div
            key={c.id}
            data-comentario={c.id}
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'auto',
            }}
          >
            {estaAberto ? (
              <div
                className="flex flex-col gap-2 rounded-2xl border border-line bg-bg p-3 shadow-xl"
                style={{ width: 260, fontSize: FONTE_CARTAO }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <IconBalaoFala />
                  </span>
                  <span className="text-[0.8em] font-semibold text-muted">Comentário</span>
                  <button
                    type="button"
                    onClick={() => apagar(c.id)}
                    aria-label="Apagar comentário"
                    className="ml-auto cursor-pointer rounded-md px-2 py-1 text-[0.75em] font-medium text-danger transition-colors hover:bg-hover"
                  >
                    Apagar
                  </button>
                  <button
                    type="button"
                    onClick={fechar}
                    aria-label="Fechar comentário"
                    className="cursor-pointer rounded-md px-2 py-1 text-[0.75em] font-medium text-muted transition-colors hover:bg-hover"
                  >
                    Concluir
                  </button>
                </div>
                <textarea
                  ref={editRef}
                  data-testid="comentario-editor"
                  placeholder="Escreva o comentário…"
                  rows={4}
                  onKeyDown={(e) => {
                    e.stopPropagation()
                    if (e.key === 'Escape') {
                      e.preventDefault()
                      fechar()
                    }
                  }}
                  className="w-full resize-none rounded-lg border border-line bg-surface/60 p-2 text-ink outline-none placeholder:text-muted/60 focus:border-muted/50"
                  style={{ fontSize: '1em', lineHeight: 1.35 }}
                />
              </div>
            ) : (
              <button
                type="button"
                data-testid="comentario-balao"
                onPointerDown={(e) => aoPressionar(e, c)}
                onPointerMove={aoMover}
                onPointerUp={(e) => aoSoltar(e, c)}
                onContextMenu={(e) => e.preventDefault()}
                aria-label={c.texto ? `Comentário: ${c.texto.slice(0, 40)}` : 'Comentário vazio'}
                title={c.texto || 'Comentário'}
                className="flex items-center justify-center rounded-full rounded-bl-sm border border-accent/30 bg-bg text-accent shadow-md transition-transform hover:scale-105 active:scale-95"
                style={{
                  width: TAM_BALAO,
                  height: TAM_BALAO,
                  cursor: interativo ? 'grab' : 'pointer',
                  touchAction: 'none',
                }}
              >
                <IconBalaoFala />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
})
