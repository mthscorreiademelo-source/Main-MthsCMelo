import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EmptyState } from '../../core/components/EmptyState'
import { IconLivro, IconMais } from '../../core/components/Icons'
import { AdicionarLivro } from './components/AdicionarLivro'
import { CapaImg } from './components/CapaImg'
import { CartaoLivro } from './components/CartaoLivro'
import { Estante } from './components/Estante'
import { statusDerivadoSerie } from './db'
import { useDestaques, useLivros, useNotas } from './hooks'
import { PainelFlashcards } from './flashcards/PainelFlashcards'
import type { Livro } from './types'

type Aba = 'geral' | 'estante' | 'leituras' | 'notas' | 'flashcards' | 'autores' | 'colecoes'
const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'geral', rotulo: 'Visão geral' },
  { id: 'estante', rotulo: 'Estante' },
  { id: 'leituras', rotulo: 'Leituras' },
  { id: 'notas', rotulo: 'Notas' },
  { id: 'flashcards', rotulo: 'Flashcards' },
  { id: 'autores', rotulo: 'Autores' },
  { id: 'colecoes', rotulo: 'Coleções' },
]

const CARTAO = 'rounded-2xl border border-line bg-surface/50 p-4'
const ROTULO = 'text-[13px] font-semibold'

function tempoRestante(l: Livro): string | null {
  if (!l.paginasTotais) return null
  const restantes = Math.max(0, l.paginasTotais * (1 - (l.progresso ?? 0) / 100))
  const min = Math.round(restantes * 1.9)
  const h = Math.floor(min / 60)
  const m = min % 60
  return h ? `~${h}h ${m}min de leitura restantes` : `~${m}min de leitura restantes`
}

