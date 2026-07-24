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
import type { Camera, TextoQuadro } from '../types'

export interface CamadaTextosApi {
  /** Atualiza a transformação da camada para acompanhar o quadro (imperativo, sem re-render). */
  aplicarCamera: (c: Camera) => void
  /** Cria um novo bloco de texto no ponto de mundo e entra em edição. */
  novo: (wx: number, wy: number) => void
  /** Entra em edição de um bloco existente. */
  editar: (id: string) => void
}

interface Props {
  textos: TextoQuadro[]
  /** true quando a ferramenta permite mexer no texto (ponteiro/texto). */
  interativo: boolean
  /** Câmera salva da página; ausente = espera a 1ª câmera do quadro antes de aparecer. */
  camInicial?: Camera
  /** Cor e tamanho padrão para novos blocos. */
  corPadrao: string
  tamanhoPadrao: number
  /** Commit dos textos (entra no histórico de desfazer). */
  onMudarTextos: (novos: TextoQuadro[]) => void
}

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

/**
 * Camada de blocos de texto sobre o quadro. Um único container recebe a
 * transformação da câmera (pan/zoom/rotação da folha), então cada bloco é
 * posicionado em coordenadas de mundo e acompanha o quadro automaticamente.
 * A edição é feita com contentEditable nativo (teclado de verdade).
 */
