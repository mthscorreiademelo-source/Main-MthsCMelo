import { useEffect, useRef, useState } from 'react'
import { Button, IconButton } from '../../../core/components/Button'
import {
  IconContrair,
  IconDesfazer,
  IconExpandir,
  IconLixeira,
  IconMenuPontos,
  IconSetaEsquerda,
} from '../../../core/components/Icons'
import { Sheet } from '../../../core/components/Sheet'
import { nanoid } from 'nanoid'
import { configsIniciais, gerarMiniatura, limitesDosTracos, type ConfigsCanetas } from '../desenho'
import { ordenarGrupos } from '../db'
import { imagemParaItem, pdfParaItens } from '../importar'
import { guardarPrancheta, lerPrancheta } from '../prancheta'
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
  const [menuCtx, setMenuCtx] = useState<{ sx: number; sy: number; wx: number; wy: number } | null>(null)
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
  const [telaCheia, setTelaCheia] = useState(false)
  const quadro = useRef<QuadroApi>(null)
  const inputImagem = useRef<HTMLInputElement>(null)
  const inputPdf = useRef<HTMLInputElement>(null)

  // Tela cheia imersiva: esconde as barras de navegação do tablet enquanto
  // se desenha (palma da mão encostava nelas). Sai ao fechar o desenho.
  useEffect(() => {
    const sincronizar = () => setTelaCheia(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', sincronizar)
    return () => {
      document.removeEventListener('fullscreenchange', sincronizar)
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }
  }, [])

  async function alternarTelaCheia(desligarPreferencia = false) {
    try {
      if (document.fullscreenElement) {
        if (desligarPreferencia) localStorage.setItem('vida:telacheia', '0')
        await document.exitFullscreen()
      } else {
        localStorage.setItem('vida:telacheia', '1')
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
      }
    } catch {
      /* navegador pode negar fora de gesto do usuário */
    }
  }

  function aoPrimeiroToque() {
    if (
      !document.fullscreenElement &&
      localStorage.getItem('vida:telacheia') !== '0'
    ) {
      document.documentElement
        .requestFullscreen({ navigationUI: 'hide' })
        .catch(() => {})
    }
  }

  const tracos = pagina.tracos ?? []
  const itens = pagina.itens ?? []
  const postIts = pagina.postIts ?? []
  const ferramenta =
    modo === 'borracha' || modo === 'selecao' || modo === 'ponteiro'
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

  /** Após inserir algo, ativa o ponteiro e deixa o objeto selecionado. */
  function selecionarInserido(alvo: { postItId?: string; itemId?: string }) {
    setModo('ponteiro')
    setTimeout(() => quadro.current?.selecionarObjeto(alvo), 80)
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
    selecionarInserido({ postItId: postIt.id })
  }

  function copiar() {
    const conteudo = quadro.current?.copiarSelecao()
    setMenuCtx(null)
    if (
      conteudo &&
      (conteudo.tracos.length || conteudo.itens.length || conteudo.postIts.length)
    ) {
      guardarPrancheta(conteudo)
      setAvisoImportacao('Copiado')
      setTimeout(() => setAvisoImportacao(''), 2000)
    } else {
      setAvisoImportacao('Nada selecionado para copiar')
      setTimeout(() => setAvisoImportacao(''), 2500)
    }
  }

  async function colar(wx: number, wy: number) {
    setMenuCtx(null)
    // 1) imagem da área de transferência do sistema
    try {
      const doSistema = await navigator.clipboard.read()
      for (const clip of doSistema) {
        const tipo = clip.types.find((t) => t.startsWith('image/'))
        if (tipo) {
          const blob = await clip.getType(tipo)
          const arquivo = new File([blob], 'colada.png', { type: tipo })
          const item = await imagemParaItem(arquivo, wx, wy)
          aplicar(tracos, [...itens, item])
          selecionarInserido({ itemId: item.id })
          return
        }
      }
    } catch {
      /* sem permissão ou sem imagem no sistema: tenta a prancheta interna */
    }

    // 2) prancheta interna (conteúdo copiado do quadro)
    const p = lerPrancheta()
    if (!p) {
      setAvisoImportacao('Nada para colar')
      setTimeout(() => setAvisoImportacao(''), 2500)
      return
    }
    // centro do conteúdo copiado → desloca para o ponto do toque
    let cx = 0
    let cy = 0
    let n = 0
    const caixa = limitesDosTracos(p.tracos)
    if (caixa) {
      cx += (caixa.minX + caixa.maxX) / 2
      cy += (caixa.minY + caixa.maxY) / 2
      n++
    }
    for (const grupo of [...p.itens, ...p.postIts]) {
      cx += grupo.x
      cy += grupo.y
      n++
    }
    if (n > 0) {
      cx /= n
      cy /= n
    }
    const ddx = wx - cx
    const ddy = wy - cy
    const mapaPostIt = new Map<string, string>()
    const novosPostIts = p.postIts.map((pi) => {
      const novoId = nanoid()
      mapaPostIt.set(pi.id, novoId)
      return { ...pi, id: novoId, x: pi.x + ddx, y: pi.y + ddy }
    })
    const novosTracos = p.tracos.map((t) => {
      const pontos = [...t.pontos]
      for (let i = 0; i < pontos.length; i += 3) {
        pontos[i] += ddx
        pontos[i + 1] += ddy
      }
      const postItId = t.postItId ? mapaPostIt.get(t.postItId) : undefined
      return { ...t, pontos, ...(postItId ? { postItId } : { postItId: undefined }) }
    })
    const novosItens = p.itens.map((it) => ({
      ...it,
      id: nanoid(),
      x: it.x + ddx,
      y: it.y + ddy,
    }))
    aplicar(
      [...tracos, ...novosTracos],
      [...itens, ...novosItens],
      [...postIts, ...novosPostIts],
    )
    setModo('ponteiro')
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
      selecionarInserido({ itemId: item.id })
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
      if (paginas.length > 0) selecionarInserido({ itemId: paginas[0].id })
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
    <div className="fixed inset-0 z-30 overflow-hidden bg-white" onPointerDown={aoPrimeiroToque}>
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
        onMenuContexto={(sx, sy, wx, wy) => setMenuCtx({ sx, sy, wx, wy })}
      />

      {/* Menu de contexto (toque longo / clique direito) */}
      {menuCtx && (
        <>
          <div
            className="absolute inset-0 z-40"
            onPointerDown={() => setMenuCtx(null)}
          />
          <div
            data-testid="menu-contexto"
            className="absolute z-50 flex w-60 flex-col rounded-xl border border-line bg-bg py-1.5 shadow-xl"
            style={{
              left: Math.min(menuCtx.sx, window.innerWidth - 260),
              top: Math.min(menuCtx.sy, window.innerHeight - 220),
            }}
          >
            <button
              onClick={copiar}
              disabled={!selecaoAtiva}
              className="min-h-11 cursor-pointer px-4 text-left text-sm font-medium transition-colors hover:bg-hover disabled:cursor-default disabled:opacity-40"
            >
              Copiar seleção
            </button>
            <button
              onClick={() => colar(menuCtx.wx, menuCtx.wy)}
              className="min-h-11 cursor-pointer px-4 text-left text-sm font-medium transition-colors hover:bg-hover"
            >
              Colar aqui
            </button>
            <span className="mx-3 my-1 h-px bg-line" />
            <button
              onClick={() => {
                setMenuCtx(null)
                setMenuAberto(true)
              }}
              className="min-h-11 cursor-pointer px-4 text-left text-sm font-medium transition-colors hover:bg-hover"
            >
              Configurações da página…
            </button>
          </div>
        </>
      )}

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
          <IconButton
            onClick={() => alternarTelaCheia(true)}
            aria-label={telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}
          >
            {telaCheia ? <IconContrair /> : <IconExpandir />}
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
        onImportarImagem={() => inputImagem.current?.click()}
        onImportarPdf={() => inputPdf.current?.click()}
      />

      {/* Inputs de importação (compartilhados pela barra) */}
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

      {(avisoImportacao || importando) && (
        <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 rounded-full border border-line bg-bg/95 px-4 py-2 text-xs text-muted shadow-md backdrop-blur">
          {importando && !avisoImportacao ? 'Importando…' : avisoImportacao}
        </div>
      )}

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
