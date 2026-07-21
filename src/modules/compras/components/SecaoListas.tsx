import { useEffect, useState } from 'react'
import { IconMais } from '../../../core/components/Icons'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { formatarBRL } from '../../financas/db'
import { CartaoSecao, Vazio, type ControleSecao } from './CartaoSecao'
import { MarcarComprado } from './MarcarComprado'
import { ModoMercado } from './ModoMercado'
import { adiarItem, atualizarItem, catInfo, criarItemCompra, criarLista, excluirItem, excluirLista, moverItem, transformarEmAquisicao } from '../db'
import { useItensDaLista, useListas } from '../hooks'
import type { ItemCompra } from '../types'

const CAMPO = 'w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-muted/50'

const ORIGEM_LABEL: Record<string, string> = { ia: 'sugestão', despensa: 'despensa', pets: 'pet', saude: 'saúde', projeto: 'projeto', agenda: 'agenda', notafiscal: 'nota fiscal' }

export function SecaoListas({ controle }: { controle: ControleSecao }) {
  const listas = useListas()
  const [ativa, setAtiva] = useState<string | null>(null)
  const itens = useItensDaLista(ativa ?? undefined)
  const [novo, setNovo] = useState('')
  const [comprando, setComprando] = useState<ItemCompra | null>(null)
  const [acoes, setAcoes] = useState<ItemCompra | null>(null)
  const [novaLista, setNovaLista] = useState(false)
  const [nomeLista, setNomeLista] = useState('')
  const [mercado, setMercado] = useState(false)

  useEffect(() => {
    if (!ativa && listas && listas.length > 0) setAtiva(listas[0].id)
  }, [listas, ativa])

  const pendentes = (itens ?? []).filter((i) => i.status !== 'comprado').sort((a, b) => a.ordem - b.ordem)
  const totalEstimado = pendentes.reduce((s, i) => s + (i.precoEstimadoCentavos ?? 0), 0)
  const listaAtiva = listas?.find((l) => l.id === ativa)

  async function adicionar() {
    if (!novo.trim() || !ativa) return
    await criarItemCompra({ listaId: ativa, nome: novo.trim(), origem: 'manual' })
    setNovo('')
  }
  async function criar() {
    if (!nomeLista.trim()) return
    const id = await criarLista({ nome: nomeLista.trim() })
    setAtiva(id); setNomeLista(''); setNovaLista(false)
  }

  return (
    <CartaoSecao
      titulo="Lista de compras"
      emoji="🛒"
      acao={
        <button onClick={() => setMercado(true)} disabled={pendentes.length === 0} className="rounded-full border border-line px-2.5 py-1 text-[12px] font-medium text-muted hover:text-ink disabled:opacity-40" title="Modo mercado">
          🏪 Mercado
        </button>
      }
      {...controle}
    >
      {/* Seletor de listas */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {(listas ?? []).map((l) => {
          const n = 0
          return (
            <button key={l.id} onClick={() => setAtiva(l.id)} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-medium transition-colors ${ativa === l.id ? 'bg-ink text-surface' : 'bg-hover text-muted hover:text-ink'}`}>
              <span aria-hidden>{l.icone}</span> {l.nome}{n ? ` ${n}` : ''}
            </button>
          )
        })}
        <button onClick={() => setNovaLista(true)} className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[12.5px] font-medium text-muted hover:text-ink">
          <IconMais width={13} height={13} /> Lista
        </button>
        {listaAtiva && (
          <button
            onClick={() => { if (confirm(`Excluir a lista “${listaAtiva.nome}” e seus itens?`)) { excluirLista(listaAtiva.id); setAtiva(null) } }}
            className="rounded-full border border-line px-2.5 py-1 text-[12.5px] font-medium text-muted hover:text-danger"
            title="Excluir lista"
          >
            🗑 Excluir lista
          </button>
        )}
      </div>

      {/* Itens */}
      {pendentes.length === 0 ? (
        <Vazio>Sua lista está vazia. Adicione um item ou revise as sugestões do Lume acima.</Vazio>
      ) : (
        <ul className="divide-y divide-line">
          {pendentes.map((i) => {
            const cat = catInfo(i.categoria)
            return (
              <li key={i.id} className="flex items-center gap-2.5 py-2">
                <button onClick={() => setComprando(i)} className="flex size-6 shrink-0 items-center justify-center rounded-full border border-line text-transparent hover:border-accent hover:text-accent" title="Marcar como comprado">✓</button>
                <span className="text-[14px]" aria-hidden>{cat.icone}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`truncate text-[14px] ${i.prioridade === 'alta' ? 'font-semibold' : ''}`}>{i.nome}</span>
                    {i.quantidade ? <span className="text-[12px] text-muted">{i.quantidade}{i.unidade ? ` ${i.unidade}` : ''}</span> : null}
                    {i.origem !== 'manual' && ORIGEM_LABEL[i.origem] && <span className="rounded-full bg-hover px-1.5 py-0.5 text-[9.5px] text-muted">{ORIGEM_LABEL[i.origem]}</span>}
                    {i.status === 'adiado' && <span className="rounded-full bg-hover px-1.5 py-0.5 text-[9.5px] text-muted">adiado</span>}
                  </div>
                  {i.precoEstimadoCentavos ? <span className="text-[11px] text-muted">~ {formatarBRL(i.precoEstimadoCentavos)}</span> : null}
                </div>
                <button onClick={() => setAcoes(i)} className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink" title="Ações">⋯</button>
              </li>
            )
          })}
        </ul>
      )}

      {/* Adição rápida */}
      {ativa && (
        <div className="mt-2 flex items-center gap-2">
          <input value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && adicionar()} placeholder="Adicionar item…" className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-muted/50" />
          <button onClick={adicionar} disabled={!novo.trim()} className="flex size-9 items-center justify-center rounded-xl bg-ink text-surface disabled:opacity-40"><IconMais width={16} height={16} /></button>
        </div>
      )}
      {totalEstimado > 0 && <p className="mt-1.5 text-[11px] text-muted">Total estimado: {formatarBRL(totalEstimado)}</p>}

      {comprando && <MarcarComprado item={comprando} onFechar={() => setComprando(null)} />}
      {acoes && <AcoesItem item={acoes} listas={listas ?? []} onFechar={() => setAcoes(null)} />}
      {novaLista && (
        <FolhaInferior titulo="Nova lista" onFechar={() => setNovaLista(false)}>
          <div className="flex flex-col gap-3">
            <input autoFocus value={nomeLista} onChange={(e) => setNomeLista(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && criar()} placeholder="Ex.: Material de escritório" className={CAMPO} />
            <button onClick={criar} disabled={!nomeLista.trim()} className="min-h-11 rounded-xl bg-ink text-[14px] font-semibold text-surface disabled:opacity-40">Criar lista</button>
          </div>
        </FolhaInferior>
      )}
      {mercado && listaAtiva && <ModoMercado lista={listaAtiva} itens={pendentes} onFechar={() => setMercado(false)} />}
    </CartaoSecao>
  )
}

function AcoesItem({ item, listas, onFechar }: { item: ItemCompra; listas: { id: string; nome: string; icone: string }[]; onFechar: () => void }) {
  const [qtd, setQtd] = useState(item.quantidade?.toString() ?? '')
  const [movendo, setMovendo] = useState(false)
  return (
    <FolhaInferior titulo={item.nome} onFechar={onFechar}>
      {movendo ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-muted">Mover para…</span>
          {listas.filter((l) => l.id !== item.listaId).map((l) => (
            <button key={l.id} onClick={() => { moverItem(item.id, l.id); onFechar() }} className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-2.5 text-left text-[14px] font-medium hover:bg-hover">
              <span aria-hidden>{l.icone}</span> {l.nome}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)} placeholder="Quantidade" className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-muted/50" />
            <button onClick={() => { atualizarItem(item.id, { quantidade: qtd ? Number(qtd.replace(',', '.')) : undefined }); onFechar() }} className="rounded-xl bg-hover px-3 py-2 text-[13px] font-medium">Salvar qtd.</button>
          </div>
          <button onClick={() => setMovendo(true)} className="rounded-xl border border-line px-3 py-2.5 text-left text-[14px] hover:bg-hover">Mover para outra lista</button>
          <button onClick={() => { adiarItem(item.id); onFechar() }} className="rounded-xl border border-line px-3 py-2.5 text-left text-[14px] hover:bg-hover">Adiar</button>
          <button onClick={() => { transformarEmAquisicao(item); onFechar() }} className="rounded-xl border border-line px-3 py-2.5 text-left text-[14px] hover:bg-hover">Transformar em aquisição planejada</button>
          <button onClick={() => { excluirItem(item.id); onFechar() }} className="rounded-xl px-3 py-2.5 text-left text-[14px] font-medium text-danger hover:bg-danger/10">Remover</button>
        </div>
      )}
    </FolhaInferior>
  )
}
