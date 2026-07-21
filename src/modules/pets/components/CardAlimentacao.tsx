import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconMais } from '../../../core/components/Icons'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { hojeISO } from '../../../core/dates'
import { CartaoModulo, ROTULO, type ControleCartao } from './CartaoModulo'
import { criarAlimento, diasRestantesAlimento, removerAlimento } from '../db'
import { useAlimentos } from '../hooks'
import { criarDespensa, diasRestantes, excluirDespensa } from '../../compras/db'
import { useDespensa } from '../../compras/hooks'
import type { Pet } from '../types'

const CAMPO = 'w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-muted/50'
const ROT = 'text-[12px] font-medium text-muted'

export function CardAlimentacao({ pet, controle }: { pet: Pet; controle: ControleCartao }) {
  const alimentos = useAlimentos(pet.id)
  const despensa = useDespensa()
  const itens = (despensa ?? []).filter((d) => d.petId === pet.id)
  const [sheet, setSheet] = useState<null | 'racao' | 'item'>(null)

  const principal = (alimentos ?? []).find((a) => a.principal) ?? (alimentos ?? []).find((a) => a.tipo === 'racao')
  const est = principal ? diasRestantesAlimento(principal) : null

  // form ração
  const [nome, setNome] = useState('')
  const [sabor, setSabor] = useState('')
  const [pacote, setPacote] = useState('')
  const [gramasDia, setGramasDia] = useState('')
  const [refeicoes, setRefeicoes] = useState('2')
  // form item
  const [itNome, setItNome] = useState('')
  const [itQtd, setItQtd] = useState('')
  const [itUn, setItUn] = useState('un')
  const [itConsumo, setItConsumo] = useState('')

  async function salvarRacao() {
    if (!nome.trim()) return
    await criarAlimento({
      petId: pet.id,
      tipo: 'racao',
      nome: nome.trim(),
      sabor: sabor.trim() || undefined,
      pacoteGramas: pacote ? Number(pacote) : undefined,
      gramasPorDia: gramasDia ? Number(gramasDia) : undefined,
      refeicoesPorDia: refeicoes ? Number(refeicoes) : undefined,
      abertoEm: hojeISO(),
      principal: !principal,
    })
    setNome(''); setSabor(''); setPacote(''); setGramasDia(''); setSheet(null)
  }
  async function salvarItem() {
    if (!itNome.trim() || !itQtd) return
    await criarDespensa({
      petId: pet.id,
      categoria: 'pet',
      local: 'Área do pet',
      nome: itNome.trim(),
      quantidadeFechados: Number(itQtd),
      unidade: itUn,
      consumoDia: itConsumo ? Number(itConsumo) : undefined,
    })
    setItNome(''); setItQtd(''); setItConsumo(''); setSheet(null)
  }

  return (
    <CartaoModulo titulo="Alimentação e estoque" emoji="🍖" {...controle}>
      {principal ? (
        <div>
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-hover text-[20px]">🥣</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-semibold">{principal.nome}</div>
              <div className="truncate text-[12px] text-muted">
                {principal.sabor ? `${principal.sabor} · ` : ''}
                {principal.pacoteGramas ? `${(principal.pacoteGramas / 1000).toFixed(0)} kg` : ''}
                {principal.gramasPorDia ? ` · ${principal.gramasPorDia} g/dia` : ''}
                {principal.refeicoesPorDia ? ` · ${principal.refeicoesPorDia}x` : ''}
              </div>
            </div>
            <button onClick={() => removerAlimento(principal.id)} className="text-[15px] leading-none text-muted hover:text-danger" title="Remover">×</button>
          </div>
          {est && (
            <div className="mt-2.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] text-muted">Restam aproximadamente</span>
                <span className={`text-[15px] font-bold ${est.dias <= 5 ? 'text-danger' : 'text-accent'}`}>{est.dias} dias</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-hover">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.round(est.fracao * 100)}%` }} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <button onClick={() => setSheet('racao')} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-3 text-[13px] font-medium text-muted hover:text-ink">
          <IconMais width={15} height={15} /> Definir ração principal
        </button>
      )}

      {/* Estoque de itens (fonte única: Despensa do módulo Compras) */}
      <div className="mt-3 flex items-center justify-between">
        <span className={ROTULO}>Estoque</span>
        <button onClick={() => setSheet('item')} className="text-muted hover:text-ink"><IconMais width={15} height={15} /></button>
      </div>
      {itens.length === 0 ? (
        <p className="mt-1 text-[12.5px] text-muted">Nenhum item no estoque.</p>
      ) : (
        <ul className="mt-1 grid grid-cols-2 gap-1.5">
          {itens.map((it) => {
            const dias = diasRestantes(it, [])
            const baixo = dias != null && dias <= 5
            return (
              <li key={it.id} className="group flex items-center gap-2 rounded-xl border border-line px-2.5 py-1.5">
                <span aria-hidden>🐾</span>
                <Link to={`/compras/despensa/${it.id}`} className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium">{it.nome}</div>
                  <div className={`text-[10.5px] ${baixo ? 'text-danger' : 'text-muted'}`}>
                    {it.quantidadeFechados ?? 0} {it.unidade}{dias != null ? ` · ~${dias}d` : ''}
                  </div>
                </Link>
                <button onClick={() => excluirDespensa(it.id)} className="text-[14px] leading-none text-muted opacity-0 hover:text-danger group-hover:opacity-100">×</button>
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-1 text-[10.5px] text-muted">Estoque unificado com a Despensa (aba Compras).</p>

      {sheet === 'racao' && (
        <FolhaInferior titulo="Ração / comida" onFechar={() => setSheet(null)}>
          <div className="flex flex-col gap-3">
            <label className="block"><span className={ROT}>Nome</span><input autoFocus className={`${CAMPO} mt-1`} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Premier Seleção" /></label>
            <label className="block"><span className={ROT}>Sabor</span><input className={`${CAMPO} mt-1`} value={sabor} onChange={(e) => setSabor(e.target.value)} placeholder="Opcional" /></label>
            <div className="grid grid-cols-3 gap-2">
              <label className="block"><span className={ROT}>Pacote (g)</span><input inputMode="numeric" className={`${CAMPO} mt-1`} value={pacote} onChange={(e) => setPacote(e.target.value)} placeholder="15000" /></label>
              <label className="block"><span className={ROT}>g / dia</span><input inputMode="numeric" className={`${CAMPO} mt-1`} value={gramasDia} onChange={(e) => setGramasDia(e.target.value)} placeholder="1650" /></label>
              <label className="block"><span className={ROT}>Refeições</span><input inputMode="numeric" className={`${CAMPO} mt-1`} value={refeicoes} onChange={(e) => setRefeicoes(e.target.value)} /></label>
            </div>
            <p className="text-[12px] text-muted">Com pacote + g/dia, o Lume estima quantos dias a ração ainda dura.</p>
            <button onClick={salvarRacao} disabled={!nome.trim()} className="min-h-11 rounded-xl bg-ink text-[14px] font-semibold text-surface disabled:opacity-40">Salvar</button>
          </div>
        </FolhaInferior>
      )}
      {sheet === 'item' && (
        <FolhaInferior titulo="Item de estoque" onFechar={() => setSheet(null)}>
          <div className="flex flex-col gap-3">
            <label className="block"><span className={ROT}>Nome</span><input autoFocus className={`${CAMPO} mt-1`} value={itNome} onChange={(e) => setItNome(e.target.value)} placeholder="Ex.: Antipulgas, petiscos…" /></label>
            <div className="grid grid-cols-3 gap-2">
              <label className="block"><span className={ROT}>Quantidade</span><input inputMode="decimal" className={`${CAMPO} mt-1`} value={itQtd} onChange={(e) => setItQtd(e.target.value)} placeholder="20" /></label>
              <label className="block"><span className={ROT}>Unidade</span><input className={`${CAMPO} mt-1`} value={itUn} onChange={(e) => setItUn(e.target.value)} placeholder="un" /></label>
              <label className="block"><span className={ROT}>Consumo/dia</span><input inputMode="decimal" className={`${CAMPO} mt-1`} value={itConsumo} onChange={(e) => setItConsumo(e.target.value)} placeholder="opc." /></label>
            </div>
            <button onClick={salvarItem} disabled={!itNome.trim() || !itQtd} className="min-h-11 rounded-xl bg-ink text-[14px] font-semibold text-surface disabled:opacity-40">Salvar</button>
          </div>
        </FolhaInferior>
      )}
    </CartaoModulo>
  )
}