export function BibliotecaPage() {
  const livros = useLivros()
  const notas = useNotas() ?? []
  const destaques = useDestaques() ?? []
  const [aba, setAba] = useState<Aba>('geral')
  const [generoEstante, setGeneroEstante] = useState<string | null>(null)
  const [adicionando, setAdicionando] = useState(false)

  const ls = useMemo(() => (livros ?? []).filter((l) => !l.compiladoId), [livros])
  const tituloDe = (id: string) => (livros ?? []).find((l) => l.id === id)?.titulo ?? '—'

  const lendo = useMemo(
    () => ls.filter((l) => (l.ehCompilado ? false : l.status === 'lendo')).sort((a, b) => (b.atualizadoEm ?? b.adicionadoEm) - (a.atualizadoEm ?? a.adicionadoEm)),
    [ls],
  )
  const leituraAtual = lendo[0]
  const jornada = useMemo(() => {
    const querLer = ls.filter((l) => (l.ehCompilado ? statusDerivadoSerie([]) : l.status) === 'quero_ler')
    return [...lendo, ...querLer].slice(0, 5)
  }, [ls, lendo])

  const generos = useMemo(() => {
    const conta = new Map<string, number>()
    for (const l of ls) for (const g of l.generos ?? []) conta.set(g, (conta.get(g) ?? 0) + 1)
    return [...conta.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [ls])

  const notasRecentes = [...notas].sort((a, b) => b.criadoEm - a.criadoEm).slice(0, 4)
  const destaquesRecentes = [...destaques].sort((a, b) => b.criadoEm - a.criadoEm).slice(0, 3)

  const porAutor = useMemo(() => {
    const m = new Map<string, Livro[]>()
    for (const l of ls) { const a = l.autor?.trim() || 'Sem autor'; const arr = m.get(a) ?? []; arr.push(l); m.set(a, arr) }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [ls])

  const linkLivro = (l: Livro) => (l.temArquivo ? `/biblioteca/${l.id}/ler` : `/biblioteca/${l.id}`)

  function irColecao(g: string) { setGeneroEstante(g); setAba('estante') }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-[22px] font-bold">Biblioteca</h1>
        <button onClick={() => setAdicionando(true)} className="flex min-h-9 items-center gap-1.5 rounded-full bg-accent px-3.5 text-[14px] font-medium text-white">
          <IconMais width={16} height={16} /> Novo
        </button>
      </div>

      <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-line px-1">
        {ABAS.map((a) => (
          <button key={a.id} onClick={() => setAba(a.id)} className={`shrink-0 border-b-2 px-3 py-2 text-[14px] font-medium transition-colors ${aba === a.id ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'}`}>{a.rotulo}</button>
        ))}
      </div>

      {aba === 'flashcards' && <PainelFlashcards />}
      {aba === 'estante' && <Estante generoInicial={generoEstante} />}

      {aba === 'geral' && (
        <div className="flex flex-col gap-4">
          {/* Leitura atual */}
          {leituraAtual ? (
            <div className={CARTAO}>
              <span className={ROTULO}>Leitura atual</span>
              <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-[auto_1fr_1fr]">
                <Link to={linkLivro(leituraAtual)} className="mx-auto block w-32 shrink-0 sm:mx-0">
                  <Capa livro={leituraAtual} />
                </Link>
                <div className="flex flex-col">
                  <h2 className="text-[19px] font-bold leading-tight">{leituraAtual.titulo}</h2>
                  <p className="text-[13px] text-muted">{leituraAtual.autor}</p>
                  <div className="mt-3 text-[12px] font-semibold text-accent">{Math.round(leituraAtual.progresso ?? 0)}% concluído</div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-hover"><div className="h-full rounded-full bg-accent" style={{ width: `${leituraAtual.progresso ?? 0}%` }} /></div>
                  <div className="mt-3 flex flex-col gap-1 text-[12.5px] text-muted">
                    {tempoRestante(leituraAtual) && <span>🕐 {tempoRestante(leituraAtual)}</span>}
                    {leituraAtual.iniciadoEm && <span>📅 Começado em {format(leituraAtual.iniciadoEm, "d 'de' MMM 'de' yyyy", { locale: ptBR })}</span>}
                    {leituraAtual.paginasTotais && <span>🔖 Página {Math.round((leituraAtual.progresso ?? 0) / 100 * leituraAtual.paginasTotais)} de {leituraAtual.paginasTotais}</span>}
                  </div>
                </div>
                <div className="flex flex-col justify-between gap-3">
                  {(() => {
                    const nota = notas.filter((n) => n.livroId === leituraAtual.id).sort((a, b) => b.criadoEm - a.criadoEm)[0]
                    const dest = destaques.filter((d) => d.livroId === leituraAtual.id).sort((a, b) => b.criadoEm - a.criadoEm)[0]
                    const cit = nota?.trecho || dest?.trecho || nota?.resumo
                    return cit ? (
                      <div>
                        <span className="text-[26px] leading-none text-muted/40">"</span>
                        <p className="text-[14px] italic leading-snug">{cit}</p>
                        {(nota?.capitulo || dest?.capitulo) && <span className="mt-1 inline-block rounded bg-hover px-2 py-0.5 text-[11px] text-muted">{nota?.capitulo || dest?.capitulo}</span>}
                      </div>
                    ) : <div className="text-[13px] text-muted">Selecione um trecho na leitura para destacar ou anotar.</div>
                  })()}
                  <Link to={linkLivro(leituraAtual)} className="flex min-h-11 items-center justify-center rounded-xl bg-accent/12 text-[14px] font-semibold text-accent hover:bg-accent/20">Continuar lendo</Link>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState icone={<IconLivro />} titulo="Nada em leitura" descricao="Comece um livro da sua estante para vê-lo aqui." />
          )}

          {/* Continue sua jornada */}
          {jornada.length > 0 && (
            <div className={CARTAO}>
              <div className="mb-3 flex items-center justify-between"><span className={ROTULO}>Continue sua jornada</span><button onClick={() => setAba('leituras')} className="text-[12px] text-muted hover:text-ink">Ver todos</button></div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {jornada.map((l) => (
                  <Link key={l.id} to={linkLivro(l)} className="flex flex-col gap-1.5">
                    <Capa livro={l} />
                    <div className="h-1 overflow-hidden rounded-full bg-hover"><div className="h-full rounded-full bg-accent" style={{ width: `${l.progresso ?? 0}%` }} /></div>
                    <span className="text-[11px] text-muted">{Math.round(l.progresso ?? 0)}%</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Notas recentes */}
          {notasRecentes.length > 0 && (
            <div className={CARTAO}>
              <div className="mb-3 flex items-center justify-between"><span className={ROTULO}>Notas recentes</span><button onClick={() => setAba('notas')} className="text-[12px] text-muted hover:text-ink">Ver todas</button></div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {notasRecentes.map((n) => (
                  <Link key={n.id} to={`/biblioteca/${n.livroId}`} className="flex flex-col rounded-xl border border-line p-3 hover:border-muted/40">
                    <div className="flex items-center justify-between"><span className="truncate text-[12px] font-semibold text-accent">{tituloDe(n.livroId)}</span>{n.capitulo && <span className="shrink-0 text-[11px] text-muted">{n.capitulo}</span>}</div>
                    <p className="mt-1.5 line-clamp-3 text-[13px] leading-snug">{n.resumo || (n.trecho ? `"${n.trecho}"` : '')}</p>
                    <span className="mt-2 text-[11px] text-muted">{format(n.criadoEm, "d MMM 'às' HH:mm", { locale: ptBR })}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Destaques recentes */}
          {destaquesRecentes.length > 0 && (
            <div className={CARTAO}>
              <div className="mb-3 flex items-center justify-between"><span className={ROTULO}>Destaques recentes</span><button onClick={() => setAba('notas')} className="text-[12px] text-muted hover:text-ink">Ver todos</button></div>
              <div className="flex flex-col divide-y divide-line/60">
                {destaquesRecentes.map((d) => (
                  <Link key={d.id} to={`/biblioteca/${d.livroId}`} className="flex items-center gap-3 py-2.5">
                    <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: d.cor }} />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[13.5px] italic">"{d.trecho}"</p>
                      <span className="text-[11px] text-muted">{tituloDe(d.livroId)}{d.capitulo ? ` · ${d.capitulo}` : ''}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Coleções (gêneros) */}
          {generos.length > 0 && (
            <div className={CARTAO}>
              <div className="mb-3 flex items-center justify-between"><span className={ROTULO}>Coleções</span><button onClick={() => setAba('colecoes')} className="text-[12px] text-muted hover:text-ink">Ver todas</button></div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {generos.slice(0, 5).map(([g, n]) => (
                  <button key={g} onClick={() => irColecao(g)} className="flex flex-col items-center gap-2 rounded-xl border border-line p-4 text-center hover:border-muted/40">
                    <span className="flex size-11 items-center justify-center rounded-full bg-accent/10 text-[19px]">📚</span>
                    <span className="text-[13px] font-semibold leading-tight">{g}</span>
                    <span className="text-[11px] text-muted">{n} {n === 1 ? 'livro' : 'livros'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {aba === 'leituras' && (
        <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {lendo.length === 0 && <p className="col-span-full text-[13px] text-muted">Nenhuma leitura em andamento.</p>}
          {lendo.map((l) => <CartaoLivro key={l.id} livro={l} volumes={0} status="lendo" />)}
        </div>
      )}

      {aba === 'notas' && (
        <div className="flex flex-col gap-3">
          {notas.length === 0 && destaques.length === 0 && <p className="text-[13px] text-muted">Suas notas e destaques de leitura aparecerão aqui.</p>}
          {[...notas].sort((a, b) => b.criadoEm - a.criadoEm).map((n) => (
            <Link key={n.id} to={`/biblioteca/${n.livroId}`} className="rounded-xl border border-line p-3 hover:border-muted/40">
              <div className="flex items-center justify-between"><span className="text-[12px] font-semibold text-accent">{tituloDe(n.livroId)}</span><span className="text-[11px] text-muted">{format(n.criadoEm, 'dd/MM/yyyy')}</span></div>
              {n.trecho && <p className="mt-1 border-l-2 border-accent pl-2 text-[12.5px] italic text-muted">"{n.trecho}"</p>}
              <p className="mt-1 text-[14px]">{n.resumo}</p>
            </Link>
          ))}
        </div>
      )}

      {aba === 'autores' && (
        <div className="flex flex-col gap-4">
          {porAutor.map(([autor, ls2]) => (
            <section key={autor} className="flex flex-col gap-2">
              <h2 className="text-[13px] font-semibold text-muted">{autor} <span className="font-normal opacity-60">· {ls2.length}</span></h2>
              <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {ls2.map((l) => <CartaoLivro key={l.id} livro={l} volumes={0} status={l.status} />)}
              </div>
            </section>
          ))}
        </div>
      )}

      {aba === 'colecoes' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {generos.length === 0 && <p className="col-span-full text-[13px] text-muted">Adicione gêneros aos seus livros para formar coleções.</p>}
          {generos.map(([g, n]) => (
            <button key={g} onClick={() => irColecao(g)} className="flex flex-col items-center gap-2 rounded-2xl border border-line p-5 text-center hover:border-muted/40">
              <span className="flex size-12 items-center justify-center rounded-full bg-accent/10 text-[21px]">📚</span>
              <span className="text-[14px] font-semibold">{g}</span>
              <span className="text-[12px] text-muted">{n} {n === 1 ? 'livro' : 'livros'}</span>
            </button>
          ))}
        </div>
      )}

      {adicionando && <AdicionarLivro onFechar={() => setAdicionando(false)} />}
    </div>
  )
}

/** Capa do livro (imagem ou fallback com título). */
function Capa({ livro }: { livro: Livro }) {
  const semCapa = (
    <div className="flex aspect-[2/3] w-full flex-col items-center justify-center rounded-lg bg-hover p-2 text-center shadow-sm">
      <span className="line-clamp-4 text-[11px] font-semibold">{livro.titulo}</span>
    </div>
  )
  if (livro.capa)
    return (
      <CapaImg
        src={livro.capa}
        className="aspect-[2/3] w-full rounded-lg object-cover shadow-sm"
        fallback={semCapa}
      />
    )
  return semCapa
}
