import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IconLupa, IconMais } from '../../core/components/Icons'
import { FolhaInferior } from '../../core/components/FolhaInferior'
import { ConfirmarProduto } from './components/ConfirmarProduto'
import { EditorAquisicao } from './components/EditorAquisicao'
import { EditorDespensa } from './components/EditorDespensa'
import { ImportarNotaFiscal } from './components/ImportarNotaFiscal'
import { LeitorCodigoBarras } from './components/LeitorCodigoBarras'
import { SecaoAquisicoes } from './components/SecaoAquisicoes'
import { SecaoDespensa } from './components/SecaoDespensa'
import { SecaoListas } from './components/SecaoListas'
import { SecaoSugestoes } from './components/SecaoSugestoes'
import type { ControleSecao } from './components/CartaoSecao'
import { catInfo, criarItemCompra, SECOES, secoesEfetivas, salvarSecoes, semearComprasSePreciso } from './db'
import { useAquisicoes, useComprasConfig, useDespensa, useItens, useListas } from './hooks'
import type { ModuloSecao } from './types'

function nomeSecao(id: string) {
  return SECOES.find((s) => s.id === id)?.nome ?? id
}
function emojiSecao(id: string) {
  return SECOES.find((s) => s.id === id)?.emoji ?? '📦'
}

