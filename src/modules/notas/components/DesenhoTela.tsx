import { useEffect, useRef, useState } from 'react'
import { Button, IconButton } from '../../../core/components/Button'
import {
  IconContrair,
  IconDesfazer,
  IconExpandir,
  IconLixeira,
  IconMenuPontos,
  IconRefazer,
  IconSetaEsquerda,
} from '../../../core/components/Icons'
import { Sheet } from '../../../core/components/Sheet'
import { nanoid } from 'nanoid'
import {
  configsIniciais,
  CORES_POSTIT,
  gerarMiniatura,
  limitesDosTracos,
  type ConfigsCanetas,
} from '../desenho'
import { ordenarGrupos } from '../db'
import {
  imagemParaItem,
  itemImagemDePagina,
  itemPagerPdf,
  renderizarPaginasPdf,
} from '../importar'
import { guardarPrancheta, lerPrancheta } from '../prancheta'
import type {
  Comentario,
  Grupo,
  ItemQuadro,
  Pagina,
  PostIt,
  TextoQuadro,
  TipoCaneta,
  Traco,
} from '../types'
import { BarraDesenho, type ModoBarra } from './BarraDesenho'
import { CamadaComentarios, type CamadaComentariosApi } from './CamadaComentarios'
import { CamadaTextos, type CamadaTextosApi } from './CamadaTextos'
import { QuadroInfinito, type ConfigBorracha, type QuadroApi } from './QuadroInfinito'

const COR_TEXTO_PADRAO = '#37352F'
const TAMANHO_TEXTO_PADRAO = 28

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

/**
 * Dispositivo com o TOQUE como entrada principal (tablet/celular) — não um
 * desktop/notebook com mouse. Usado para só ativar a tela cheia imersiva
 * (que some com a barra de navegação do sistema) no tablet.
 */
