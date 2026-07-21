import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { IconSetaEsquerda } from '../../core/components/Icons'
import { FolhaInferior } from '../../core/components/FolhaInferior'
import { hojeISO } from '../../core/dates'
import { formatarBRL, parsearValor } from '../financas/db'
import { EditorDespensa } from './components/EditorDespensa'
import { atualizarDespensa, catInfo, confiancaDe, consumoDiaEstim, diasRestantes, intervaloMedio, logMov, proximaReposicao, quantidadeEstim, type Confianca } from './db'
import { useItemDespensa, useHistoricoDespensa } from './hooks'

const ROTULO_CONF: Record<Confianca, string> = { alta: 'confiança alta', moderada: 'confiança moderada', poucos: 'poucos dados disponíveis' }
const TIPO_LABEL: Record<string, string> = { compra: 'Compra', ajuste: 'Ajuste', abriu: 'Aberto', acabou: 'Acabou', descarte: 'Descarte' }
const CARTAO = 'rounded-2xl border border-line bg-surface/50 p-4'
const ROT = 'text-[11px] font-semibold uppercase tracking-wide text-muted'

export function ItemDespensaPage() {
  const { id } = useParams<{ id: string }>()
  const item = useItemDespensa(id)
  const historico = useHistoricoDespensa(id)
  const [editar, setEditar] = useState(false)
  const [addCompra, setAddCompra] = useState(false)
  const [qtd, setQtd] = useState('1')
  const [preco, setPreco] = useState('')
  const [loja, setLoja] = useState('')

  if (item === undefined) return <p className="py-16 text-center text-[14px] text-muted">Carregando…</p>
  if (!item) return <div className="py-16 text-center"><p className="text-[15px] font-medium">Item não encontrado</p><Link to="/compras" className="mt-2 inline-block text-[13px] text-accent">← Voltar</Link></div>

  const h = historico ?? []
  const cat = catInfo(item.categoria)
  const q = quantidadeEstim(item)
  const dias = diasRestantes(item, h)
  const rep = proximaReposicao(item, h)
  const im = intervaloMedio(h)
  const consumo = consumoDiaEstim(item, h)
  const conf = confiancaDe(item, h)
  const compras = h.filter((x) => x.tipo === 'compra').sort((a, b) => b.data.localeCompare(a.data))

  async function registrarCompra() {
    await logMov(item!.id, 'compra', {
      quantidade: qtd ? Number(qtd.replace(',', '.')) : 1,
      precoCentavos: preco ? parsearValor(preco) ?? undefined : undefined,
      loja: loja.trim() || undefined,
      marca: item!.marca,
    })
    await atualizarDespensa(item!.id, { quantidadeFechados: (item!.quantidadeFechados ?? 0) + (qtd ? Number(qtd.replace(',', '.')) : 1), ultimaCompraEm: hojeISO() })
    setQtd('1'); setPreco(''); setLoja(''); setAddCompra(false)
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link to="/compras" className="flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"><IconSetaEsquerda width={16} height={16} /> Compras</Link>
        <button onClick={() => setEditar(true)} className="min-h-8 rounded-full border border-line px-3 text-[13px] font-medium text-muted hover:text-ink">Editar</button>
      </div>

      <div className={CARTAO}>
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-xl bg-hover text-[22px]">{cat.icone}</span>
          <div className="min-w-0">
            <h1 className="truncate text-[20px] font-bold leading-tight">{item.nome}</h1>
            <p className="truncate text-[12.5px] text-muted">{item.marca ? `${item.marca} · ` : ''}{cat.nome}{item.local ? ` · ${item.local}` : ''}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-line px-3 py-2"><div className="text-[10px] uppercase text-muted">Estoque estimado</div><div className="text-[14px] font-semibold">{q == null ? 'em casa' : `${+q.toFixed(1)} ${item.unidade}`}</div></div>
          <div className="rounded-xl border border-line px-3 py-2"><div className="text-[10px] uppercase text-muted">Dura aprox.</div><div className="text-[14px] font-semibold">{dias != null ? `${dias} dias` : '—'}</div></div>
          <div className="rounded-xl border border-line px-3 py-2"><div className="text-[10px] uppercase text-muted">Consumo/dia</div><div className="text-[14px] font-semibold">{consumo != null ? `${+consumo.toFixed(2)} ${item.unidade}` : '—'}</div></div>
        </div>
      </div>

      {/* Previsão */}
      <div className={CARTAO}>
        <span className={ROT}>Previsão de reposição</span>
        <p className="mt-1.5 text-[14px]">
          {rep ? <>Próxima reposição estimada por volta de <span className="font-semibold">{format(parseISO(rep), "d 'de' MMMM", { locale: ptBR })}</span>.</> : 'Ainda não há histórico suficiente para prever a reposição deste item.'}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-[12px] text-muted">
          {im && <span className="rounded-full bg-hover px-2 py-0.5">intervalo médio: {im.dias} dias</span>}
          {item.ultimaCompraEm && <span className="rounded-full bg-hover px-2 py-0.5">última compra: {format(parseISO(item.ultimaCompraEm), 'dd/MM/yy')}</span>}
          <span className="rounded-full bg-hover px-2 py-0.5">{ROTULO_CONF[conf]}</span>
        </div>
        <p className="mt-2 text-[11px] text-muted">É uma estimativa, não uma certeza. Melhora conforme você registra compras e ajustes.</p>
      </div>

      {/* Histórico */}
      <div className={CARTAO}>
        <div className="flex items-center justify-between">
          <span className={ROT}>Histórico</span>
          <button onClick={() => setAddCompra(true)} className="rounded-full bg-ink px-2.5 py-1 text-[12px] font-medium text-surface">+ Compra</button>
        </div>
        {h.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted">Sem registros ainda.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {[...h].sort((a, b) => b.data.localeCompare(a.data)).map((m) => (
              <li key={m.id} className="flex items-center gap-2 py-2 text-[13px]">
                <span className="w-20 tabular-nums text-muted">{format(parseISO(m.data), 'dd/MM/yy')}</span>
                <span className="flex-1">{TIPO_LABEL[m.tipo] ?? m.tipo}{m.quantidade ? ` · ${m.quantidade} ${item.unidade}` : ''}{m.loja ? ` · ${m.loja}` : ''}{m.obs ? ` · ${m.obs}` : ''}</span>
                {m.precoCentavos ? <span className="font-medium tabular-nums">{formatarBRL(m.precoCentavos)}</span> : null}
              </li>
            ))}
          </ul>
        )}
        {compras.length >= 2 && (
          <p className="mt-2 text-[11px] text-muted">Preço médio pago: {formatarBRL(Math.round(compras.filter((c) => c.precoCentavos).reduce((s, c) => s + (c.precoCentavos ?? 0), 0) / Math.max(1, compras.filter((c) => c.precoCentavos).length)))}</p>
        )}
      </div>

      {editar && <EditorDespensa item={item} onFechar={() => setEditar(false)} />}
      {addCompra && (
        <FolhaInferior titulo="Registrar compra" onFechar={() => setAddCompra(false)}>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
              <label className="block"><span className="text-[12px] font-medium text-muted">Qtd.</span><input inputMode="decimal" className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none" value={qtd} onChange={(e) => setQtd(e.target.value)} /></label>
              <label className="block"><span className="text-[12px] font-medium text-muted">Preço</span><input inputMode="decimal" className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="R$" /></label>
              <label className="block"><span className="text-[12px] font-medium text-muted">Loja</span><input className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none" value={loja} onChange={(e) => setLoja(e.target.value)} /></label>
            </div>
            <button onClick={registrarCompra} className="min-h-11 rounded-xl bg-ink text-[14px] font-semibold text-surface">Registrar</button>
          </div>
        </FolhaInferior>
      )}
    </div>
  )
}