export function ComprasPage() {
  const config = useComprasConfig()
  const listas = useListas()
  const despensa = useDespensa()
  const itens = useItens()
  const aquisicoes = useAquisicoes()
  const [personalizando, setPersonalizando] = useState(false)
  const [menu, setMenu] = useState(false)
  const [sheet, setSheet] = useState<null | 'estoque' | 'aquisicao' | 'compra' | 'importar'>(null)
  const [scanning, setScanning] = useState(false)
  const [eanConfirmar, setEanConfirmar] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [listaAlvo, setListaAlvo] = useState('')
  const [nomeItem, setNomeItem] = useState('')

  useEffect(() => {
    semearComprasSePreciso()
  }, [])

  const secoes = useMemo(() => secoesEfetivas(config), [config])
  const visiveis = secoes.filter((s) => s.visivel)
  const ocultas = secoes.filter((s) => !s.visivel)

  function persistir(novo: ModuloSecao[]) {
    salvarSecoes(novo.map((m, i) => ({ ...m, ordem: i })))
  }
  function mover(secaoId: string, dir: -1 | 1) {
    const vis = secoes.filter((s) => s.visivel)
    const i = vis.findIndex((s) => s.id === secaoId)
    const j = i + dir
    if (i < 0 || j < 0 || j >= vis.length) return
    ;[vis[i], vis[j]] = [vis[j], vis[i]]
    persistir([...vis, ...secoes.filter((s) => !s.visivel)])
  }
  const setVisivel = (secaoId: string, visivel: boolean) => persistir(secoes.map((s) => (s.id === secaoId ? { ...s, visivel } : s)))
  const alternarRecolhido = (secaoId: string) => persistir(secoes.map((s) => (s.id === secaoId ? { ...s, recolhido: !s.recolhido } : s)))

  const REGISTRO: Record<string, (c: ControleSecao) => ReactNode> = {
    sugestoes: (c) => <SecaoSugestoes controle={c} />,
    listas: (c) => <SecaoListas controle={c} />,
    despensa: (c) => <SecaoDespensa controle={c} />,
    aquisicoes: (c) => <SecaoAquisicoes controle={c} />,
  }

  // Busca simples entre despensa, itens de lista e aquisições
  const termo = busca.trim().toLowerCase()
  const resultados = termo
    ? [
        ...(despensa ?? []).filter((d) => d.nome.toLowerCase().includes(termo)).map((d) => ({ tipo: 'Despensa', nome: d.nome, sub: catInfo(d.categoria).nome, to: `/compras/despensa/${d.id}` })),
        ...(aquisicoes ?? []).filter((a) => a.nome.toLowerCase().includes(termo)).map((a) => ({ tipo: 'Aquisição', nome: a.nome, sub: a.status, to: `/compras/aquisicao/${a.id}` })),
        ...(itens ?? []).filter((i) => i.status !== 'comprado' && i.nome.toLowerCase().includes(termo)).map((i) => ({ tipo: 'Lista', nome: i.nome, sub: listas?.find((l) => l.id === i.listaId)?.nome ?? '', to: '/compras' })),
      ]
    : []

  async function addItemCompra() {
    if (!nomeItem.trim() || !listaAlvo) return
    await criarItemCompra({ listaId: listaAlvo, nome: nomeItem.trim(), origem: 'manual' })
    setNomeItem(''); setSheet(null)
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-[22px] font-bold">Compras</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setPersonalizando((v) => !v)} className={`min-h-9 rounded-full px-3 text-[13px] font-medium ${personalizando ? 'bg-ink text-surface' : 'border border-line text-muted hover:text-ink'}`}>
            {personalizando ? 'Concluir' : 'Personalizar'}
          </button>
          <div className="relative">
            <button onClick={() => setMenu((v) => !v)} className="flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[14px] font-medium text-surface">
              <IconMais width={16} height={16} /> Adicionar
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
                <div className="absolute right-0 z-50 mt-1 w-60 overflow-hidden rounded-2xl border border-line bg-surface shadow-lg">
                  {[
                    { r: 'Escanear código de barras', a: () => setScanning(true) },
                    { r: 'Novo item de compra', a: () => setSheet('compra') },
                    { r: 'Novo item de estoque', a: () => setSheet('estoque') },
                    { r: 'Nova aquisição planejada', a: () => setSheet('aquisicao') },
                    { r: 'Importar nota fiscal', a: () => setSheet('importar') },
                    { r: 'Fotografar produtos', a: () => setSheet('importar') },
                  ].map((o) => (
                    <button key={o.r} onClick={() => { setMenu(false); o.a() }} className="block w-full px-4 py-2.5 text-left text-[13.5px] hover:bg-hover">{o.r}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <IconLupa width={16} height={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produtos, despensa, aquisições…" className="w-full rounded-full border border-line bg-surface py-2 pl-9 pr-3 text-[14px] outline-none focus:border-muted/50" />
      </div>

      {termo ? (
        <div className="rounded-2xl border border-line bg-surface/50 p-2">
          {resultados.length === 0 ? (
            <p className="p-3 text-[13px] text-muted">Nada encontrado para “{busca}”.</p>
          ) : (
            <ul className="flex flex-col">
              {resultados.map((r, i) => (
                <Link key={i} to={r.to} onClick={() => setBusca('')} className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-hover">
                  <span className="rounded-full bg-hover px-1.5 py-0.5 text-[10px] text-muted">{r.tipo}</span>
                  <span className="flex-1 text-[14px] font-medium">{r.nome}</span>
                  <span className="text-[11px] text-muted">{r.sub}</span>
                </Link>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          {personalizando && ocultas.length > 0 && (
            <div className="rounded-2xl border border-dashed border-line p-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Seções ocultas</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ocultas.map((s) => (
                  <button key={s.id} onClick={() => setVisivel(s.id, true)} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[12.5px] font-medium text-muted hover:text-ink">
                    <span aria-hidden>{emojiSecao(s.id)}</span> {nomeSecao(s.id)} +
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="gap-4 [column-fill:balance] lg:columns-2 [&>*]:mb-4">
            {visiveis.map((s) => {
              const render = REGISTRO[s.id]
              if (!render) return null
              const controle: ControleSecao = {
                recolhido: s.recolhido,
                onRecolher: () => alternarRecolhido(s.id),
                personalizando,
                onSubir: () => mover(s.id, -1),
                onDescer: () => mover(s.id, 1),
                onOcultar: () => setVisivel(s.id, false),
              }
              return <div key={s.id}>{render(controle)}</div>
            })}
          </div>
        </>
      )}

      {/* Código de barras */}
      {scanning && <LeitorCodigoBarras onDetectado={(e) => { setScanning(false); setEanConfirmar(e) }} onFechar={() => setScanning(false)} />}
      {eanConfirmar && <ConfirmarProduto ean={eanConfirmar} onFechar={() => setEanConfirmar(null)} />}

      {/* Sheets do menu Adicionar */}
      {sheet === 'estoque' && <EditorDespensa onFechar={() => setSheet(null)} />}
      {sheet === 'aquisicao' && <EditorAquisicao onFechar={() => setSheet(null)} />}
      {sheet === 'compra' && (
        <FolhaInferior titulo="Novo item de compra" onFechar={() => setSheet(null)}>
          <div className="flex flex-col gap-3">
            <div>
              <span className="text-[12px] font-medium text-muted">Lista</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(listas ?? []).map((l) => (
                  <button key={l.id} onClick={() => setListaAlvo(l.id)} className={`rounded-full border px-2.5 py-1 text-[12.5px] font-medium ${listaAlvo === l.id ? 'border-ink bg-ink text-surface' : 'border-line text-muted'}`}>{l.icone} {l.nome}</button>
                ))}
              </div>
            </div>
            <input autoFocus value={nomeItem} onChange={(e) => setNomeItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItemCompra()} placeholder="Nome do item" className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-muted/50" />
            <button onClick={addItemCompra} disabled={!nomeItem.trim() || !listaAlvo} className="min-h-11 rounded-xl bg-ink text-[14px] font-semibold text-surface disabled:opacity-40">Adicionar</button>
          </div>
        </FolhaInferior>
      )}
      {sheet === 'importar' && <ImportarNotaFiscal onFechar={() => setSheet(null)} />}
    </div>
  )
}
