import { useState } from 'react'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { hojeISO } from '../../../core/dates'
import { parsearValor } from '../../financas/db'
import { marcarComprado } from '../db'
import type { ItemCompra } from '../types'

const CAMPO = 'w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-muted/50'
const ROT = 'text-[12px] font-medium text-muted'
const CATS_FIN = ['Alimentação', 'Saúde', 'Lazer', 'Moradia', 'Pets', 'Outros']

export function MarcarComprado({ item, onFechar }: { item: ItemCompra; onFechar: () => void }) {
  const [qtd, setQtd] = useState(item.quantidade?.toString() ?? '1')
  const [valor, setValor] = useState('')
  const [loja, setLoja] = useState(item.loja ?? '')
  const [data, setData] = useState(hojeISO())
  const [estoque, setEstoque] = useState(true)
  const [financas, setFinancas] = useState(true)
  const [catFin, setCatFin] = useState(item.petId ? 'Pets' : 'Alimentação')

  async function confirmar() {
    const centavos = valor ? parsearValor(valor) ?? undefined : undefined
    await marcarComprado(item, {
      quantidade: qtd ? Number(qtd.replace(',', '.')) : undefined,
      valorCentavos: centavos,
      loja: loja.trim() || undefined,
      data,
      atualizarEstoque: estoque,
      registrarFinancas: financas,
      categoriaFin: catFin,
    })
    onFechar()
  }

  return (
    <FolhaInferior titulo={`Comprei: ${item.nome}`} onFechar={onFechar}>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="block"><span className={ROT}>Quantidade</span><input inputMode="decimal" className={`${CAMPO} mt-1`} value={qtd} onChange={(e) => setQtd(e.target.value)} /></label>
          <label className="block"><span className={ROT}>Valor pago</span><input inputMode="decimal" autoFocus className={`${CAMPO} mt-1`} value={valor} onChange={(e) => setValor(e.target.value)} placeholder="R$ 0,00" /></label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block"><span className={ROT}>Loja</span><input className={`${CAMPO} mt-1`} value={loja} onChange={(e) => setLoja(e.target.value)} placeholder="Opcional" /></label>
          <label className="block"><span className={ROT}>Data</span><input type="date" className={`${CAMPO} mt-1`} value={data} onChange={(e) => setData(e.target.value)} /></label>
        </div>

        <label className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5">
          <span className="text-[13.5px] font-medium">Atualizar a despensa</span>
          <input type="checkbox" checked={estoque} onChange={(e) => setEstoque(e.target.checked)} className="size-4 accent-[var(--vida-accent)]" />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5">
          <span className="text-[13.5px] font-medium">Registrar despesa em Finanças</span>
          <input type="checkbox" checked={financas} onChange={(e) => setFinancas(e.target.checked)} className="size-4 accent-[var(--vida-accent)]" />
        </label>
        {financas && (
          <div>
            <span className={ROT}>Categoria financeira</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {CATS_FIN.map((c) => (
                <button key={c} onClick={() => setCatFin(c)} className={`rounded-full border px-2.5 py-1 text-[12.5px] font-medium ${catFin === c ? 'border-ink bg-ink text-surface' : 'border-line text-muted'}`}>{c}</button>
              ))}
            </div>
          </div>
        )}

        <button onClick={confirmar} className="mt-1 min-h-11 rounded-xl bg-ink text-[14px] font-semibold text-surface">Concluir compra</button>
      </div>
    </FolhaInferior>
  )
}