function ehDispositivoToque(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches
  )
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
  const [pagerSelId, setPagerSelId] = useState<string | null>(null)
  const [postItSelId, setPostItSelId] = useState<string | null>(null)
  const [dialogoPdf, setDialogoPdf] = useState<{ paginas: string[]; indice: number; total: number } | null>(null)
  const [menuAberto, setMenuAberto] = useState(false)
  const [confirmandoLimpar, setConfirmandoLimpar] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [importando, setImportando] = useState(false)
  const [avisoImportacao, setAvisoImportacao] = useState('')
  const [telaCheia, setTelaCheia] = useState(false)
  const quadro = useRef<QuadroApi>(null)
  const camadaTextos = useRef<CamadaTextosApi>(null)
  const camadaComentarios = useRef<CamadaComentariosApi>(null)
  const inputImagem = useRef<HTMLInputElement>(null)
  const inputPdf = useRef<HTMLInputElement>(null)

  // Histórico de desfazer/refazer: pilhas de instantâneos do conteúdo do quadro
  // (traços, itens, post-its). Toda alteração passa por `aplicar`, então é ali
  // que empilhamos — cobre desenhar, apagar, mover, colar, limpar etc.
  type Instantaneo = {
    tracos: Traco[]
    itens: ItemQuadro[]
    postIts: PostIt[]
    textos: TextoQuadro[]
    comentarios: Comentario[]
  }
  const desfazerPilha = useRef<Instantaneo[]>([])
  const refazerPilha = useRef<Instantaneo[]>([])
  const [hist, setHist] = useState({ desfazer: 0, refazer: 0 })

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
    // Só no tablet/celular: some com a barra do sistema (apps recentes, voltar,
    // início) ao desenhar. No desktop/notebook não deve forçar tela cheia.
    if (!ehDispositivoToque()) return
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
  const textos = pagina.textos ?? []
  const comentarios = pagina.comentarios ?? []
  const ferramenta =
    modo === 'borracha' || modo === 'selecao' || modo === 'ponteiro' || modo === 'texto'
      ? { modo, cor: '', espessura: 0, suavizacao: 0 }
      : { modo, ...configs[modo] }

  function aplicar(
    novosTracos: Traco[],
    novosItens: ItemQuadro[] = itens,
    novosPostIts: PostIt[] = postIts,
    novosTextos: TextoQuadro[] = textos,
    novosComentarios: Comentario[] = comentarios,
    registrar = true,
  ) {
    if (registrar) {
      // guarda o estado ATUAL (antes da mudança) para poder desfazer
      desfazerPilha.current.push({ tracos, itens, postIts, textos, comentarios })
      if (desfazerPilha.current.length > 100) desfazerPilha.current.shift()
      refazerPilha.current = []
      setHist({ desfazer: desfazerPilha.current.length, refazer: 0 })
    }
    onMudar({
      tracos: novosTracos,
      itens: novosItens,
      postIts: novosPostIts,
      textos: novosTextos,
      comentarios: novosComentarios,
      miniatura: gerarMiniatura(novosTracos),
    })
  }

  function desfazer() {
    const anterior = desfazerPilha.current.pop()
    if (!anterior) return
    refazerPilha.current.push({ tracos, itens, postIts, textos, comentarios })
    setHist({ desfazer: desfazerPilha.current.length, refazer: refazerPilha.current.length })
    quadro.current?.limparSelecao()
    onMudar({ ...anterior, miniatura: gerarMiniatura(anterior.tracos) })
  }

  function refazer() {
    const proximo = refazerPilha.current.pop()
    if (!proximo) return
    desfazerPilha.current.push({ tracos, itens, postIts, textos, comentarios })
    setHist({ desfazer: desfazerPilha.current.length, refazer: refazerPilha.current.length })
    quadro.current?.limparSelecao()
    onMudar({ ...proximo, miniatura: gerarMiniatura(proximo.tracos) })
  }

  // Atalhos de teclado: Ctrl/Cmd+Z desfaz, Ctrl+Shift+Z ou Ctrl+Y refaz.
  useEffect(() => {
    const aoTecla = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const k = e.key.toLowerCase()
      const alvo = e.target as HTMLElement | null
      if (alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.isContentEditable)) return
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault()
        desfazer()
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault()
        refazer()
      }
    }
    window.addEventListener('keydown', aoTecla)
    return () => window.removeEventListener('keydown', aoTecla)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracos, itens, postIts, textos, comentarios])

  // Novo desenho aberto: zera o histórico de desfazer/refazer.
  useEffect(() => {
    desfazerPilha.current = []
    refazerPilha.current = []
    setHist({ desfazer: 0, refazer: 0 })
  }, [pagina.id])

  /** Após inserir algo, ativa o ponteiro e deixa o objeto selecionado. */
  function selecionarInserido(alvo: { postItId?: string; itemId?: string }) {
    setModo('ponteiro')
    setTimeout(() => quadro.current?.selecionarObjeto(alvo), 80)
  }

  /** Cria um post-it (no ponto dado ou no centro da tela) e já o seleciona. */
  function novoPostIt(cor: string, wx?: number, wy?: number) {
    const centro = wx !== undefined && wy !== undefined ? { x: wx, y: wy } : quadro.current!.centroMundo()
    const postIt: PostIt = {
      id: nanoid(),
      x: centro.x,
      y: centro.y,
      // tamanho confortável para o dedo no tablet
      largura: 240,
      altura: 240,
      cor,
    }
    aplicar(tracos, itens, [...postIts, postIt])
    selecionarInserido({ postItId: postIt.id })
  }

  /** Troca a cor do post-it selecionado (paleta rápida da seleção). */
  function trocarCorPostIt(cor: string) {
    if (!postItSelId) return
    aplicar(
      tracos,
      itens,
      postIts.map((p) => (p.id === postItSelId ? { ...p, cor } : p)),
    )
  }

  /** Ferramenta de texto: cria o bloco no ponto clicado e já abre para digitar. */
  function criarTexto(wx: number, wy: number) {
    setModo('ponteiro')
    setTimeout(() => camadaTextos.current?.novo(wx, wy), 0)
  }

  /** Commit dos blocos de texto (entra no histórico de desfazer). */
  function mudarTextos(novos: TextoQuadro[]) {
    aplicar(tracos, itens, postIts, novos)
  }

  /** Cria um comentário no ponto dado e já abre para escrever. */
  function novoComentario(wx: number, wy: number) {
    setModo('ponteiro')
    quadro.current?.limparSelecao()
    setTimeout(() => camadaComentarios.current?.novo(wx, wy), 0)
  }

  /** Commit da lista de comentários (entra no histórico de desfazer). */
  function mudarComentarios(novos: Comentario[]) {
    aplicar(tracos, itens, postIts, textos, novos)
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
    const mapaItem = new Map<string, string>()
    const novosItens = p.itens.map((it) => {
      const novoId = nanoid()
      mapaItem.set(it.id, novoId)
      return { ...it, id: novoId, x: it.x + ddx, y: it.y + ddy }
    })
    const novosTracos = p.tracos.map((t) => {
      const pontos = [...t.pontos]
      for (let i = 0; i < pontos.length; i += 3) {
        pontos[i] += ddx
        pontos[i + 1] += ddy
      }
      const postItId = t.postItId ? mapaPostIt.get(t.postItId) : undefined
      const itemId = t.itemId ? mapaItem.get(t.itemId) : undefined
      return {
        ...t,
        pontos,
        postItId,
        itemId,
      }
    })
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
      const { paginas, total } = await renderizarPaginasPdf(arquivo)
      setMenuAberto(false)
      setAvisoImportacao('')
      setDialogoPdf({ paginas, indice: 0, total })
    } catch (e) {
      setAvisoImportacao(
        `Não consegui ler esse PDF (${e instanceof Error ? e.message : 'erro desconhecido'}).`,
      )
    } finally {
      setImportando(false)
    }
  }

  async function adicionarPaginaPdf() {
    if (!dialogoPdf) return
    const centro = quadro.current!.centroMundo()
    const item = await itemImagemDePagina(dialogoPdf.paginas[dialogoPdf.indice], centro.x, centro.y)
    setDialogoPdf(null)
    aplicar(tracos, [...itens, item])
    selecionarInserido({ itemId: item.id })
  }

  async function adicionarPdfInteiro() {
    if (!dialogoPdf) return
    const centro = quadro.current!.centroMundo()
    const item = await itemPagerPdf(dialogoPdf.paginas, centro.x, centro.y)
    setDialogoPdf(null)
    aplicar(tracos, [...itens, item])
    selecionarInserido({ itemId: item.id })
  }

  /** Vira a página do PDF folheador selecionado (delta -1 ou +1). */
  function virarPagina(delta: number) {
    if (!pagerSelId) return
    const novos = itens.map((it) => {
      if (it.id !== pagerSelId || it.tipo !== 'pdf') return it
      const total = it.paginas?.length ?? 1
      const atual = Math.min(total - 1, Math.max(0, (it.paginaAtual ?? 0) + delta))
      return { ...it, paginaAtual: atual }
    })
    aplicar(tracos, novos)
  }

  const pagerSel = pagerSelId ? itens.find((i) => i.id === pagerSelId) : undefined
  const postItSel = postItSelId ? postIts.find((p) => p.id === postItSelId) : undefined

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
        fundoQuadro={pagina.fundoQuadro}
        cameraInicial={pagina.camera}
        onNovoTraco={(t) => aplicar([...tracos, t])}
        onApagarTraco={(i) => aplicar(tracos.filter((_, j) => j !== i))}
        onSubstituir={(t, i, p) => aplicar(t, i, p)}
        onCamera={(camera) => onMudar({ camera })}
        onCameraVivo={(c) => {
          camadaTextos.current?.aplicarCamera(c)
          camadaComentarios.current?.aplicarCamera(c)
        }}
        onCriarTexto={criarTexto}
        onSelecaoMudou={(ativa, pagerId, postSel) => {
          setSelecaoAtiva(ativa)
          setPagerSelId(pagerId)
          setPostItSelId(postSel ?? null)
        }}
        onMenuContexto={(sx, sy, wx, wy) => setMenuCtx({ sx, sy, wx, wy })}
      />

      <CamadaTextos
        ref={camadaTextos}
        textos={textos}
        interativo={modo === 'ponteiro' || modo === 'texto'}
        camInicial={pagina.camera}
        corPadrao={COR_TEXTO_PADRAO}
        tamanhoPadrao={TAMANHO_TEXTO_PADRAO}
        onMudarTextos={mudarTextos}
      />

      <CamadaComentarios
        ref={camadaComentarios}
        comentarios={comentarios}
        interativo={modo === 'ponteiro' || modo === 'texto'}
        camInicial={pagina.camera}
        onMudar={mudarComentarios}
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
              top: Math.min(menuCtx.sy, window.innerHeight - 320),
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
                const { wx, wy } = menuCtx
                setMenuCtx(null)
                novoPostIt(CORES_POSTIT[0].valor, wx, wy)
              }}
              className="min-h-11 cursor-pointer px-4 text-left text-sm font-medium transition-colors hover:bg-hover"
            >
              Adicionar post-it
            </button>
            <button
              onClick={() => {
                const { wx, wy } = menuCtx
                setMenuCtx(null)
                novoComentario(wx, wy)
              }}
              className="min-h-11 cursor-pointer px-4 text-left text-sm font-medium transition-colors hover:bg-hover"
            >
              Adicionar comentário
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
          <IconButton onClick={desfazer} aria-label="Desfazer" disabled={hist.desfazer === 0}>
            <IconDesfazer />
          </IconButton>
          <IconButton onClick={refazer} aria-label="Refazer" disabled={hist.refazer === 0}>
            <IconRefazer />
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
          {pagerSel && pagerSel.tipo === 'pdf' ? (
            <span className="flex items-center gap-1 pr-1">
              <IconButton
                onClick={() => virarPagina(-1)}
                aria-label="Página anterior"
                disabled={(pagerSel.paginaAtual ?? 0) <= 0}
              >
                <IconSetaEsquerda width={18} height={18} />
              </IconButton>
              <span className="min-w-14 text-center text-xs font-medium text-muted">
                {(pagerSel.paginaAtual ?? 0) + 1} / {pagerSel.paginas?.length ?? 1}
              </span>
              <IconButton
                onClick={() => virarPagina(1)}
                aria-label="Próxima página"
                disabled={(pagerSel.paginaAtual ?? 0) >= (pagerSel.paginas?.length ?? 1) - 1}
              >
                <IconSetaEsquerda width={18} height={18} className="rotate-180" />
              </IconButton>
              <span className="mx-1 h-6 w-px bg-line" />
            </span>
          ) : postItSel ? (
            <span className="flex items-center gap-1.5 pr-1" data-testid="paleta-postit">
              {CORES_POSTIT.map((c) => {
                const ativa = postItSel.cor.toUpperCase() === c.valor.toUpperCase()
                return (
                  <button
                    key={c.id}
                    onClick={() => trocarCorPostIt(c.valor)}
                    aria-label={`Cor ${c.rotulo.toLowerCase()}`}
                    aria-pressed={ativa}
                    className="flex size-8 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110"
                  >
                    <span
                      className={`size-6 rounded-full border border-black/10 ${
                        ativa ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg' : ''
                      }`}
                      style={{ backgroundColor: c.valor }}
                    />
                  </button>
                )
              })}
              <span className="mx-1 h-6 w-px bg-line" />
            </span>
          ) : (
            <span className="px-2 text-xs text-muted">Arraste para mover · alça ↻ gira</span>
          )}
          <Button variante="perigo" onClick={() => quadro.current?.excluirSelecao()}>
            <IconLixeira width={15} height={15} />
            Excluir
          </Button>
          <Button onClick={() => quadro.current?.limparSelecao()}>Concluir</Button>
        </div>
      )}

      {/* Diálogo de importação de PDF: escolher uma página ou o documento inteiro */}
      {dialogoPdf && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div
            data-testid="dialogo-pdf"
            className="flex max-h-full w-full max-w-sm flex-col gap-3 rounded-2xl border border-line bg-bg p-4 shadow-xl"
          >
            <span className="text-sm font-semibold">Adicionar PDF</span>
            <div className="flex items-center justify-center rounded-lg border border-line bg-surface/60 p-2">
              <img
                src={dialogoPdf.paginas[dialogoPdf.indice]}
                alt=""
                className="max-h-64 w-auto rounded shadow-sm"
              />
            </div>
            <div className="flex items-center justify-center gap-2">
              <IconButton
                onClick={() =>
                  setDialogoPdf((d) => (d ? { ...d, indice: Math.max(0, d.indice - 1) } : d))
                }
                aria-label="Página anterior"
                disabled={dialogoPdf.indice <= 0}
              >
                <IconSetaEsquerda width={18} height={18} />
              </IconButton>
              <span className="min-w-16 text-center text-sm text-muted">
                {dialogoPdf.indice + 1} / {dialogoPdf.paginas.length}
              </span>
              <IconButton
                onClick={() =>
                  setDialogoPdf((d) =>
                    d ? { ...d, indice: Math.min(d.paginas.length - 1, d.indice + 1) } : d,
                  )
                }
                aria-label="Próxima página"
                disabled={dialogoPdf.indice >= dialogoPdf.paginas.length - 1}
              >
                <IconSetaEsquerda width={18} height={18} className="rotate-180" />
              </IconButton>
            </div>
            {dialogoPdf.total > dialogoPdf.paginas.length && (
              <p className="text-center text-xs text-muted/70">
                Mostrando as primeiras {dialogoPdf.paginas.length} de {dialogoPdf.total} páginas.
              </p>
            )}
            <div className="flex flex-col gap-2">
              <Button variante="primaria" onClick={adicionarPaginaPdf} className="w-full">
                Adicionar só esta página
              </Button>
              <Button onClick={adicionarPdfInteiro} className="w-full border border-line">
                Adicionar PDF inteiro (folhear)
              </Button>
              <Button onClick={() => setDialogoPdf(null)} className="w-full text-muted">
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      <BarraDesenho
        modo={modo}
        configs={configs}
        configBorracha={configBorracha}
        selecaoTipo={selecaoTipo}
        reguaAtiva={reguaAtiva}
        fundoQuadro={pagina.fundoQuadro ?? 'pontilhado'}
        onModo={setModo}
        onConfig={mudarConfig}
        onConfigBorracha={mudarBorracha}
        onSelecaoTipo={setSelecaoTipo}
        onRegua={setReguaAtiva}
        onFundoQuadro={(f) => onMudar({ fundoQuadro: f })}
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
            dão zoom e giram a folha. Com a régua ativa: um dedo move a régua,
            dois dedos giram. Ctrl/Cmd+Z desfaz, Ctrl+Shift+Z refaz. Com a
            caneta ou o lápis, rabiscar por cima de um traço o apaga (rasura).
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
              aplicar([], [], [], [], [])
              setConfirmandoLimpar(false)
              setMenuAberto(false)
            }}
            disabled={
              tracos.length === 0 &&
              itens.length === 0 &&
              postIts.length === 0 &&
              textos.length === 0 &&
              comentarios.length === 0
            }
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
