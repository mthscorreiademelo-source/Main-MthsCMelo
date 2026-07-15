import { useRef, useState } from 'react'
import { Button, IconButton } from '../../../core/components/Button'
import {
  IconDesfazer,
  IconDocumento,
  IconImagem,
  IconLixeira,
  IconMenuPontos,
  IconSetaEsquerda,
} from '../../../core/components/Icons'
import { Sheet } from '../../../core/components/Sheet'
import { nanoid } from 'nanoid'
import { configsIniciais, gerarMiniatura, type ConfigsCanetas } from '../desenho'
import { ordenarGrupos } from '../db'
import { imagemParaItem, pdfParaItens } from '../importar'
import type { Grupo, ItemQuadro, Pagina, PostIt, TipoCaneta, Traco } from '../types'
import { BarraDesenho, type ModoBarra } from './BarraDesenho'
import { QuadroInfinito, type ConfigBorracha, type QuadroApi } from './QuadroInfinito'

interface Props {
  pagina: Pagina
  grupos: Grupo[]
  onMudar: (mudancas: Partial<Pagina>) => void
  onVoltar: () => void
  onExcluir: () => Promise<void>
}

function borrachaInicial(): ConfigBorracha {
  try {
    const salva = localStorage.getItem('vida:borracha')
    if (salva) return JSON.parse(salva) as ConfigBorracha
  } catch {
    /* usa padrão */
  }
  return { modo: 'traco', tamanho: 24 }
}

