import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconCheck, IconSetaEsquerda } from '../../../core/components/Icons'
import { formatarBRL, parsearValor } from '../../financas/db'
import { catInfo, marcarComprado } from '../db'
import { buscarProdutoOFF } from '../openfoodfacts'
import { LeitorCodigoBarras } from './LeitorCodigoBarras'
import type { ItemCompra, ListaCompra } from '../types'

/** Modo de execução simplificado para usar durante as compras. */
export function ModoMercado({ lista, itens, onFechar }: { lista: ListaCompra; itens: ItemCompra[]; onFechar: () => void }) {
  const [pegos, setPegos] = useState<Set<string>>(new Set())
  const [precos, setPrecos] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  async function aoEscanear(ean: string) {
    setScanning(false)
    const p = await buscarProdutoOFF(ean)
    const alvo = p?.nome
      ? itens.find((i) => i.nome.toLowerCase().includes(p.nome!.toLowerCase()) || p.nome!.toLowerCase().includes(i.nome.toLowerCase()))
      : undefined
    if (alvo) {
      setPegos((prev) => new Set(prev).add(alvo.id))
      setAviso(`✓ ${alvo.nome} marcado`)
    } else {
      setAviso(p?.nome ? `Encontrado: ${p.nome} (não está na lista)` : `Código ${ean} não reconhecido`)
    }
    setTimeout(() => setAviso(null), 3000)
  }

  const grupos = useMemo(() => {
    const mapa = new Map<string, ItemCompra[]>()
    for (const i of itens) {
      const corredor = catInfo(i.categoria).corredor
      ;(mapa.get(corredor) ?? mapa.set(corredor, []).get(corredor)!).push(i)
    }
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [itens])

  const estimado = itens.reduce((s, i) => s + (i.precoEstimadoCentavos ?? 0), 0)
  const real = Object.entries(precos).reduce((s, [id, v]) => (pegos.has(id) ? s + (parsearValor(v) ?? 0) : s), 0)

  function alternar(id: string) {
    setPegos((p) => {
      const n = new Set(p)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  async function concluir() {
    setSalvando(true)
    for (const i of itens) {
      if (!pegos.has(i.id)) continue
      const centavos = precos[i.id] ? parsearValor(precos[i.id]) ?? undefined : undefined
      await marcarComprado(i, { valorCentavos: centavos, atualizarEstoque: true, registrarFinancas: !!centavos, categoriaFin: i.petId ? 'Pets' : 'Alimentação' })
    }
    setSalvando(false)
    onFechar()
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-bg">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        <button onClick={onFechar} className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink"><IconSetaEsquerda width={18} height={18} /></button>
        <div className="flex-1">
          <h1 className="text-[16px] font-bold">{lista.icone} {lista.nome}</h1>
          <p className="text-[11px] text-muted">{pegos.size} de {itens.length} · modo mercado</p>
        </div>
        <button onClick={() => setScanning(true)} className="rounded-full border border-line px-2.5 py-1.5 text-[12px] font-medium text-muted hover:text-ink">📷 Código</button>
      </header>
      {aviso && <div className="bg-accent/10 px-4 py-1.5 text-center text-[12.5px] font-medium text-accent">{aviso}</div>}
      {scanning && <LeitorCodigoBarras onDetectado={aoEscanear} onFechar={() => setScanning(false)} />}

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {grupos.map(([corredor, lista]) => (
          <div key={corredor} className="mb-4">
            <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{corredor}</h2>
            <ul className="flex flex-col gap-1.5">
              {lista.map((i) => {
                const ok = pegos.has(i.id)
                return (
                  <li key={i.id} className={`flex items-center gap-3 rounded-2xl border px-3 py-3 transition-colors ${ok ? 'border-accent/40 bg-accent/5' : 'border-line'}`}>
                    <button onClick={() => alternar(i.id)} className={`flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${ok ? 'border-accent bg-accent text-surface' : 'border-line text-transparent'}`}>
                      <IconCheck width={17} height={17} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-[15px] font-medium ${ok ? 'text-muted line-through' : ''}`}>{i.nome}</div>
                      {i.quantidade ? <div className="text-[12px] text-muted">{i.quantidade}{i.unidade ? ` ${i.unidade}` : ''}</div> : null}
                    </div>
                    <input inputMode="decimal" value={precos[i.id] ?? ''} onChange={(e) => setPrecos((p) => ({ ...p, [i.id]: e.target.value }))} placeholder="R$" className="w-20 rounded-xl border border-line bg-surface px-2 py-1.5 text-center text-[14px] outline-none focus:border-muted/50" />
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
        {itens.length === 0 && <p className="py-10 text-center text-[14px] text-muted">Nada pendente nesta lista.</p>}
      </div>

      <footer className="border-t border-line px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <div className="mb-2 flex items-center justify-between text-[13px]">
          <span className="text-muted">Estimado: <span className="font-medium text-ink">{formatarBRL(estimado)}</span></span>
          <span className="text-muted">Real: <span className="font-semibold text-accent">{formatarBRL(real)}</span></span>
        </div>
        <button onClick={concluir} disabled={pegos.size === 0 || salvando} className="min-h-12 w-full rounded-2xl bg-ink text-[15px] font-semibold text-surface disabled:opacity-40">
          {salvando ? 'Concluindo…' : `Concluir ${pegos.size} ${pegos.size === 1 ? 'item' : 'itens'}`}
        </button>
      </footer>
    </div>,
    document.body,
  )
}
