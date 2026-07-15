import { useState } from 'react'
import { IconButton } from '../../../core/components/Button'
import {
  IconBorracha,
  IconCaneta,
  IconDesfazer,
  IconLixeira,
} from '../../../core/components/Icons'
import { CORES_CANETA, ESPESSURAS, gerarMiniatura } from '../desenho'
import type { Pagina, Traco } from '../types'
import { CanvasDesenho, type Ferramenta } from './CanvasDesenho'

interface Props {
  pagina: Pagina
  onMudar: (mudancas: Partial<Pagina>) => void
}

export function DesenhoEditor({ pagina, onMudar }: Props) {
  const [ferramenta, setFerramenta] = useState<Ferramenta>({
    modo: 'caneta',
    cor: CORES_CANETA[0].valor,
    espessura: ESPESSURAS[1],
  })
  const [confirmandoLimpar, setConfirmandoLimpar] = useState(false)
  const tracos = pagina.tracos ?? []

  function aplicar(novos: Traco[]) {
    onMudar({ tracos: novos, miniatura: gerarMiniatura(novos) })
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Barra de ferramentas */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-lg border border-line bg-surface/90 p-1.5 backdrop-blur">
        <IconButton
          onClick={() => setFerramenta((f) => ({ ...f, modo: 'caneta' }))}
          aria-label="Caneta"
          aria-pressed={ferramenta.modo === 'caneta'}
          className={ferramenta.modo === 'caneta' ? 'bg-hover text-ink' : ''}
        >
          <IconCaneta />
        </IconButton>
        <IconButton
          onClick={() => setFerramenta((f) => ({ ...f, modo: 'borracha' }))}
          aria-label="Borracha"
          aria-pressed={ferramenta.modo === 'borracha'}
          className={ferramenta.modo === 'borracha' ? 'bg-hover text-ink' : ''}
        >
          <IconBorracha />
        </IconButton>

        <span className="mx-1 h-6 w-px bg-line" />

        {CORES_CANETA.map((c) => (
          <button
            key={c.id}
            onClick={() =>
              setFerramenta((f) => ({ ...f, modo: 'caneta', cor: c.valor }))
            }
            aria-label={c.rotulo}
            aria-pressed={ferramenta.cor === c.valor && ferramenta.modo === 'caneta'}
            className="flex size-10 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-hover"
          >
            <span
              className={`size-5 rounded-full border ${
                ferramenta.cor === c.valor && ferramenta.modo === 'caneta'
                  ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface'
                  : 'border-line'
              }`}
              style={{ backgroundColor: c.valor }}
            />
          </button>
        ))}

        <span className="mx-1 h-6 w-px bg-line" />

        {ESPESSURAS.map((e) => (
          <button
            key={e}
            onClick={() => setFerramenta((f) => ({ ...f, espessura: e }))}
            aria-label={`Espessura ${e}`}
            aria-pressed={ferramenta.espessura === e}
            className={`flex size-10 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-hover ${
              ferramenta.espessura === e ? 'bg-hover' : ''
            }`}
          >
            <span
              className="rounded-full bg-ink"
              style={{ width: 4 + e, height: 4 + e }}
            />
          </button>
        ))}

        <span className="mx-1 h-6 w-px bg-line" />

        <IconButton
          onClick={() => aplicar(tracos.slice(0, -1))}
          aria-label="Desfazer"
          disabled={tracos.length === 0}
        >
          <IconDesfazer />
        </IconButton>
        {confirmandoLimpar ? (
          <button
            onClick={() => {
              aplicar([])
              setConfirmandoLimpar(false)
            }}
            className="min-h-10 cursor-pointer rounded-lg px-3 text-sm font-medium text-danger hover:bg-danger/10"
          >
            Confirmar?
          </button>
        ) : (
          <IconButton
            onClick={() => {
              setConfirmandoLimpar(true)
              setTimeout(() => setConfirmandoLimpar(false), 3000)
            }}
            aria-label="Limpar tudo"
            disabled={tracos.length === 0}
          >
            <IconLixeira />
          </IconButton>
        )}
      </div>

      <CanvasDesenho
        tracos={tracos}
        ferramenta={ferramenta}
        onNovoTraco={(t) => aplicar([...tracos, t])}
        onApagarTraco={(i) => aplicar(tracos.filter((_, j) => j !== i))}
      />

      <p className="text-xs text-muted/60">
        Desenhe com a stylus — a pressão controla a espessura. Depois que a
        caneta é detectada, o dedo serve para rolar a página.
      </p>
    </div>
  )
}
