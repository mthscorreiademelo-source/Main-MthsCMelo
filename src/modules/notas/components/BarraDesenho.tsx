import { useRef, useState, type PointerEvent } from 'react'
import {
  IconArrastar,
  IconBorracha,
  IconCursor,
  IconDocumento,
  IconImagem,
  IconLapis,
  IconMarcador,
  IconPincel,
  IconPostIt,
  IconRegua,
  IconSelecao,
  IconTinteiro,
} from '../../../core/components/Icons'
import {
  CANETAS,
  CORES_POSTIT,
  LISTA_CANETAS,
  type ConfigCaneta,
  type ConfigsCanetas,
} from '../desenho'
import type { TipoCaneta } from '../types'
import type { ConfigBorracha } from './QuadroInfinito'
import { SeletorCor } from './SeletorCor'

export type ModoBarra = TipoCaneta | 'borracha' | 'selecao' | 'ponteiro'
type Lado = 'baixo' | 'cima' | 'esquerda' | 'direita'

const ICONES: Record<TipoCaneta, typeof IconLapis> = {
  lapis: IconLapis,
  tinteiro: IconTinteiro,
  marcador: IconMarcador,
  pincel: IconPincel,
}

const PALETA = [
  '#37352F',
  '#9B9B9B',
  '#D44C47',
  '#D9730D',
  '#FFD400',
  '#448361',
  '#2383E2',
  '#9065B0',
]

const POSICAO: Record<Lado, string> = {
  baixo: 'bottom-5 left-1/2 -translate-x-1/2 flex-row',
  cima: 'top-20 left-1/2 -translate-x-1/2 flex-row',
  esquerda: 'left-3 top-1/2 -translate-y-1/2 flex-col',
  direita: 'right-3 top-1/2 -translate-y-1/2 flex-col',
}

const POSICAO_PAINEL: Record<Lado, string> = {
  baixo: 'bottom-24 left-1/2 -translate-x-1/2',
  cima: 'top-36 left-1/2 -translate-x-1/2',
  esquerda: 'left-20 top-1/2 -translate-y-1/2',
  direita: 'right-20 top-1/2 -translate-y-1/2',
}

function ladoInicial(): Lado {
  const salvo = localStorage.getItem('vida:barra-lado')
  return salvo === 'cima' || salvo === 'esquerda' || salvo === 'direita' ? salvo : 'baixo'
}

interface Props {
  modo: ModoBarra
  configs: ConfigsCanetas
  configBorracha: ConfigBorracha
  selecaoTipo: 'retangulo' | 'laco'
  reguaAtiva: boolean
  onModo: (modo: ModoBarra) => void
  onConfig: (tipo: TipoCaneta, config: ConfigCaneta) => void
  onConfigBorracha: (config: ConfigBorracha) => void
  onSelecaoTipo: (tipo: 'retangulo' | 'laco') => void
  onRegua: (ativa: boolean) => void
  onNovoPostIt: (cor: string) => void
  onImportarImagem: () => void
  onImportarPdf: () => void
}

