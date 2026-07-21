import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { IconMais } from '../../../core/components/Icons'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { CartaoSecao, Vazio, type ControleSecao } from './CartaoSecao'
import { EditorDespensa } from './EditorDespensa'
import { ajusteRapido, atualizarDespensa, catInfo, diasRestantes, statusValidade } from '../db'
import { useDespensa, useHistoricosTodos } from '../hooks'
import type { ItemDespensa, NivelAprox } from '../types'

const NIVEL_FRACAO: Record<NivelAprox, number> = { cheio: 1, tres_quartos: 0.75, metade: 0.5, pouco: 0.25, quase_vazio: 0.1 }

function fracaoVisual(item: ItemDespensa): number | null {
  if (item.possuiApenas) return null
  if (item.nivelAprox && !(item.quantidadeFechados && item.quantidadeFechados > 0)) return NIVEL_FRACAO[item.nivelAprox]
  if ((item.quantidadeFechados ?? 0) > 0) return 1
  if (item.emUso) return item.fracaoEmUso ?? 0.5
  return 0
}
function corFrac(f: number | null): string {
  if (f == null) return 'var(--vida-line)'
  if (f < 0.25) return 'var(--vida-danger)'
  if (f < 0.5) return '#eb8909'
  return 'var(--vida-accent)'
}

const FILTROS = [
  { id: 'todos', nome: 'Todos' },
  { id: 'acabando', nome: 'Acabando' },
  { id: 'vencendo', nome: 'Vencendo' },
  { id: 'favoritos', nome: 'Favoritos' },
]

export function SecaoDespensa({ controle }: { controle: ControleSecao }) {
  const despensa = useDespensa()
  const historicos = useHistoricosTodos()
  const [filtro, setFiltro] = useState('todos')
  const [add, setAdd] = useState(false)
  const [acoes, setAcoes] = useState<ItemDespensa | null>(null)
  const [editar, setEditar] = useState<ItemDespensa | null>(null)

  function passaFiltro(i: ItemDespensa): boolean {
    if (filtro === 'favoritos') return !!i.favorito
    if (filtro === 'vencendo') return ['vencido', 'hoje', 'semana'].includes(statusValidade(i))
    if (filtro === 'acabando') {
      const d = diasRestantes(i, (historicos ?? {})[i.id] ?? [])
      return (d != null && d <= 7) || i.nivelAprox === 'pouco' || i.nivelAprox === 'quase_vazio'
    }
    return true
  }
  const itens = (despensa ?? []).filter(passaFiltro).sort((a, b) => a.nome.localeCompare(b.nome))

  return (
    <CartaoSecao
      titulo="Despensa inteligente"
      emoji="🗄️"
      acao={<button onClick={() => setAdd(true)} className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink" title="Novo item"><IconMais width={16} height={16} /></button>}
      {...controle}
    >
      <div className="mb-2 flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <button key={f.id} onClick={() => setFiltro(f.id)} className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${filtro === f.id ? 'bg-ink text-surface' : 'bg-hover text-muted hover:text-ink'}`}>{f.nome}</button>
        ))}
      </div>

      {despensa === undefined ? null : (despensa ?? []).length === 0 ? (
        <Vazio>Comece informando alguns produtos que você já possui. Não precisa ser preciso: o Lume melhora as estimativas com o tempo.</Vazio>
      ) : itens.length === 0 ? (
        <Vazio>Nenhum item neste filtro.</Vazio>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {itens.map((i) => {
            const cat = catInfo(i.categoria)
            const frac = fracaoVisual(i)
            const dias = diasRestantes(i, (historicos ?? {})[i.id] ?? [])
            const val = statusValidade(i)
            return (
              <li key={i.id} className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-hover text-[14px]">{cat.icone}</span>
                <Link to={`/compras/despensa/${i.id}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13.5px] font-medium">{i.nome}</span>
                    {i.favorito && <span className="text-[11px]">⭐</span>}
                    {i.petId && <span className="text-[11px]">🐾</span>}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-hover">
                      {frac != null && <div className="h-full rounded-full" style={{ width: `${Math.max(4, frac * 100)}%`, backgroundColor: corFrac(frac) }} />}
                    </div>
                    <span className="truncate text-[10.5px] text-muted">
                      {i.possuiApenas ? 'em casa' : dias != null ? `~${dias}d` : i.local ?? cat.nome}
                      {['vencido', 'hoje', 'semana'].includes(val) && <span className="ml-1 text-danger">{val === 'vencido' ? 'vencido' : val === 'hoje' ? 'vence hoje' : `vence ${format(parseISO(i.validade!), 'dd/MM')}`}</span>}
                    </span>
                  </div>
                </Link>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button onClick={() => ajusteRapido(i, 'remove')} className="flex size-6 items-center justify-center rounded-full text-muted hover:bg-hover" title="−1">−</button>
                  <span className="w-5 text-center text-[12px] tabular-nums">{i.quantidadeFechados ?? (i.emUso ? '½' : 0)}</span>
                  <button onClick={() => ajusteRapido(i, 'add')} className="flex size-6 items-center justify-center rounded-full text-muted hover:bg-hover" title="+1">+</button>
                  <button onClick={() => setAcoes(i)} className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-hover" title="Ações">⋯</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {add && <EditorDespensa onFechar={() => setAdd(false)} />}
      {editar && <EditorDespensa item={editar} onFechar={() => setEditar(null)} />}
      {acoes && (
        <FolhaInferior titulo={acoes.nome} onFechar={() => setAcoes(null)}>
          <div className="flex flex-col gap-2">
            <button onClick={() => { ajusteRapido(acoes, 'aberto'); setAcoes(null) }} className="rounded-xl border border-line px-3 py-2.5 text-left text-[14px] hover:bg-hover">Comecei a usar hoje (abrir)</button>
            <button onClick={() => { ajusteRapido(acoes, 'acabou'); setAcoes(null) }} className="rounded-xl border border-line px-3 py-2.5 text-left text-[14px] hover:bg-hover">Marcar como acabou</button>
            <button onClick={() => { ajusteRapido(acoes, 'descarte'); setAcoes(null) }} className="rounded-xl border border-line px-3 py-2.5 text-left text-[14px] hover:bg-hover">Registrar perda / descarte</button>
            <button onClick={() => { atualizarDespensa(acoes.id, { favorito: !acoes.favorito }); setAcoes(null) }} className="rounded-xl border border-line px-3 py-2.5 text-left text-[14px] hover:bg-hover">{acoes.favorito ? 'Remover dos favoritos' : 'Marcar como favorito'}</button>
            <button onClick={() => { const it = acoes; setAcoes(null); setEditar(it) }} className="rounded-xl border border-line px-3 py-2.5 text-left text-[14px] hover:bg-hover">Editar item</button>
            <Link to={`/compras/despensa/${acoes.id}`} onClick={() => setAcoes(null)} className="rounded-xl bg-hover px-3 py-2.5 text-center text-[14px] font-medium">Ver detalhes e histórico</Link>
          </div>
        </FolhaInferior>
      )}
    </CartaoSecao>
  )
}
