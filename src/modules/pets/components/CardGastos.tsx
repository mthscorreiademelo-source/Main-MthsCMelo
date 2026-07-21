import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { IconMais } from '../../../core/components/Icons'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { hojeISO } from '../../../core/dates'
import { criarMovimento, excluirMovimento, formatarBRL, parsearValor } from '../../financas/db'
import { CartaoModulo, ROTULO, Vazio, type ControleCartao } from './CartaoModulo'
import { useGastosPet } from '../hooks'
import type { Pet } from '../types'

const CAMPO = 'w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-muted/50'
const ROT = 'text-[12px] font-medium text-muted'

const CATEGORIAS = ['Veterinário', 'Ração', 'Petiscos', 'Brinquedos', 'Medicamentos', 'Banho e tosa', 'Plano de saúde', 'Outros']
const CORES = ['#eb8909', '#299438', '#884dff', '#4073ff', '#d1453b', '#6accbc', '#e0a80c', '#808080']

export function CardGastos({ pet, controle }: { pet: Pet; controle: ControleCartao }) {
  const gastos = useGastosPet(pet.id)
  const [add, setAdd] = useState(false)
  const [cat, setCat] = useState(CATEGORIAS[0])
  const [valor, setValor] = useState('')
  const [desc, setDesc] = useState('')
  const [data, setData] = useState(hojeISO())

  const mesAtual = hojeISO().slice(0, 7)
  const doMes = (gastos ?? []).filter((g) => g.data.slice(0, 7) === mesAtual)
  const totalMes = doMes.reduce((s, g) => s + g.valorCentavos, 0)

  const porCat = new Map<string, number>()
  for (const g of doMes) porCat.set(g.categoria ?? 'Outros', (porCat.get(g.categoria ?? 'Outros') ?? 0) + g.valorCentavos)
  const breakdown = [...porCat.entries()].sort((a, b) => b[1] - a[1])

  async function salvar() {
    const centavos = parsearValor(valor)
    if (!centavos || !desc.trim()) return
    await criarMovimento({ tipo: 'saida', valorCentavos: centavos, descricao: desc.trim(), data, categoria: cat, petId: pet.id })
    setValor(''); setDesc(''); setData(hojeISO()); setAdd(false)
  }

  return (
    <CartaoModulo
      titulo="Gastos"
      emoji="💰"
      acao={
        <button onClick={() => setAdd(true)} className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink" title="Lançar gasto">
          <IconMais width={16} height={16} />
        </button>
      }
      {...controle}
    >
      <div className="flex items-baseline justify-between">
        <div>
          <span className={ROTULO}>Este mês</span>
          <div className="text-[20px] font-bold tabular-nums">{formatarBRL(totalMes)}</div>
        </div>
        <span className="text-[11px] text-muted">{format(parseISO(hojeISO()), 'MMMM', { locale: ptBR })}</span>
      </div>
      {breakdown.length === 0 ? (
        <Vazio>Nenhum gasto lançado neste mês. Também aparecem em Finanças.</Vazio>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {breakdown.map(([c, v], i) => (
            <li key={c} className="flex items-center gap-2 text-[13px]">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: CORES[CATEGORIAS.indexOf(c) % CORES.length] ?? CORES[i % CORES.length] }} />
              <span className="flex-1">{c}</span>
              <span className="font-medium tabular-nums">{formatarBRL(v)}</span>
            </li>
          ))}
        </ul>
      )}
      {(gastos ?? []).length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[12px] text-muted">Ver todos os lançamentos ({(gastos ?? []).length})</summary>
          <ul className="mt-1.5 divide-y divide-line">
            {[...(gastos ?? [])].sort((a, b) => b.data.localeCompare(a.data)).map((g) => (
              <li key={g.id} className="group flex items-center gap-2 py-1.5 text-[12.5px]">
                <span className="w-16 tabular-nums text-muted">{format(parseISO(g.data), 'dd/MM')}</span>
                <span className="flex-1 truncate">{g.descricao}</span>
                <span className="font-medium tabular-nums">{formatarBRL(g.valorCentavos)}</span>
                <button onClick={() => excluirMovimento(g.id)} className="text-[14px] leading-none text-muted opacity-0 hover:text-danger group-hover:opacity-100">×</button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {add && (
        <FolhaInferior titulo="Lançar gasto" onFechar={() => setAdd(false)}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIAS.map((c) => (
                <button key={c} onClick={() => setCat(c)} className={`rounded-full border px-2.5 py-1.5 text-[12.5px] font-medium ${cat === c ? 'border-ink bg-ink text-surface' : 'border-line text-muted'}`}>{c}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block"><span className={ROT}>Valor</span><input inputMode="decimal" autoFocus className={`${CAMPO} mt-1`} value={valor} onChange={(e) => setValor(e.target.value)} placeholder="R$ 0,00" /></label>
              <label className="block"><span className={ROT}>Data</span><input type="date" className={`${CAMPO} mt-1`} value={data} onChange={(e) => setData(e.target.value)} /></label>
            </div>
            <label className="block"><span className={ROT}>Descrição</span><input className={`${CAMPO} mt-1`} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={`Ex.: ${cat}`} /></label>
            <p className="text-[12px] text-muted">Lançado também em Finanças, na categoria “{cat}”.</p>
            <button onClick={salvar} disabled={!valor || !desc.trim()} className="min-h-11 rounded-xl bg-ink text-[14px] font-semibold text-surface disabled:opacity-40">Salvar</button>
          </div>
        </FolhaInferior>
      )}
    </CartaoModulo>
  )
}