export const CamadaTextos = forwardRef<CamadaTextosApi, Props>(function CamadaTextos(
  { textos, interativo, camInicial, corPadrao, tamanhoPadrao, onMudarTextos },
  apiRef,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const camRef = useRef<Camera>(camInicial ?? { x: 0, y: 0, escala: 1 })
  // só mostra a camada depois que a 1ª câmera real chega (evita salto de posição)
  const prontoRef = useRef(!!camInicial)
  const [pronto, setPronto] = useState(!!camInicial)
  const [editando, setEditando] = useState<string | null>(null)
  const [selecionado, setSelecionado] = useState<string | null>(null)
  // bloco novo ainda não salvo (só é gravado ao sair da edição se tiver texto)
  const [rascunho, setRascunho] = useState<TextoQuadro | null>(null)
  // pré-visualização durante o arraste (não grava até soltar)
  const [preview, setPreview] = useState<{ id: string; x: number; y: number } | null>(null)
  const arrasto = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number; moveu: boolean } | null>(null)
  const editRef = useRef<HTMLDivElement | null>(null)

  const textosRef = useRef(textos)
  textosRef.current = textos
  const rascunhoRef = useRef(rascunho)
  rascunhoRef.current = rascunho

  const aplicarCamera = useCallback((c: Camera) => {
    camRef.current = c
    if (containerRef.current) containerRef.current.style.transform = matrizCamera(c)
    if (!prontoRef.current) {
      prontoRef.current = true
      setPronto(true)
    }
  }, [])

  // define a transformação inicial no commit (antes da pintura), sem sobrescrever
  // uma câmera que o quadro já tenha aplicado via onCameraVivo.
  const setContainer = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el
    if (el && !el.style.transform) el.style.transform = matrizCamera(camRef.current)
  }, [])

  const commitEdicao = useCallback(() => {
    const id = editando
    if (!id) return
    const el = editRef.current
    const novoTexto = (el?.innerText ?? '').replace(/ /g, ' ').replace(/\s+$/, '')
    setEditando(null)
    // não zera a seleção se ela já aponta para OUTRO bloco (ex.: clicou no bloco B)
    setSelecionado((s) => (s === id ? null : s))
    const rasc = rascunhoRef.current
    if (rasc && rasc.id === id) {
      setRascunho(null)
      if (novoTexto.trim()) onMudarTextos([...textosRef.current, { ...rasc, texto: novoTexto }])
      return
    }
    const antigo = textosRef.current.find((x) => x.id === id)
    if (!antigo) return
    if (novoTexto.trim() === '') {
      onMudarTextos(textosRef.current.filter((x) => x.id !== id))
    } else if (novoTexto !== antigo.texto) {
      onMudarTextos(textosRef.current.map((x) => (x.id === id ? { ...x, texto: novoTexto } : x)))
    }
  }, [editando, onMudarTextos])

  useImperativeHandle(
    apiRef,
    () => ({
      aplicarCamera,
      novo(wx, wy) {
        // fecha edição anterior antes de abrir a nova
        if (editando) commitEdicao()
        const t: TextoQuadro = {
          id: nanoid(),
          x: wx,
          y: wy,
          texto: '',
          cor: corPadrao,
          tamanho: tamanhoPadrao,
        }
        setRascunho(t)
        setSelecionado(t.id)
        setEditando(t.id)
      },
      editar(id) {
        if (editando && editando !== id) commitEdicao()
        setSelecionado(id)
        setEditando(id)
      },
    }),
    [aplicarCamera, commitEdicao, editando, corPadrao, tamanhoPadrao],
  )

  // ao entrar em edição: foca o bloco e coloca o cursor no fim. Depende SÓ de
  // `editando` (lê o texto por ref) para não resetar o conteúdo a cada render.
  // useLayoutEffect: repõe o texto antes da pintura (sem piscar vazio).
  useLayoutEffect(() => {
    if (!editando) return
    const el = editRef.current
    if (!el) return
    const rasc = rascunhoRef.current
    const alvo = rasc && rasc.id === editando ? rasc : textosRef.current.find((t) => t.id === editando)
    el.innerText = alvo?.texto ?? ''
    el.focus()
    const sel = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    sel?.removeAllRanges()
    sel?.addRange(range)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editando])

  // Delete/Backspace apaga o bloco selecionado (fora da edição)
  useEffect(() => {
    if (!selecionado || editando) return
    const aoTecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null
      if (alvo && (alvo.isContentEditable || alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA')) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        onMudarTextos(textosRef.current.filter((x) => x.id !== selecionado))
        setSelecionado(null)
      }
    }
    window.addEventListener('keydown', aoTecla)
    return () => window.removeEventListener('keydown', aoTecla)
  }, [selecionado, editando, onMudarTextos])

  // clicar fora dos blocos limpa a seleção
  useEffect(() => {
    if (!selecionado) return
    const aoApontar = (e: PointerEvent) => {
      const alvo = e.target as HTMLElement | null
      if (alvo?.closest('[data-texto-bloco]')) return
      setSelecionado(null)
    }
    window.addEventListener('pointerdown', aoApontar)
    return () => window.removeEventListener('pointerdown', aoApontar)
  }, [selecionado])

  function aoPressionar(e: React.PointerEvent<HTMLDivElement>, t: TextoQuadro) {
    if (editando === t.id) return // deixa clicar dentro para posicionar o cursor
    if (!interativo) return
    if (e.button !== 0) return // só o botão esquerdo arrasta; meio/direito seguem p/ pan/menu
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setSelecionado(t.id)
    arrasto.current = { id: t.id, sx: e.clientX, sy: e.clientY, ox: t.x, oy: t.y, moveu: false }
  }

  function aoMover(e: React.PointerEvent<HTMLDivElement>) {
    const a = arrasto.current
    if (!a) return
    const c = camRef.current
    const dsx = e.clientX - a.sx
    const dsy = e.clientY - a.sy
    if (!a.moveu && Math.hypot(dsx, dsy) < 3) return
    a.moveu = true
    const cos = Math.cos(c.rot ?? 0)
    const sin = Math.sin(c.rot ?? 0)
    setPreview({
      id: a.id,
      x: a.ox + (dsx * cos + dsy * sin) / c.escala,
      y: a.oy + (-dsx * sin + dsy * cos) / c.escala,
    })
  }

  function aoSoltar(e: React.PointerEvent<HTMLDivElement>) {
    const a = arrasto.current
    arrasto.current = null
    if (!a) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ok */
    }
    const p = preview
    setPreview(null)
    if (a.moveu && p && p.id === a.id) {
      onMudarTextos(textosRef.current.map((x) => (x.id === a.id ? { ...x, x: p.x, y: p.y } : x)))
    }
  }

  const lista = rascunho ? [...textos, rascunho] : textos

  return (
    <div
      ref={setContainer}
      className="pointer-events-none absolute inset-0"
      style={{ transformOrigin: '0 0', visibility: pronto ? 'visible' : 'hidden' }}
    >
      {lista.map((t) => {
        const edit = editando === t.id
        const pos = preview && preview.id === t.id ? preview : t
        const sel = selecionado === t.id
        return (
          <div
            key={t.id}
            data-texto-bloco={t.id}
            contentEditable={edit}
            suppressContentEditableWarning
            ref={edit ? editRef : undefined}
            onPointerDown={(e) => aoPressionar(e, t)}
            onPointerMove={aoMover}
            onPointerUp={aoSoltar}
            onDoubleClick={(e) => {
              if (!interativo) return
              e.stopPropagation()
              setSelecionado(t.id)
              setEditando(t.id)
            }}
            onContextMenu={(e) => e.preventDefault()}
            onBlur={edit ? commitEdicao : undefined}
            onKeyDown={(e) => {
              if (edit && e.key === 'Escape') {
                e.preventDefault()
                ;(e.currentTarget as HTMLDivElement).blur()
              }
              // deixa Enter quebrar linha; não propaga para atalhos do quadro
              e.stopPropagation()
            }}
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              transform: `translate(-50%, -50%) rotate(${t.rotacao ?? 0}rad)`,
              transformOrigin: 'center',
              fontSize: t.tamanho,
              lineHeight: 1.25,
              color: t.cor,
              fontFamily: 'inherit',
              fontWeight: 500,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              width: 'max-content',
              maxWidth: 520,
              padding: '2px 6px',
              margin: 0,
              borderRadius: 4,
              outline: edit ? '2px solid #2383E2' : sel ? '1.5px dashed #2383E2' : 'none',
              background: edit ? 'rgba(35,131,226,0.06)' : 'transparent',
              cursor: edit ? 'text' : interativo ? 'move' : 'default',
              pointerEvents: interativo || edit ? 'auto' : 'none',
              touchAction: 'none',
              userSelect: edit ? 'text' : 'none',
              caretColor: t.cor,
            }}
          >
            {edit ? null : t.texto || '​'}
          </div>
        )
      })}
    </div>
  )
})
