import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { IconSetaEsquerda } from '../../core/components/Icons'
import { criarMovimento, formatarBRL, parsearValor } from '../financas/db'
import { EditorAquisicao } from './components/EditorAquisicao'
import { atualizarAquisicao, registrarPreco, STATUS_AQUISICAO } from './db'
import { useAquisicao, usePrecosAquisicao } from './hooks'
import { hojeISO } from '../../core/dates'

const CARTAO = 'rounded-2xl border border-line bg-surface/50 p-4'
const ROT = 'text-[11px] font-semibold uppercase tracking-wide text-muted'

export function AquisicaoPage() {
  const { id } = useParams<{ id: string }>()
  const aq = useAquisicao(id)
  const precos = usePrecosAquisicao(id)
  const [editar, setEditar] = useState(false)
  const [novoPreco, setNovoPreco] = useState('')
  const [loja, setLoja] = useState('')

  if (aq === undefined) return <p className="py-16 text-center text-[14px] text-muted">Carregando…</p>
  if (!aq) return <div className="py-16 text-center"><p className="text-[15px] font-medium">Aquisição não encontrada</p><Link to="/compras" className="mt-2 inline-block text-[13px] text-accent">← Voltar</Link></div>

  const ord = [...(precos ?? [])].sort((a, b) => a.data.localeCompare(b.data))
  const menor = ord.length ? Math.min(...ord.map((p) => p.precoCentavos)) : null

  async function addPreco() {
    const c = parsearValor(novoPreco)
    if (!c) return
    await registrarPreco(aq!.id, c, loja.trim() || undefined)
    setNovoPreco(''); setLoja('')
  }
  async function comprar() {
    const valor = aq!.valorAtualCentavos ?? aq!.valorEsperadoCentavos
    if (valor && confirm(`Registrar a compra de “${aq!.nome}” por ${formatarBRL(valor)} em Finanças?`)) {
      await criarMovimento({ tipo: 'saida', valorCentavos: valor, descricao: aq!.nome, data: hojeISO(), categoria: 'Outros' })
    }
    await atualizarAquisicao(aq!.id, { status: 'comprado' })
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link to="/compras" className="flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"><IconSetaEsquerda width={16} height={16} /> Compras</Link>
        <button onClick={() => setEditar(true)} className="min-h-8 rounded-full border border-line px-3 text-[13px] font-medium text-muted hover:text-ink">Editar</button>
      </div>

      <div className={CARTAO}>
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-xl bg-hover text-[22px]">🎯</span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[20px] font-bold leading-tight">{aq.nome}</h1>
            {aq.necessidade && <p className="truncate text-[12.5px] text-muted">{aq.necessidade}</p>}
          </div>
        </div>
        {/* Status */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {STATUS_AQUISICAO.map((s) => (
            <button key={s.valor} onClick={() => atualizarAquisicao(aq.id, { status: s.valor })} className={`rounded-full border px-2.5 py-1 text-[12px] font-medium ${aq.status === s.valor ? 'border-ink text-ink' : 'border-line text-muted'}`} style={aq.status === s.valor ? { backgroundColor: `${s.cor}22` } : undefined}>{s.nome}</button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-line px-3 py-2"><div className="text-[10px] uppercase text-muted">Valor esperado</div><div className="text-[14px] font-semibold">{aq.valorEsperadoCentavos ? formatarBRL(aq.valorEsperadoCentavos) : '—'}</div></div>
          <div className="rounded-xl border border-line px-3 py-2"><div className="text-[10px] uppercase text-muted">Melhor preço visto</div><div className="text-[14px] font-semibold text-accent">{menor != null ? formatarBRL(menor) : '—'}</div></div>
        </div>
        {aq.descricao && <p className="mt-3 whitespace-pre-wrap text-[13px] text-ink/80">{aq.descricao}</p>}
      </div>

      {/* Histórico de preços */}
      <div className={CARTAO}>
        <span className={ROT}>Histórico de preços</span>
        <div className="mt-2 flex items-end gap-2">
          <label className="flex-1"><span className="text-[12px] font-medium text-muted">Preço visto</span><input inputMode="decimal" className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none" value={novoPreco} onChange={(e) => setNovoPreco(e.target.value)} placeholder="R$ 0,00" /></label>
          <label className="flex-1"><span className="text-[12px] font-medium text-muted">Loja</span><input className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none" value={loja} onChange={(e) => setLoja(e.target.value)} placeholder="Opcional" /></label>
          <button onClick={addPreco} disabled={!novoPreco} className="min-h-9 rounded-xl bg-hover px-3 text-[13px] font-medium disabled:opacity-40">Registrar</button>
        </div>
        {ord.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted">Nenhum preço registrado. Acompanhe a variação até achar o melhor momento.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {[...ord].reverse().map((p) => (
              <li key={p.id} className="flex items-center gap-2 py-2 text-[13px]">
                <span className="w-20 tabular-nums text-muted">{format(parseISO(p.data), 'dd/MM/yy')}</span>
                <span className="flex-1">{p.loja ?? '—'}</span>
                <span className={`font-medium tabular-nums ${p.precoCentavos === menor ? 'text-accent' : ''}`}>{formatarBRL(p.precoCentavos)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {aq.status !== 'comprado' && (
        <button onClick={comprar} className="min-h-11 rounded-xl bg-ink text-[14px] font-semibold text-surface">Marcar como comprado</button>
      )}

      {editar && <EditorAquisicao aquisicao={aq} onFechar={() => setEditar(false)} />}
    </div>
  )
}
