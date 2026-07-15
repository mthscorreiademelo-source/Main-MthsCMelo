import { useState } from 'react'
import {
  IconBorracha,
  IconLapis,
  IconMarcador,
  IconPincel,
  IconTinteiro,
} from '../../../core/components/Icons'
import {
  CANETAS,
  LISTA_CANETAS,
  type ConfigCaneta,
  type ConfigsCanetas,
} from '../desenho'
import type { TipoCaneta } from '../types'

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
  modo: TipoCaneta | 'borracha'
  configs: ConfigsCanetas
  onModo: (modo: TipoCaneta | 'borracha') => void
  onConfig: (tipo: TipoCaneta, config: ConfigCaneta) => void
}

/** Barra flutuante minimalista + painel de cor/tamanho da caneta ativa. */
export function BarraDesenho({ modo, configs, onModo, onConfig }: Props) {
  const [painelAberto, setPainelAberto] = useState(false)
  const [hex, setHex] = useState('')
  const canetaAtiva = modo !== 'borracha' ? CANETAS[modo] : null
  const config = canetaAtiva ? configs[canetaAtiva.id] : null

  function aoTocarCaneta(tipo: TipoCaneta) {
    if (modo === tipo) {
      // tocar na caneta já ativa abre/fecha o painel de ajustes
      setPainelAberto((v) => !v)
      setHex('')
    } else {
      onModo(tipo)
      setPainelAberto(false)
    }
  }

  function aplicarHex(texto: string) {
    setHex(texto)
    const limpo = texto.trim().replace(/^#/, '')
    if (/^[0-9a-fA-F]{6}$/.test(limpo) && canetaAtiva) {
      onConfig(canetaAtiva.id, { ...config!, cor: `#${limpo.toUpperCase()}` })
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

          <label className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted">Hex</span>
            <input
              value={hex}
              onChange={(e) => aplicarHex(e.target.value)}
              placeholder={config.cor}
              aria-label="Cor hex"
              spellCheck={false}
              className="min-h-10 w-28 rounded-lg border border-line bg-transparent px-2.5 font-mono text-sm outline-none focus:border-muted/50"
            />
            <span
              className="ml-auto size-6 rounded-full border border-line"
              style={{ backgroundColor: config.cor }}
            />
          </label>

          <label className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted">Ponta</span>
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
        </div>
      )}

      <div className="pointer-events-auto absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-line bg-bg/95 px-1.5 py-1 shadow-lg backdrop-blur">
        {LISTA_CANETAS.map((c) => {
          const Icone = ICONES[c.id]
          const ativa = modo === c.id
          return (
            <button
              key={c.id}
              onClick={() => aoTocarCaneta(c.id)}
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
          onClick={() => {
            onModo('borracha')
            setPainelAberto(false)
          }}
          aria-label="Borracha"
          aria-pressed={modo === 'borracha'}
          className={`flex size-11 cursor-pointer items-center justify-center rounded-full transition-colors ${
            modo === 'borracha' ? 'bg-hover text-ink' : 'text-muted hover:text-ink'
          }`}
        >
          <IconBorracha width={19} height={19} />
        </button>
      </div>
    </>
  )
}
