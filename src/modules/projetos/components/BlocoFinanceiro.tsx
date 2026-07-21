import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../../../core/db/db'
import { IconMais } from '../../../core/components/Icons'
import { hojeISO } from '../../../core/dates'
import { criarMovimento, formatarBRL, parsearValor } from '../../financas/db'
import { marcarAtividade } from '../db'
import type { TipoMovimento } from '../../financas/types'

/** Bloco Financeiro — integrado: movimentos marcados com este projeto (também em Finanças). */
export function BlocoFinanceiro({ projetoId }: { projetoId: string }) {
  const movs = useLiveQuery(async () => db.movimentos.where('projetoId').equals(projetoId).toArray(), [projetoId])
  const [tipo, setTipo] = useState<TipoMovimento>('saida')
  const [desc, setDesc] = useState('')
  const [valor, setValor] = useState('')

  const lista = [...(movs ?? [])].sort((a, b) => b.criadoEm - a.criadoEm)
  const entradas = lista.filter((m) => m.tipo === 'entrada').reduce((s, m) => s + m.valorCentavos, 0)
  const saidas = lista.filter((m) => m.tipo === 'saida').reduce((s, m) => s + m.valorCentavos, 0)

  async function adicionar() {
    const c = parsearValor(valor)
    if (!desc.trim() || c === null || c <= 0) return
    const id = await criarMovimento({ tipo, valorCentavos: c, descricao: desc, data: hojeISO() })
    if (id) await db.movimentos.update(id, { projetoId })
    await marcarAtividade(projetoId)
    setDesc(''); setValor('')
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-hover/60 px-2 py-1.5"><div className="text-[13px] font-bold text-accent">{formatarBRL(entradas)}</div><div className="text-[10px] text-muted">Entrou</div></div>
        <div className="rounded-xl bg-hover/60 px-2 py-1.5"><div className="text-[13px] font-bold text-danger">{formatarBRL(saidas)}</div><div className="text-[10px] text-muted">Saiu</div></div>
        <div className="rounded-xl bg-hover/60 px-2 py-1.5"><div className={`text-[13px] font-bold ${entradas - saidas < 0 ? 'text-danger' : ''}`}>{formatarBRL(entradas - saidas)}</div><div className="text-[10px] text-muted">Saldo</div></div>
      </div>
      {lista.length > 0 && (
        <ul className="flex flex-col divide-y divide-line">
          {lista.slice(0, 5).map((m) => (
            <li key={m.id} className="flex items-center gap-2 py-1.5 text-[13px]">
              <span className="min-w-0 flex-1 truncate">{m.descricao}</span>
              <span className={`shrink-0 font-semibold ${m.tipo === 'entrada' ? 'text-accent' : 'text-danger'}`}>{m.tipo === 'entrada' ? '+' : '−'} {formatarBRL(m.valorCentavos)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-1.5">
        <button onClick={() => setTipo(tipo === 'saida' ? 'entrada' : 'saida')} className={`min-h-9 shrink-0 rounded-lg px-2 text-[13px] font-medium ${tipo === 'saida' ? 'bg-danger/10 text-danger' : 'bg-accent/10 text-accent'}`}>{tipo === 'saida' ? '− Saída' : '+ Entrada'}</button>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descrição" className="min-h-9 min-w-0 flex-1 rounded-lg border border-line bg-transparent px-2 text-[13px] outline-none focus:border-muted/50" />
        <input value={valor} onChange={(e) => setValor(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && adicionar()} inputMode="decimal" placeholder="0,00" className="min-h-9 w-16 rounded-lg border border-line bg-transparent px-2 text-right text-[13px] outline-none focus:border-muted/50" />
        <button onClick={adicionar} className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink text-bg" aria-label="Adicionar"><IconMais width={15} height={15} /></button>
      </div>
    </div>
  )
}