/** Tela cheia de desenho: quadro infinito + barra flutuante + menu. */
export function DesenhoTela({ pagina, grupos, onMudar, onVoltar, onExcluir }: Props) {
  const [modo, setModo] = useState<ModoBarra>('tinteiro')
  const [configs, setConfigs] = useState<ConfigsCanetas>(configsIniciais)
  const [configBorracha, setConfigBorracha] = useState<ConfigBorracha>(borrachaInicial)
  const [selecaoTipo, setSelecaoTipo] = useState<'retangulo' | 'laco'>('retangulo')
  const [reguaAtiva, setReguaAtiva] = useState(false)
  const [selecaoAtiva, setSelecaoAtiva] = useState(false)
  const [menuAberto, setMenuAberto] = useState(false)
  const [confirmandoLimpar, setConfirmandoLimpar] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [importando, setImportando] = useState(false)
  const [avisoImportacao, setAvisoImportacao] = useState('')
  const quadro = useRef<QuadroApi>(null)
  const inputImagem = useRef<HTMLInputElement>(null)
  const inputPdf = useRef<HTMLInputElement>(null)

  const tracos = pagina.tracos ?? []
  const itens = pagina.itens ?? []
  const postIts = pagina.postIts ?? []
  const ferramenta =
    modo === 'borracha' || modo === 'selecao'
      ? { modo, cor: '', espessura: 0, suavizacao: 0 }
      : { modo, ...configs[modo] }

  function aplicar(
    novosTracos: Traco[],
    novosItens: ItemQuadro[] = itens,
    novosPostIts: PostIt[] = postIts,
  ) {
    onMudar({
      tracos: novosTracos,
      itens: novosItens,
      postIts: novosPostIts,
      miniatura: gerarMiniatura(novosTracos),
    })
  }

  function novoPostIt(cor: string) {
    const centro = quadro.current!.centroMundo()
    const postIt: PostIt = {
      id: nanoid(),
      x: centro.x,
      y: centro.y,
      largura: 280,
      altura: 280,
      cor,
    }
    aplicar(tracos, itens, [...postIts, postIt])
  }

  function mudarConfig(tipo: TipoCaneta, config: ConfigsCanetas[TipoCaneta]) {
    setConfigs((atual) => {
      const novas = { ...atual, [tipo]: config }
      localStorage.setItem('vida:canetas', JSON.stringify(novas))
      return novas
    })
  }

  function mudarBorracha(config: ConfigBorracha) {
    setConfigBorracha(config)
    localStorage.setItem('vida:borracha', JSON.stringify(config))
  }

  async function importarImagem(arquivo: File) {
    setImportando(true)
    try {
      const centro = quadro.current!.centroMundo()
      const item = await imagemParaItem(arquivo, centro.x, centro.y)
      aplicar(tracos, [...itens, item])
      setMenuAberto(false)
    } catch {
      setAvisoImportacao('Não consegui ler essa imagem.')
    } finally {
      setImportando(false)
    }
  }

  async function importarPdf(arquivo: File) {
    setImportando(true)
    setAvisoImportacao('Convertendo PDF…')
    try {
      const centro = quadro.current!.centroMundo()
      const { itens: paginas, totalPaginas } = await pdfParaItens(arquivo, centro.x, centro.y)
      aplicar(tracos, [...itens, ...paginas])
      setAvisoImportacao(
        totalPaginas > paginas.length
          ? `Importadas ${paginas.length} de ${totalPaginas} páginas (limite).`
          : '',
      )
      if (totalPaginas <= paginas.length) setMenuAberto(false)
    } catch (e) {
      setAvisoImportacao(
        `Não consegui ler esse PDF (${e instanceof Error ? e.message : 'erro desconhecido'}).`,
      )
    } finally {
      setImportando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-30 overflow-hidden bg-white">
      <QuadroInfinito
        ref={quadro}
        tracos={tracos}
        itens={itens}
        postIts={postIts}
        ferramenta={ferramenta}
        configBorracha={configBorracha}
        selecaoTipo={selecaoTipo}
        reguaAtiva={reguaAtiva}
        cameraInicial={pagina.camera}
        onNovoTraco={(t) => aplicar([...tracos, t])}
        onApagarTraco={(i) => aplicar(tracos.filter((_, j) => j !== i))}
        onSubstituir={(t, i, p) => aplicar(t, i, p)}
        onCamera={(camera) => onMudar({ camera })}
        onSelecaoMudou={setSelecaoAtiva}
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

      {/* Ações da seleção ativa (acima da barra de ferramentas, sem cobrir a alça) */}
      {selecaoAtiva && (
        <div className="pointer-events-auto absolute bottom-20 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-line bg-bg/95 px-2 py-1 shadow-lg backdrop-blur">
          <span className="px-2 text-xs text-muted">Arraste para mover · alça ↻ gira</span>
          <Button variante="perigo" onClick={() => quadro.current?.excluirSelecao()}>
            <IconLixeira width={15} height={15} />
            Excluir
          </Button>
          <Button onClick={() => quadro.current?.limparSelecao()}>Concluir</Button>
        </div>
      )}

      <BarraDesenho
        modo={modo}
        configs={configs}
        configBorracha={configBorracha}
        selecaoTipo={selecaoTipo}
        reguaAtiva={reguaAtiva}
        onModo={setModo}
        onConfig={mudarConfig}
        onConfigBorracha={mudarBorracha}
        onSelecaoTipo={setSelecaoTipo}
        onRegua={setReguaAtiva}
        onNovoPostIt={novoPostIt}
      />

      {/* Menu ⋯: grupo, importar, limpar, excluir */}
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

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted">Adicionar ao quadro</span>
            <div className="flex gap-2">
              <Button
                onClick={() => inputImagem.current?.click()}
                disabled={importando}
                className="flex-1 border border-line"
              >
                <IconImagem width={16} height={16} />
                Imagem
              </Button>
              <Button
                onClick={() => inputPdf.current?.click()}
                disabled={importando}
                className="flex-1 border border-line"
              >
                <IconDocumento width={16} height={16} />
                PDF
              </Button>
            </div>
            {avisoImportacao && (
              <p className="text-xs text-muted">{avisoImportacao}</p>
            )}
            <input
              ref={inputImagem}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) importarImagem(f)
                e.target.value = ''
              }}
            />
            <input
              ref={inputPdf}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) importarPdf(f)
                e.target.value = ''
              }}
            />
          </div>

          <p className="text-[13px] leading-relaxed text-muted">
            Stylus desenha (com pressão). Um dedo arrasta o quadro, dois dedos
            dão zoom. Com a régua ativa: um dedo move a régua, dois dedos giram.
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
              aplicar([], [], [])
              setConfirmandoLimpar(false)
              setMenuAberto(false)
            }}
            disabled={tracos.length === 0 && itens.length === 0 && postIts.length === 0}
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