/** Barra flutuante: acoplável nas 4 bordas (arraste pela alça), minimizável. */
export function BarraDesenho({
  modo,
  configs,
  configBorracha,
  selecaoTipo,
  reguaAtiva,
  onModo,
  onConfig,
  onConfigBorracha,
  onSelecaoTipo,
  onRegua,
  onNovoPostIt,
  onImportarImagem,
  onImportarPdf,
}: Props) {
  const [painel, setPainel] = useState<'ferramenta' | 'postit' | 'inserir' | null>(null)
  const [pickerAberto, setPickerAberto] = useState(false)
  const [lado, setLado] = useState<Lado>(ladoInicial)
  const [minimizada, setMinimizada] = useState(false)
  const [arrasto, setArrasto] = useState<{ x: number; y: number } | null>(null)
  const inicioArrasto = useRef<{ x: number; y: number } | null>(null)

  const canetaAtiva =
    modo !== 'borracha' && modo !== 'selecao' && modo !== 'ponteiro' ? CANETAS[modo] : null
  const config = canetaAtiva ? configs[canetaAtiva.id] : null
  const vertical = !arrasto && (lado === 'esquerda' || lado === 'direita')

  function aoTocarFerramenta(novo: ModoBarra) {
    if (modo === novo) {
      if (novo === 'ponteiro') return // ponteiro não tem ajustes
      setPainel((p) => (p === 'ferramenta' ? null : 'ferramenta'))
      setPickerAberto(false)
    } else {
      onModo(novo)
      setPainel(null)
      setPickerAberto(false)
    }
  }

  /* ---------- alça: toque = minimizar, arraste = mover ---------- */

  function alcaPressionar(e: PointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    inicioArrasto.current = { x: e.clientX, y: e.clientY }
  }

  function alcaMover(e: PointerEvent<HTMLButtonElement>) {
    if (!inicioArrasto.current) return
    const dx = e.clientX - inicioArrasto.current.x
    const dy = e.clientY - inicioArrasto.current.y
    if (arrasto || Math.hypot(dx, dy) > 8) {
      setArrasto({ x: e.clientX, y: e.clientY })
      setPainel(null)
    }
  }

  function alcaSoltar(e: PointerEvent<HTMLButtonElement>) {
    const inicio = inicioArrasto.current
    inicioArrasto.current = null
    if (!inicio) return
    if (!arrasto) {
      // toque simples: minimiza/expande
      setMinimizada((v) => !v)
      setPainel(null)
      return
    }
    // acopla na borda mais próxima do ponto de soltura
    const w = window.innerWidth
    const h = window.innerHeight
    const dists: [Lado, number][] = [
      ['esquerda', e.clientX],
      ['direita', w - e.clientX],
      ['cima', e.clientY],
      ['baixo', h - e.clientY],
    ]
    dists.sort((a, b) => a[1] - b[1])
    setLado(dists[0][0])
    localStorage.setItem('vida:barra-lado', dists[0][0])
    setArrasto(null)
  }

  const estiloArrasto = arrasto
    ? { left: arrasto.x, top: arrasto.y, transform: 'translate(-50%, -50%)' }
    : undefined

  const painelClasse = `pointer-events-auto absolute flex w-[19rem] flex-col gap-4 rounded-2xl border border-line bg-bg p-4 shadow-xl ${POSICAO_PAINEL[lado]}`

  const botao = (ativa: boolean) =>
    `flex size-11 cursor-pointer items-center justify-center rounded-full transition-colors ${
      ativa ? 'bg-hover text-ink' : 'text-muted hover:text-ink'
    }`

  if (minimizada) {
    const IconeAtual = canetaAtiva
      ? ICONES[canetaAtiva.id]
      : modo === 'borracha'
        ? IconBorracha
        : modo === 'ponteiro'
          ? IconCursor
          : IconSelecao
    return (
      <button
        onClick={() => setMinimizada(false)}
        aria-label="Expandir barra de ferramentas"
        className={`pointer-events-auto absolute flex size-12 cursor-pointer items-center justify-center rounded-full border border-line bg-bg/95 text-ink shadow-lg backdrop-blur ${POSICAO[lado].replace('flex-row', '').replace('flex-col', '')}`}
      >
        <IconeAtual width={20} height={20} />
      </button>
    )
  }

  return (
    <>
      {painel === 'ferramenta' && canetaAtiva && config && (
        <div data-testid="painel-caneta" className={painelClasse}>
          <div className="flex items-center gap-3">
            <span
              className="rounded-full"
              style={{
                width: Math.max(8, config.espessura + 6),
                height: Math.max(8, config.espessura + 6),
                backgroundColor: config.cor,
                opacity: canetaAtiva.alpha,
              }}
            />
            <span className="text-sm font-medium">{canetaAtiva.rotulo}</span>
            <span className="ml-auto text-xs text-muted">{config.espessura} px</span>
          </div>

          <div className="flex justify-between">
            {PALETA.map((cor) => (
              <button
                key={cor}
                onClick={() => onConfig(canetaAtiva.id, { ...config, cor })}
                aria-label={`Cor ${cor}`}
                className="flex size-8 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110"
              >
                <span
                  className={`size-6 rounded-full ${
                    config.cor.toUpperCase() === cor.toUpperCase()
                      ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg'
                      : ''
                  }`}
                  style={{ backgroundColor: cor }}
                />
              </button>
            ))}
          </div>

          <button
            onClick={() => setPickerAberto((v) => !v)}
            aria-label="Cor personalizada"
            aria-expanded={pickerAberto}
            className={`flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 transition-colors ${
              pickerAberto ? 'border-muted/50 bg-hover/60' : 'border-line hover:bg-hover/60'
            }`}
          >
            <span
              className="size-6 rounded-full border border-line"
              style={{ backgroundColor: config.cor }}
            />
            <span className="font-mono text-sm text-muted">{config.cor}</span>
            <span className="ml-auto text-xs text-muted/70">
              {pickerAberto ? 'fechar' : 'paleta'}
            </span>
          </button>

          {pickerAberto && (
            <SeletorCor
              cor={config.cor}
              onMudar={(hex) => onConfig(canetaAtiva.id, { ...config, cor: hex })}
            />
          )}

          <label className="flex items-center gap-3">
            <span className="w-16 text-xs font-medium text-muted">Ponta</span>
            <input
              type="range"
              min={1}
              max={32}
              value={config.espessura}
              aria-label="Tamanho da ponta"
              onChange={(e) =>
                onConfig(canetaAtiva.id, { ...config, espessura: Number(e.target.value) })
              }
              className="flex-1 accent-(--vida-accent)"
            />
          </label>

          <label className="flex items-center gap-3">
            <span className="w-16 text-xs font-medium text-muted">Assistência</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(config.suavizacao * 100)}
              aria-label="Assistência de caligrafia"
              onChange={(e) =>
                onConfig(canetaAtiva.id, {
                  ...config,
                  suavizacao: Number(e.target.value) / 100,
                })
              }
              className="flex-1 accent-(--vida-accent)"
            />
            <span className="w-9 text-right text-xs text-muted">
              {Math.round(config.suavizacao * 100)}%
            </span>
          </label>
        </div>
      )}

      {painel === 'ferramenta' && modo === 'borracha' && (
        <div data-testid="painel-borracha" className={painelClasse}>
          <span className="text-sm font-medium">Borracha</span>
          <div className="flex overflow-hidden rounded-lg border border-line">
            <button
              onClick={() => onConfigBorracha({ ...configBorracha, modo: 'traco' })}
              aria-pressed={configBorracha.modo === 'traco'}
              className={`min-h-10 flex-1 cursor-pointer text-sm font-medium transition-colors ${
                configBorracha.modo === 'traco' ? 'bg-hover text-ink' : 'text-muted hover:bg-hover/60'
              }`}
            >
              Traço inteiro
            </button>
            <button
              onClick={() => onConfigBorracha({ ...configBorracha, modo: 'pixel' })}
              aria-pressed={configBorracha.modo === 'pixel'}
              className={`min-h-10 flex-1 cursor-pointer text-sm font-medium transition-colors ${
                configBorracha.modo === 'pixel' ? 'bg-hover text-ink' : 'text-muted hover:bg-hover/60'
              }`}
            >
              Pixels
            </button>
          </div>
          <label className="flex items-center gap-3">
            <span className="w-16 text-xs font-medium text-muted">Tamanho</span>
            <input
              type="range"
              min={6}
              max={80}
              value={configBorracha.tamanho}
              aria-label="Tamanho da borracha"
              onChange={(e) =>
                onConfigBorracha({ ...configBorracha, tamanho: Number(e.target.value) })
              }
              className="flex-1 accent-(--vida-accent)"
            />
            <span className="w-9 text-right text-xs text-muted">{configBorracha.tamanho}</span>
          </label>
        </div>
      )}

      {painel === 'ferramenta' && modo === 'selecao' && (
        <div data-testid="painel-selecao" className={painelClasse}>
          <span className="text-sm font-medium">Seleção</span>
          <div className="flex overflow-hidden rounded-lg border border-line">
            <button
              onClick={() => onSelecaoTipo('retangulo')}
              aria-pressed={selecaoTipo === 'retangulo'}
              className={`min-h-10 flex-1 cursor-pointer text-sm font-medium transition-colors ${
                selecaoTipo === 'retangulo' ? 'bg-hover text-ink' : 'text-muted hover:bg-hover/60'
              }`}
            >
              Retângulo
            </button>
            <button
              onClick={() => onSelecaoTipo('laco')}
              aria-pressed={selecaoTipo === 'laco'}
              className={`min-h-10 flex-1 cursor-pointer text-sm font-medium transition-colors ${
                selecaoTipo === 'laco' ? 'bg-hover text-ink' : 'text-muted hover:bg-hover/60'
              }`}
            >
              Laço
            </button>
          </div>
          <p className="text-xs leading-relaxed text-muted">
            Contorne os riscos, depois arraste para mover ou use a alça ↻ para girar.
          </p>
        </div>
      )}

      {painel === 'postit' && (
        <div data-testid="painel-postit" className={painelClasse}>
          <span className="text-sm font-medium">Novo post-it</span>
          <div className="flex justify-between">
            {CORES_POSTIT.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onNovoPostIt(c.valor)
                  setPainel(null)
                }}
                aria-label={`Post-it ${c.rotulo.toLowerCase()}`}
                className="size-14 cursor-pointer rounded-md border border-black/10 shadow-sm transition-transform hover:scale-105"
                style={{ backgroundColor: c.valor }}
              />
            ))}
          </div>
          <p className="text-xs leading-relaxed text-muted">
            Toque numa cor para colar o post-it no centro da tela. Risque em
            cima dele — a tinta acompanha o papel ao mover.
          </p>
        </div>
      )}

      {painel === 'inserir' && (
        <div data-testid="painel-inserir" className={painelClasse}>
          <span className="text-sm font-medium">Adicionar ao quadro</span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onImportarImagem()
                setPainel(null)
              }}
              className="flex min-h-20 flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-line text-sm font-medium text-muted transition-colors hover:bg-hover hover:text-ink"
            >
              <IconImagem />
              Imagem
            </button>
            <button
              onClick={() => {
                onImportarPdf()
                setPainel(null)
              }}
              className="flex min-h-20 flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-line text-sm font-medium text-muted transition-colors hover:bg-hover hover:text-ink"
            >
              <IconDocumento />
              PDF
            </button>
          </div>
        </div>
      )}

      <div
        data-testid="barra-desenho"
        data-lado={lado}
        style={estiloArrasto}
        className={`pointer-events-auto absolute flex items-center gap-0.5 border border-line bg-bg/95 shadow-lg backdrop-blur ${
          vertical ? 'rounded-3xl px-1 py-1.5' : 'rounded-full px-1.5 py-1'
        } ${arrasto ? 'opacity-80' : POSICAO[lado]}`}
      >
        <button
          onPointerDown={alcaPressionar}
          onPointerMove={alcaMover}
          onPointerUp={alcaSoltar}
          aria-label="Mover ou minimizar barra"
          className="flex size-11 cursor-grab touch-none items-center justify-center rounded-full text-muted/60 hover:text-ink active:cursor-grabbing"
        >
          <IconArrastar width={17} height={17} />
        </button>

        <button
          onClick={() => aoTocarFerramenta('ponteiro')}
          aria-label="Ponteiro"
          aria-pressed={modo === 'ponteiro'}
          className={botao(modo === 'ponteiro')}
        >
          <IconCursor width={19} height={19} />
        </button>
        <span className={vertical ? 'my-1 h-px w-6 bg-line' : 'mx-1 h-6 w-px bg-line'} />

        {LISTA_CANETAS.map((c) => {
          const Icone = ICONES[c.id]
          return (
            <button
              key={c.id}
              onClick={() => aoTocarFerramenta(c.id)}
              aria-label={c.rotulo}
              aria-pressed={modo === c.id}
              className={`relative ${botao(modo === c.id)}`}
            >
              <Icone width={19} height={19} />
              <span
                className="absolute bottom-[5px] left-1/2 size-[5px] -translate-x-1/2 rounded-full"
                style={{ backgroundColor: configs[c.id].cor }}
              />
            </button>
          )
        })}
        <span className={vertical ? 'my-1 h-px w-6 bg-line' : 'mx-1 h-6 w-px bg-line'} />
        <button
          onClick={() => aoTocarFerramenta('borracha')}
          aria-label="Borracha"
          aria-pressed={modo === 'borracha'}
          className={botao(modo === 'borracha')}
        >
          <IconBorracha width={19} height={19} />
        </button>
        <button
          onClick={() => aoTocarFerramenta('selecao')}
          aria-label="Seleção"
          aria-pressed={modo === 'selecao'}
          className={botao(modo === 'selecao')}
        >
          <IconSelecao width={19} height={19} />
        </button>
        <span className={vertical ? 'my-1 h-px w-6 bg-line' : 'mx-1 h-6 w-px bg-line'} />
        <button
          onClick={() => setPainel((p) => (p === 'postit' ? null : 'postit'))}
          aria-label="Post-it"
          aria-pressed={painel === 'postit'}
          className={botao(painel === 'postit')}
        >
          <IconPostIt width={19} height={19} />
        </button>
        <button
          onClick={() => setPainel((p) => (p === 'inserir' ? null : 'inserir'))}
          aria-label="Inserir imagem ou PDF"
          aria-pressed={painel === 'inserir'}
          className={botao(painel === 'inserir')}
        >
          <IconImagem width={19} height={19} />
        </button>
        <button
          onClick={() => onRegua(!reguaAtiva)}
          aria-label="Régua"
          aria-pressed={reguaAtiva}
          className={botao(reguaAtiva)}
        >
          <IconRegua width={19} height={19} />
        </button>
      </div>
    </>
  )
}
