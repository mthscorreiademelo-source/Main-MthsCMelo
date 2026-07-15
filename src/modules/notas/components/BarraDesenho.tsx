import { useState } from 'react'
import {
  IconBorracha,
  IconLapis,
  IconMarcador,
  IconPincel,
  IconRegua,
  IconSelecao,
  IconTinteiro,
} from '../../../core/components/Icons'
import {
  CANETAS,
  LISTA_CANETAS,
  type ConfigCaneta,
  type ConfigsCanetas,
} from '../desenho'
import type { TipoCaneta } from '../types'
import type { ConfigBorracha } from './QuadroInfinito'
import { SeletorCor } from './SeletorCor'

export type ModoBarra = TipoCaneta | 'borracha' | 'selecao'

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
}

/** Barra flutuante minimalista + painel contextual da ferramenta ativa. */
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
}: Props) {
  const [painelAberto, setPainelAberto] = useState(false)
  const [pickerAberto, setPickerAberto] = useState(false)
  const canetaAtiva = modo !== 'borracha' && modo !== 'selecao' ? CANETAS[modo] : null
  const config = canetaAtiva ? configs[canetaAtiva.id] : null

  function aoTocarFerramenta(novo: ModoBarra) {
    if (modo === novo) {
      // tocar na ferramenta já ativa abre/fecha o painel de ajustes
      setPainelAberto((v) => !v)
      setPickerAberto(false)
    } else {
      onModo(novo)
      setPainelAberto(false)
      setPickerAberto(false)
    }
  }

  return (
    <>
      {painelAberto && canetaAtiva && config && (
        <div
          data-testid="painel-caneta"
          className="pointer-events-auto absolute bottom-24 left-1/2 flex w-[19rem] -translate-x-1/2 flex-col gap-4 rounded-2xl border border-line bg-bg p-4 shadow-xl"
        >
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

      {painelAberto && modo === 'borracha' && (
        <div
          data-testid="painel-borracha"
          className="pointer-events-auto absolute bottom-24 left-1/2 flex w-[19rem] -translate-x-1/2 flex-col gap-4 rounded-2xl border border-line bg-bg p-4 shadow-xl"
        >
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

      {painelAberto && modo === 'selecao' && (
        <div
          data-testid="painel-selecao"
          className="pointer-events-auto absolute bottom-24 left-1/2 flex w-[19rem] -translate-x-1/2 flex-col gap-4 rounded-2xl border border-line bg-bg p-4 shadow-xl"
        >
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

      <div className="pointer-events-auto absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-line bg-bg/95 px-1.5 py-1 shadow-lg backdrop-blur">
        {LISTA_CANETAS.map((c) => {
          const Icone = ICONES[c.id]
          const ativa = modo === c.id
          return (
            <button
              key={c.id}
              onClick={() => aoTocarFerramenta(c.id)}
              aria-label={c.rotulo}
              aria-pressed={ativa}
              className={`relative flex size-11 cursor-pointer items-center justify-center rounded-full transition-colors ${
                ativa ? 'bg-hover text-ink' : 'text-muted hover:text-ink'
              }`}
            >
              <Icone width={19} height={19} />
              <span
                className="absolute bottom-[5px] left-1/2 size-[5px] -translate-x-1/2 rounded-full"
                style={{ backgroundColor: configs[c.id].cor }}
              />
            </button>
          )
        })}
        <span className="mx-1 h-6 w-px bg-line" />
        <button
          onClick={() => aoTocarFerramenta('borracha')}
          aria-label="Borracha"
          aria-pressed={modo === 'borracha'}
          className={`flex size-11 cursor-pointer items-center justify-center rounded-full transition-colors ${
            modo === 'borracha' ? 'bg-hover text-ink' : 'text-muted hover:text-ink'
          }`}
        >
          <IconBorracha width={19} height={19} />
        </button>
        <button
          onClick={() => aoTocarFerramenta('selecao')}
          aria-label="Seleção"
          aria-pressed={modo === 'selecao'}
          className={`flex size-11 cursor-pointer items-center justify-center rounded-full transition-colors ${
            modo === 'selecao' ? 'bg-hover text-ink' : 'text-muted hover:text-ink'
          }`}
        >
          <IconSelecao width={19} height={19} />
        </button>
        <span className="mx-1 h-6 w-px bg-line" />
        <button
          onClick={() => onRegua(!reguaAtiva)}
          aria-label="Régua"
          aria-pressed={reguaAtiva}
          className={`flex size-11 cursor-pointer items-center justify-center rounded-full transition-colors ${
            reguaAtiva ? 'bg-hover text-ink' : 'text-muted hover:text-ink'
          }`}
        >
          <IconRegua width={19} height={19} />
        </button>
      </div>
    </>
  )
}
