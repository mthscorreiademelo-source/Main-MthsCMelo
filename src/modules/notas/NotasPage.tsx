import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState } from '../../core/components/EmptyState'
import { IconCaneta, IconDocumento, IconLupa, IconMais, IconPasta } from '../../core/components/Icons'
import { useTheme } from '../../core/theme/useTheme'
import { GrupoEditorSheet } from './components/GrupoEditorSheet'
import { ListaNotas } from './components/ListaNotas'
import { buscarNotas, ordenarNotas } from './acoes'
import { criarPagina, ordenarGrupos, textoResumo } from './db'
import { criarPaginaDeTemplate, TEMPLATES_NOTA } from './templates'
import { FolhaInferior } from '../../core/components/FolhaInferior'
import { useGrupos, usePaginas } from './hooks'
import { capaDoGrupo, type Pagina } from './types'

type Aba = 'inicio' | 'todas' | 'cadernos' | 'desenhos' | 'favoritos' | 'entrada' | 'arquivadas'
const ABAS: { id: Aba; nome: string }[] = [
  { id: 'inicio', nome: 'Início' },
  { id: 'todas', nome: 'Todas' },
  { id: 'cadernos', nome: 'Cadernos' },
  { id: 'desenhos', nome: 'Desenhos' },
  { id: 'favoritos', nome: 'Favoritos' },
  { id: 'entrada', nome: 'Caixa de entrada' },
  { id: 'arquivadas', nome: 'Arquivadas' },
]

