import { useState } from 'react'
import { Button, IconButton } from '../../../core/components/Button'
import {
  IconDesfazer,
  IconLixeira,
  IconMenuPontos,
  IconSetaEsquerda,
} from '../../../core/components/Icons'
import { Sheet } from '../../../core/components/Sheet'
import { configsIniciais, gerarMiniatura, type ConfigsCanetas } from '../desenho'
import { ordenarGrupos } from '../db'
import type { Grupo, Pagina, TipoCaneta, Traco } from '../types'
import { BarraDesenho } from './BarraDesenho'
import { QuadroInfinito } from './QuadroInfinito'

interface Props {
  pagina: Pagina
  grupos: Grupo[]
  onMudar: (mudancas: Partial<Pagina>) => void
  onVoltar: () => void
  onExcluir: () => Promise<void>
}

/** Tela cheia de desenho: quadro infinito + barra flutuante + menu. */
export function DesenhoTela({ pagina, grupos, onMudar, onVoltar, onExcluir }: Props) {
  const [modo, setModo] = useState<TipoCaneta | 'borracha'>('tinteiro')
  const [configs, setConfigs] = useState<ConfigsCanetas>(configsIniciais)
  const [menuAberto, setMenuAberto] = useState(false)
  const [confirmandoLimpar, setConfirmandoLimpar] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)

  const tracos = pagina.tracos ?? []
  const ferramenta =
    modo === 'borracha'
      ? { modo, cor: '', espessura: 0 }
      : { modo, ...configs[modo] }

  function aplicar(novos: Traco[]) {
    onMudar({ tracos: novos, miniatura: gerarMiniatura(novos) })
  }

  function mudarConfig(tipo: TipoCaneta, config: ConfigsCanetas[TipoCaneta]) {
    setConfigs((atual) => {
      const novas = { ...atual, [tipo]: config }
      localStorage.setItem('vida:canetas', JSON.stringify(novas))
      return novas
    })
  }

  return (
    <div className="fixed inset-0 z-30 overflow-hidden bg-white">
      <QuadroInfinito
        tracos={tracos}
        ferramenta={ferramenta}
        cameraInicial={pagina.camera}
        onNovoTraco={(t) => aplicar([...tracos, t])}
        onApagarTraco={(i) => aplicar(tracos.filter((_, j) => j !== i))}
        onCamera={(camera) => onMudar({ camera })}
      />

      {/* Topo flutuante */}
      <div className="pointer-events-none absolute top-3 right-3 left-3 flex items-center gap-2">
        <div className="pointer-events-auto flex items-center rounded-full border border-line bg-bg/95 shadow-md backdrop-blur">
          <IconButton onClick={onVoltar} aria-label="Voltar para Notas">
            <IconSetaEsquerda />
          </IconButton>
        </div>
        <input
          value={pagina.titulo}
          onChange={(e) => onMudar({ titulo: e.target.value })}
          placeholder="Sem título"
          className="pointer-events-auto min-h-11 w-56 rounded-full border border-line bg-bg/95 px-4 text-sm font-medium shadow-md backdrop-blur outline-none placeholder:text-muted/60 focus:border-muted/50"
        />
        <div className="pointer-events-auto ml-auto flex items-center gap-0.5 rounded-full border border-line bg-bg/95 px-1 shadow-md backdrop-blur">
          <IconButton
            onClick={() => aplicar(tracos.slice(0, -1))}
            aria-label="Desfazer"
            disabled={tracos.length === 0}
          >
            <IconDesfazer />
          </IconButton>
          <IconButton onClick={() => setMenuAberto(true)} aria-label="Mais opções">
            <IconMenuPontos />
          </IconButton>
        </div>
      </div>

      <BarraDesenho modo={modo} configs={configs} onModo={setModo} onConfig={mudarConfig} />

      {/* Menu ⋯: grupo, limpar, excluir */}
      <Sheet aberto={menuAberto} titulo="Desenho" onFechar={() => setMenuAberto(false)}>
        <div className="flex h-full flex-col gap-5">
          {grupos.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-muted">Grupo</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => onMudar({ grupoId: undefined })}
                  className={`min-h-9 cursor-pointer rounded-full border px-3 text-[13px] font-medium transition-colors ${
                    !pagina.grupoId
                      ? 'border-ink bg-ink text-bg'
                      : 'border-line text-muted hover:bg-hover'
                  }`}
                >
                  Nenhum
                </button>
                {ordenarGrupos(grupos).map((g) => (
                  <button
                    key={g.id}
                    onClick={() => onMudar({ grupoId: g.id })}
                    className={`min-h-9 cursor-pointer rounded-full border px-3 text-[13px] font-medium transition-colors ${
                      pagina.grupoId === g.id
                        ? 'border-ink bg-ink text-bg'
                        : 'border-line text-muted hover:bg-hover'
                    }`}
                  >
                    {g.nome}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-[13px] leading-relaxed text-muted">
            Stylus desenha (com pressão). Um dedo arrasta o quadro, dois dedos
            dão zoom. No computador: roda rola e Ctrl+roda dá zoom.
          </p>

          <div className="flex-1" />

          <Button
            variante="perigo"
            onClick={() => {
              if (!confirmandoLimpar) {
                setConfirmandoLimpar(true)
                setTimeout(() => setConfirmandoLimpar(false), 3000)
                return
              }
              aplicar([])
              setConfirmandoLimpar(false)
              setMenuAberto(false)
            }}
            disabled={tracos.length === 0}
            className="self-start"
          >
            {confirmandoLimpar ? 'Confirmar limpeza?' : 'Limpar o quadro'}
          </Button>
          <Button
            variante="perigo"
            onClick={async () => {
              if (!confirmandoExclusao) {
                setConfirmandoExclusao(true)
                setTimeout(() => setConfirmandoExclusao(false), 3000)
                return
              }
              await onExcluir()
            }}
            className="self-start"
          >
            <IconLixeira width={16} height={16} />
            {confirmandoExclusao ? 'Confirmar exclusão' : 'Excluir desenho'}
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
