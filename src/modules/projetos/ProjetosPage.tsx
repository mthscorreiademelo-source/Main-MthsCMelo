import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { IconChevron } from '../../core/components/Icons'
import { ListaProjetos } from './components/ListaProjetos'
import { ProjetoWorkspace } from './components/ProjetoWorkspace'
import { useProjetoWS } from './hooks'

const CHAVE_LARGURA = 'projetos-largura-painel'
const CHAVE_COLAPSO = 'projetos-painel-colapsado'
const MIN = 248
const MAX = 560
const PADRAO = 336

function useEhDesktop() {
  const [desk, setDesk] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const h = () => setDesk(mq.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return desk
}

function BoasVindas() {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line text-center">
      <span className="text-5xl">🗂️</span>
      <p className="text-[16px] font-semibold">Selecione um projeto</p>
      <p className="max-w-xs text-[13px] text-muted">Cada projeto é um espaço próprio — tarefas, agenda, notas, finanças e mais, tudo reunido e conectado ao restante do Lume.</p>
    </div>
  )
}

export function ProjetosPage() {
  const { id } = useParams<{ id: string }>()
  const projeto = useProjetoWS(id)
  const desktop = useEhDesktop()

  const [largura, setLargura] = useState(() => {
    const v = Number(localStorage.getItem(CHAVE_LARGURA))
    return v >= MIN && v <= MAX ? v : PADRAO
  })
  const [colapsado, setColapsado] = useState(() => localStorage.getItem(CHAVE_COLAPSO) === '1')
  const arrastando = useRef(false)

  useEffect(() => { localStorage.setItem(CHAVE_LARGURA, String(largura)) }, [largura])
  useEffect(() => { localStorage.setItem(CHAVE_COLAPSO, colapsado ? '1' : '0') }, [colapsado])

  const iniciarArrasto = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    arrastando.current = true
    const startX = e.clientX
    const startW = largura
    const mover = (ev: PointerEvent) => {
      if (!arrastando.current) return
      setLargura(Math.min(MAX, Math.max(MIN, startW + (ev.clientX - startX))))
    }
    const soltar = () => {
      arrastando.current = false
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [largura])

  const conteudo = id ? (
    projeto === undefined ? (
      <p className="py-16 text-center text-[14px] text-muted">Carregando…</p>
    ) : projeto ? (
      <ProjetoWorkspace projeto={projeto} />
    ) : (
      <BoasVindas />
    )
  ) : (
    <BoasVindas />
  )

  // Mobile / tablet estreito: uma coluna por vez (lista ou workspace).
  if (!desktop) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        {id ? <div className="min-w-0">{conteudo}</div> : <ListaProjetos selecionadoId={id} />}
      </div>
    )
  }

  // Desktop / tablet largo: painel redimensionável + colapsável.
  return (
    <div className="mx-auto flex w-full max-w-6xl">
      {colapsado ? (
        <button
          onClick={() => setColapsado(false)}
          title="Mostrar projetos"
          aria-label="Mostrar painel de projetos"
          className="sticky top-0 mr-3 flex size-9 shrink-0 items-center justify-center self-start rounded-full border border-line bg-surface/70 text-muted transition-colors hover:text-ink"
        >
          <IconChevron className="-rotate-90" width={16} height={16} />
        </button>
      ) : (
        <>
          <aside
            style={{ width: largura }}
            className="sticky top-0 flex h-[calc(100vh-6.5rem)] shrink-0 flex-col overflow-hidden"
          >
            <ListaProjetos selecionadoId={id} onColapsar={() => setColapsado(true)} />
          </aside>

          {/* Divisor arrastável */}
          <div
            onPointerDown={iniciarArrasto}
            onDoubleClick={() => setLargura(PADRAO)}
            role="separator"
            aria-orientation="vertical"
            aria-label="Redimensionar painel"
            title="Arraste para redimensionar · dois cliques para o tamanho padrão"
            className="group relative mx-1 w-2 shrink-0 cursor-col-resize touch-none self-stretch"
          >
            <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-line transition-colors group-hover:bg-accent/60" />
            <span className="absolute left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent transition-colors group-hover:bg-accent/60" />
          </div>
        </>
      )}

      <main className="min-w-0 flex-1">{conteudo}</main>
    </div>
  )
}
