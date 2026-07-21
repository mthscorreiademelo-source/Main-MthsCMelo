import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { db } from '../../../core/db/db'
import { IconMais } from '../../../core/components/Icons'
import { hojeISO } from '../../../core/dates'
import { criarEvento } from '../../agenda/db'
import { marcarAtividade } from '../db'

/** Bloco Agenda — integrado: eventos marcados com este projeto (também na Agenda). */
export function BlocoAgenda({ projetoId }: { projetoId: string }) {
  const eventos = useLiveQuery(async () => db.eventos.where('projetoId').equals(projetoId).toArray(), [projetoId])
  const [titulo, setTitulo] = useState('')
  const [data, setData] = useState(hojeISO())

  const hoje = hojeISO()
  const proximos = [...(eventos ?? [])]
    .filter((e) => e.data >= hoje)
    .sort((a, b) => (a.data === b.data ? a.inicio.localeCompare(b.inicio) : a.data < b.data ? -1 : 1))

  async function adicionar() {
    if (!titulo.trim()) return
    const id = await criarEvento({ titulo: titulo.trim(), data, inicio: '09:00', fim: '10:00' })
    if (id) await db.eventos.update(id, { projetoId })
    await marcarAtividade(projetoId)
    setTitulo('')
  }

  return (
    <div className="flex flex-col gap-2">
      {proximos.length === 0 ? (
        <p className="text-[13px] text-muted">Eventos e marcos do projeto. Também aparecem na Agenda.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {proximos.slice(0, 5).map((e) => (
            <li key={e.id} className="flex items-center gap-2 py-1.5 text-[13px]">
              <span className="w-16 shrink-0 text-[11px] font-medium text-muted">{format(parseISO(e.data), "d MMM", { locale: ptBR })}</span>
              <span className="min-w-0 flex-1 truncate">{e.titulo}</span>
              <span className="shrink-0 text-[11px] tabular-nums text-muted">{e.inicio}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-1 flex items-center gap-1.5">
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && adicionar()} placeholder="Novo evento…" className="min-h-9 min-w-0 flex-1 rounded-lg border border-line bg-transparent px-2.5 text-[13.5px] outline-none focus:border-muted/50" />
        <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="min-h-9 rounded-lg border border-line bg-transparent px-2 text-[12px] text-muted outline-none focus:border-muted/50" />
        <button onClick={adicionar} className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink text-bg" aria-label="Adicionar"><IconMais width={15} height={15} /></button>
      </div>
    </div>
  )
}