export function NotasPage() {
  const paginas = usePaginas()
  const grupos = useGrupos()
  const navigate = useNavigate()
  const { tema } = useTheme()
  const [aba, setAba] = useState<Aba>('inicio')
  const [busca, setBusca] = useState('')
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState<'texto' | 'desenho' | 'arquivos' | undefined>(undefined)
  const [criandoGrupo, setCriandoGrupo] = useState(false)
  const [modelos, setModelos] = useState(false)

  const todas = useMemo(() => paginas ?? [], [paginas])
  const ativas = useMemo(() => ordenarNotas(buscarNotas(todas, {})), [todas])
  const favoritos = useMemo(() => ativas.filter((p) => p.favorito), [ativas])
  const desenhos = useMemo(() => ativas.filter((p) => p.tipo === 'desenho'), [ativas])
  const entrada = useMemo(() => ativas.filter((p) => !p.grupoId), [ativas])
  const arquivadas = useMemo(() => ordenarNotas(buscarNotas(todas, { arquivado: true })), [todas])
  const listaGrupos = useMemo(() => ordenarGrupos(grupos ?? []), [grupos])
  const contagem = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of ativas) if (p.grupoId) m.set(p.grupoId, (m.get(p.grupoId) ?? 0) + 1)
    return m
  }, [ativas])

  const resultadoBusca = useMemo(
    () => ordenarNotas(buscarNotas(todas, { texto: busca, tipo: filtroTipo })),
    [todas, busca, filtroTipo],
  )

  async function novaPagina(tipo: 'texto' | 'desenho' | 'arquivos' = 'texto') {
    const id = await criarPagina(undefined, tipo)
    navigate(`/notas/${id}`)
  }

  const vazioTotal = !!paginas && todas.length === 0 && listaGrupos.length === 0

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Notas e Cadernos</h1>
        <div className="flex items-center gap-1">
          <button onClick={() => { setAba('todas'); setBuscaAberta((v) => !v) }} aria-label="Buscar" className="flex size-10 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink"><IconLupa width={18} height={18} /></button>
          <button onClick={() => novaPagina('texto')} className="flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[14px] font-medium text-surface hover:opacity-90"><IconMais width={16} height={16} /> Nota</button>
        </div>
      </div>

      {/* Criação rápida */}
      <div className="flex gap-2">
        <BotaoCriar icone={<IconDocumento width={17} height={17} />} rotulo="Texto" onClick={() => novaPagina('texto')} />
        <BotaoCriar icone={<IconCaneta width={17} height={17} />} rotulo="Desenho" onClick={() => novaPagina('desenho')} />
        <BotaoCriar icone={<IconPasta width={17} height={17} />} rotulo="Arquivos" onClick={() => novaPagina('arquivos')} />
        <BotaoCriar icone={<span className="text-[15px] leading-none">📋</span>} rotulo="Modelo" onClick={() => setModelos(true)} />
        <BotaoCriar icone={<IconMais width={17} height={17} />} rotulo="Caderno" onClick={() => setCriandoGrupo(true)} />
      </div>

      {/* Navegação de seções */}
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5">
        {ABAS.map((a) => (
          <button key={a.id} onClick={() => setAba(a.id)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13.5px] font-medium transition-colors ${aba === a.id ? 'bg-ink text-surface' : 'text-muted hover:bg-hover'}`}>{a.nome}</button>
        ))}
      </div>

      {vazioTotal ? (
        <EmptyState icone={<IconDocumento />} titulo="Comece a capturar" descricao="Crie uma nota, faça um desenho ou capture uma ideia rapidamente. Cadernos são opcionais." />
      ) : aba === 'inicio' ? (
        <Inicio ativas={ativas} favoritos={favoritos} desenhos={desenhos} entrada={entrada} grupos={listaGrupos} contagem={contagem} tema={tema} onAba={setAba} />
      ) : aba === 'todas' ? (
        <div className="flex flex-col gap-3">
          {buscaAberta && <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar em títulos, conteúdo e tags…" className="min-h-11 rounded-xl border border-line bg-surface/60 px-3.5 text-[14px] outline-none focus:border-muted/50" />}
          <div className="flex flex-wrap gap-1.5 text-[12.5px]">
            {([['Todos', undefined], ['Texto', 'texto'], ['Desenho', 'desenho'], ['Arquivos', 'arquivos']] as const).map(([rot, t]) => (
              <button key={rot} onClick={() => setFiltroTipo(t)} className={`rounded-full px-2.5 py-1 font-medium transition-colors ${filtroTipo === t ? 'bg-hover text-ink' : 'text-muted hover:bg-hover/60'}`}>{rot}</button>
            ))}
          </div>
          {resultadoBusca.length === 0 ? <p className="py-8 text-center text-[13px] text-muted">Nenhuma nota corresponde aos filtros atuais.</p> : <ListaNotas paginas={resultadoBusca} />}
        </div>
      ) : aba === 'cadernos' ? (
        <GaleriaGrupos grupos={listaGrupos} contagem={contagem} tema={tema} onAbrir={(id) => navigate(`/notas/grupo/${id}`)} onNovo={() => setCriandoGrupo(true)} />
      ) : aba === 'desenhos' ? (
        <GradeDesenhos desenhos={desenhos} onAbrir={(id) => navigate(`/notas/${id}`)} onNovo={() => novaPagina('desenho')} />
      ) : aba === 'favoritos' ? (
        favoritos.length === 0 ? <EmptyState icone={<span className="text-2xl">⭐</span>} titulo="Sem favoritos" descricao="Marque notas como favoritas para encontrá-las rápido aqui." /> : <ListaNotas paginas={favoritos} />
      ) : aba === 'entrada' ? (
        <div className="flex flex-col gap-2">
          <p className="text-[12.5px] text-muted">Notas ainda sem caderno. Organize quando quiser — ou deixe soltas.</p>
          {entrada.length === 0 ? <EmptyState icone={<span className="text-2xl">📥</span>} titulo="Caixa de entrada vazia" descricao="Todas as suas notas já foram organizadas." /> : <ListaNotas paginas={entrada} />}
        </div>
      ) : (
        arquivadas.length === 0 ? <EmptyState icone={<span className="text-2xl">🗄️</span>} titulo="Nada arquivado" descricao="Notas arquivadas ficam guardadas aqui, fora das listas principais." /> : <ListaNotas paginas={arquivadas} />
      )}

      <GrupoEditorSheet aberto={criandoGrupo} grupo={null} onFechar={() => setCriandoGrupo(false)} />

      {modelos && (
        <FolhaInferior titulo="Começar com um modelo" onFechar={() => setModelos(false)}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TEMPLATES_NOTA.map((t) => (
              <button key={t.id} onClick={async () => { const id = await criarPaginaDeTemplate(t); setModelos(false); navigate(`/notas/${id}`) }} className="flex flex-col items-center gap-1.5 rounded-2xl border border-line p-3 text-center hover:bg-hover/50">
                <span className="text-2xl">{t.emoji}</span>
                <span className="text-[13px] font-medium">{t.nome}</span>
              </button>
            ))}
          </div>
        </FolhaInferior>
      )}
    </div>
  )
}

function BotaoCriar({ icone, rotulo, onClick }: { icone: React.ReactNode; rotulo: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface/60 px-1 text-[13px] font-medium text-muted transition-colors hover:border-muted/50 hover:text-ink">
      {icone} <span className="hidden xs:inline sm:inline">{rotulo}</span>
    </button>
  )
}

/* --------------------------------- Início -------------------------------- */

function Secao({ titulo, verTudo, onVer, children }: { titulo: string; verTudo?: string; onVer?: () => void; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[13px] font-semibold text-muted">{titulo}</h2>
        {verTudo && <button onClick={onVer} className="text-[12px] text-muted hover:text-ink">{verTudo}</button>}
      </div>
      {children}
    </section>
  )
}

function Inicio({ ativas, favoritos, desenhos, entrada, grupos, contagem, tema, onAba }: {
  ativas: Pagina[]
  favoritos: Pagina[]
  desenhos: Pagina[]
  entrada: Pagina[]
  grupos: ReturnType<typeof ordenarGrupos>
  contagem: Map<string, number>
  tema: 'light' | 'dark'
  onAba: (a: Aba) => void
}) {
  const navigate = useNavigate()
  const continuar = ativas.find((p) => (p.tipo ?? 'texto') === 'texto')
  const recentes = ativas.slice(0, 5)

  return (
    <div className="flex flex-col gap-5">
      {continuar && (
        <Secao titulo="Continuar escrevendo">
          <Link to={`/notas/${continuar.id}`} className="rounded-2xl border border-line bg-surface/50 p-4 hover:bg-hover/40">
            <span className="block truncate text-[15px] font-semibold">{continuar.titulo || 'Sem título'}</span>
            <span className="mt-0.5 line-clamp-2 text-[13px] text-muted">{textoResumo(continuar) || 'Nota vazia — toque para continuar.'}</span>
          </Link>
        </Secao>
      )}

      {recentes.length > 0 && (
        <Secao titulo="Recentes" verTudo="Ver todas" onVer={() => onAba('todas')}><ListaNotas paginas={recentes} /></Secao>
      )}

      {desenhos.length > 0 && (
        <Secao titulo="Desenhos" verTudo="Ver todos" onVer={() => onAba('desenhos')}>
          <div className="grid grid-cols-4 gap-2">
            {desenhos.slice(0, 4).map((p) => (
              <button key={p.id} onClick={() => navigate(`/notas/${p.id}`)} className="aspect-[3/4] overflow-hidden rounded-lg border border-line bg-bg">
                {p.miniatura ? <img src={p.miniatura} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-muted"><IconCaneta /></span>}
              </button>
            ))}
          </div>
        </Secao>
      )}

      {favoritos.length > 0 && (
        <Secao titulo="Favoritos" verTudo="Ver todos" onVer={() => onAba('favoritos')}><ListaNotas paginas={favoritos.slice(0, 4)} /></Secao>
      )}

      {grupos.length > 0 && (
        <Secao titulo="Cadernos" verTudo="Ver todos" onVer={() => onAba('cadernos')}>
          <GaleriaGrupos grupos={grupos.slice(0, 6)} contagem={contagem} tema={tema} onAbrir={(id) => navigate(`/notas/grupo/${id}`)} />
        </Secao>
      )}

      {entrada.length > 0 && (
        <Secao titulo="Não organizadas" verTudo={`Ver (${entrada.length})`} onVer={() => onAba('entrada')}><ListaNotas paginas={entrada.slice(0, 3)} /></Secao>
      )}
    </div>
  )
}

/* --------------------------- Galeria de cadernos -------------------------- */

function GaleriaGrupos({ grupos, contagem, tema, onAbrir, onNovo }: {
  grupos: ReturnType<typeof ordenarGrupos>
  contagem: Map<string, number>
  tema: 'light' | 'dark'
  onAbrir: (id: string) => void
  onNovo?: () => void
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {grupos.map((g) => {
        const qtd = contagem.get(g.id) ?? 0
        const capa = capaDoGrupo(g, tema)
        return (
          <button key={g.id} onClick={() => onAbrir(g.id)} className="group text-left">
            <span className="block overflow-hidden rounded-xl border border-line bg-bg transition-transform duration-150 group-hover:scale-[1.02]">
              {capa ? <img src={capa} alt="" className="aspect-[4/5] w-full object-cover" /> : <span className="flex aspect-[4/5] w-full items-center justify-center bg-surface text-4xl font-bold text-muted/50">{g.nome.charAt(0).toUpperCase()}</span>}
            </span>
            <span className="mt-1.5 block truncate px-0.5 text-[14px] font-medium">{g.nome}</span>
            <span className="block px-0.5 text-[12px] text-muted">{qtd} {qtd === 1 ? 'nota' : 'notas'}</span>
          </button>
        )
      })}
      {onNovo && (
        <button onClick={onNovo} className="text-left">
          <span className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line text-muted transition-colors hover:border-muted/60 hover:text-ink">
            <IconMais />
            <span className="text-[13px] font-medium">Novo caderno</span>
          </span>
        </button>
      )}
    </div>
  )
}

/* ----------------------------- Grade de desenhos -------------------------- */

function GradeDesenhos({ desenhos, onAbrir, onNovo }: { desenhos: Pagina[]; onAbrir: (id: string) => void; onNovo: () => void }) {
  if (desenhos.length === 0) return <EmptyState icone={<IconCaneta />} titulo="Nenhum desenho" descricao="Faça um desenho à mão livre no quadro infinito." />
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {desenhos.map((p) => (
        <button key={p.id} onClick={() => onAbrir(p.id)} className="group text-left">
          <span className="block aspect-[3/4] overflow-hidden rounded-xl border border-line bg-bg transition-transform group-hover:scale-[1.02]">
            {p.miniatura ? <img src={p.miniatura} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-muted"><IconCaneta /></span>}
          </span>
          <span className="mt-1 block truncate px-0.5 text-[13px] font-medium">{p.titulo || 'Sem título'}</span>
        </button>
      ))}
      <button onClick={onNovo} className="text-left">
        <span className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line text-muted hover:text-ink">
          <IconMais /><span className="text-[13px] font-medium">Novo</span>
        </span>
      </button>
    </div>
  )
}
