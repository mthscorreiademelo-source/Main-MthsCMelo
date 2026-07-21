import { useEffect, useRef, useState } from 'react'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { IconLixeira, IconMais } from '../../../core/components/Icons'
import {
  CATEGORIAS,
  atualizarConta,
  atualizarObjetivo,
  atualizarOrcamentoLinha,
  atualizarRecorrente,
  criarConta,
  criarObjetivo,
  criarOrcamentoLinha,
  criarRecorrente,
  excluirConta,
  excluirObjetivo,
  excluirOrcamentoLinha,
  excluirRecorrente,
  parsearValor,
  salvarConfig,
  valorParaTexto,
} from '../db'
import {
  useContas,
  useFinancasConfig,
  useMovimentos,
  useObjetivos,
  useOrcamentoLinhas,
  useRecorrentes,
} from '../hooks'
import { mediaLinha } from '../orcamento'
import { formatarBRL } from '../db'
import type { TipoConta } from '../types'

type Aba = 'geral' | 'contas' | 'objetivos' | 'recorrentes' | 'orcamento'
const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'geral', rotulo: 'Geral' },
  { id: 'contas', rotulo: 'Contas' },
  { id: 'objetivos', rotulo: 'Objetivos' },
  { id: 'recorrentes', rotulo: 'Recorrentes' },
  { id: 'orcamento', rotulo: 'Orçamento' },
]

const CAMPO = 'min-h-9 rounded-lg border border-line bg-surface px-2.5 text-[14px] outline-none focus:border-muted/60'
const ROTULO = 'text-[12px] font-medium text-muted'
const LINHA = 'rounded-xl border border-line p-3 flex flex-col gap-2'

/** Campo de dinheiro: texto pt-BR, confirma em centavos ao sair. */
function CampoDinheiro({ centavos, onCommit, className = '', placeholder = '0,00' }: {
  centavos: number
  onCommit: (c: number) => void
  className?: string
  placeholder?: string
}) {
  const [txt, setTxt] = useState(centavos ? valorParaTexto(centavos) : '')
  const focado = useRef(false)
  // Sincroniza quando o valor externo chega/atualiza (dados assíncronos), sem
  // atrapalhar a digitação (só quando o campo não está focado).
  useEffect(() => {
    if (!focado.current) setTxt(centavos ? valorParaTexto(centavos) : '')
  }, [centavos])
  return (
    <input
      value={txt}
      inputMode="decimal"
      placeholder={placeholder}
      onFocus={() => { focado.current = true }}
      onChange={(e) => setTxt(e.target.value)}
      onBlur={() => { focado.current = false; const c = parsearValor(txt); if (c !== null) onCommit(c) }}
      className={`${CAMPO} text-right ${className}`}
    />
  )
}

const TIPOS_CONTA: { v: TipoConta; r: string }[] = [
  { v: 'corrente', r: 'Corrente' },
  { v: 'poupanca', r: 'Poupança' },
  { v: 'investimento', r: 'Investimento' },
  { v: 'carteira', r: 'Carteira' },
  { v: 'divida', r: 'Dívida' },
]

export function AjustesFinancas({ onFechar }: { onFechar: () => void }) {
  const [aba, setAba] = useState<Aba>('geral')
  const config = useFinancasConfig()
  const contas = useContas()
  const objetivos = useObjetivos()
  const recorrentes = useRecorrentes()
  const linhas = useOrcamentoLinhas()
  const movimentos = useMovimentos()
  const mesRef = new Date().toISOString().slice(0, 7)

  return (
    <FolhaInferior titulo="Ajustes de Finanças" onFechar={onFechar}>
      <div className="flex flex-wrap gap-1 rounded-full bg-hover p-0.5">
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`rounded-full px-2.5 py-1 text-[12.5px] font-medium transition-colors ${aba === a.id ? 'bg-ink text-surface' : 'text-muted hover:text-ink'}`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      <div className="mt-1 flex flex-col gap-3">
        {aba === 'geral' && (
          <>
            <label className="flex items-center justify-between gap-3">
              <span className={ROTULO}>Renda mensal</span>
              <CampoDinheiro centavos={config?.rendaMensalCentavos ?? 0} onCommit={(c) => salvarConfig({ rendaMensalCentavos: c })} className="w-32" />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className={ROTULO}>Investir/poupar por mês</span>
              <CampoDinheiro centavos={config?.investimentoMensalCentavos ?? 0} onCommit={(c) => salvarConfig({ investimentoMensalCentavos: c })} className="w-32" />
            </label>
            <p className="text-[12px] leading-snug text-muted">
              A renda é a base do orçamento. O valor a investir/poupar e os aportes dos objetivos são reservados antes de calcular quanto você pode gastar por dia.
            </p>
          </>
        )}

        {aba === 'contas' && (
          <>
            {(contas ?? []).map((c) => (
              <div key={c.id} className={LINHA}>
                <div className="flex items-center gap-2">
                  <input defaultValue={c.nome} onBlur={(e) => atualizarConta(c.id, { nome: e.target.value.trim() || 'Conta' })} className={`${CAMPO} flex-1`} />
                  <button onClick={() => excluirConta(c.id)} aria-label="Excluir" className="text-danger"><IconLixeira width={15} height={15} /></button>
                </div>
                <div className="flex items-center gap-2">
                  <select defaultValue={c.tipo} onChange={(e) => atualizarConta(c.id, { tipo: e.target.value as TipoConta })} className={`${CAMPO} flex-1`}>
                    {TIPOS_CONTA.map((t) => <option key={t.v} value={t.v}>{t.r}</option>)}
                  </select>
                  <CampoDinheiro centavos={c.saldoCentavos} onCommit={(v) => atualizarConta(c.id, { saldoCentavos: v })} className="w-28" />
                </div>
              </div>
            ))}
            <button onClick={() => criarConta({ nome: 'Nova conta' })} className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2.5 text-[13px] font-medium text-muted hover:text-ink">
              <IconMais width={15} height={15} /> Adicionar conta
            </button>
          </>
        )}

        {aba === 'objetivos' && (
          <>
            {(objetivos ?? []).map((o) => (
              <div key={o.id} className={LINHA}>
                <div className="flex items-center gap-2">
                  <input defaultValue={o.icone ?? ''} onBlur={(e) => atualizarObjetivo(o.id, { icone: e.target.value.trim() || undefined })} className={`${CAMPO} w-12 text-center`} placeholder="🎯" />
                  <input defaultValue={o.nome} onBlur={(e) => atualizarObjetivo(o.id, { nome: e.target.value.trim() || 'Objetivo' })} className={`${CAMPO} flex-1`} />
                  <button onClick={() => excluirObjetivo(o.id)} aria-label="Excluir" className="text-danger"><IconLixeira width={15} height={15} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex flex-col gap-0.5"><span className="text-[10px] text-muted">Atual</span><CampoDinheiro centavos={o.atualCentavos} onCommit={(v) => atualizarObjetivo(o.id, { atualCentavos: v })} /></label>
                  <label className="flex flex-col gap-0.5"><span className="text-[10px] text-muted">Meta</span><CampoDinheiro centavos={o.alvoCentavos} onCommit={(v) => atualizarObjetivo(o.id, { alvoCentavos: v })} /></label>
                  <label className="flex flex-col gap-0.5"><span className="text-[10px] text-muted">Aporte/mês</span><CampoDinheiro centavos={o.aporteMensalCentavos ?? 0} onCommit={(v) => atualizarObjetivo(o.id, { aporteMensalCentavos: v })} /></label>
                </div>
                <label className="flex items-center gap-2 text-[12px] text-muted">
                  <input type="checkbox" defaultChecked={o.tipo === 'reserva'} onChange={(e) => atualizarObjetivo(o.id, { tipo: e.target.checked ? 'reserva' : 'meta' })} />
                  É a reserva de emergência
                </label>
              </div>
            ))}
            <button onClick={() => criarObjetivo({ nome: 'Novo objetivo', icone: '🎯', cor: '#7c9885' })} className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2.5 text-[13px] font-medium text-muted hover:text-ink">
              <IconMais width={15} height={15} /> Adicionar objetivo
            </button>
          </>
        )}

        {aba === 'recorrentes' && (
          <>
            {(recorrentes ?? []).map((r) => (
              <div key={r.id} className={LINHA}>
                <div className="flex items-center gap-2">
                  <input defaultValue={r.icone ?? ''} onBlur={(e) => atualizarRecorrente(r.id, { icone: e.target.value.trim() || undefined })} className={`${CAMPO} w-12 text-center`} placeholder="🔁" />
                  <input defaultValue={r.nome} onBlur={(e) => atualizarRecorrente(r.id, { nome: e.target.value.trim() || 'Recorrente' })} className={`${CAMPO} flex-1`} />
                  <button onClick={() => excluirRecorrente(r.id)} aria-label="Excluir" className="text-danger"><IconLixeira width={15} height={15} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex flex-col gap-0.5"><span className="text-[10px] text-muted">Valor</span><CampoDinheiro centavos={r.valorCentavos} onCommit={(v) => atualizarRecorrente(r.id, { valorCentavos: v })} /></label>
                  <label className="flex flex-col gap-0.5"><span className="text-[10px] text-muted">Dia do mês</span>
                    <input type="number" min={1} max={31} defaultValue={r.diaMes} onBlur={(e) => atualizarRecorrente(r.id, { diaMes: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })} className={`${CAMPO} text-right`} />
                  </label>
                  <label className="flex flex-col gap-0.5"><span className="text-[10px] text-muted">Categoria</span>
                    <select defaultValue={r.categoria ?? ''} onChange={(e) => atualizarRecorrente(r.id, { categoria: e.target.value || undefined })} className={CAMPO}>
                      <option value="">—</option>
                      {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                </div>
              </div>
            ))}
            <button onClick={() => criarRecorrente({ nome: 'Nova recorrente', icone: '🔁' })} className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2.5 text-[13px] font-medium text-muted hover:text-ink">
              <IconMais width={15} height={15} /> Adicionar recorrente
            </button>
          </>
        )}

        {aba === 'orcamento' && (
          <>
            {(linhas ?? []).map((l) => (
              <div key={l.id} className={LINHA}>
                <div className="flex items-center gap-2">
                  <input defaultValue={l.icone ?? ''} onBlur={(e) => atualizarOrcamentoLinha(l.id, { icone: e.target.value.trim() || undefined })} className={`${CAMPO} w-12 text-center`} placeholder="🏷️" />
                  <input defaultValue={l.nome} onBlur={(e) => atualizarOrcamentoLinha(l.id, { nome: e.target.value.trim() || 'Categoria' })} className={`${CAMPO} flex-1`} />
                  <input type="color" defaultValue={l.cor} onChange={(e) => atualizarOrcamentoLinha(l.id, { cor: e.target.value })} className="size-9 shrink-0 rounded-lg border border-line bg-surface" aria-label="Cor" />
                  <button onClick={() => excluirOrcamentoLinha(l.id)} aria-label="Excluir" className="text-danger"><IconLixeira width={15} height={15} /></button>
                </div>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted">Limite mensal</span>
                  <CampoDinheiro centavos={l.limiteCentavos} onCommit={(v) => atualizarOrcamentoLinha(l.id, { limiteCentavos: v })} className="w-28" />
                </label>
                {(() => {
                  const media = mediaLinha(l.categorias, movimentos ?? [], mesRef, 3)
                  if (media <= 0) return null
                  return (
                    <button
                      onClick={() => atualizarOrcamentoLinha(l.id, { limiteCentavos: media })}
                      className="self-start rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-muted hover:text-ink"
                      title="Usa a média dos últimos 3 meses com gasto nesta categoria"
                    >
                      Usar média 3m: {formatarBRL(media)}
                    </button>
                  )
                })()}
                <div className="flex flex-wrap gap-1">
                  {CATEGORIAS.map((c) => {
                    const ativo = l.categorias.includes(c)
                    return (
                      <button
                        key={c}
                        onClick={() => atualizarOrcamentoLinha(l.id, { categorias: ativo ? l.categorias.filter((x) => x !== c) : [...l.categorias, c] })}
                        className={`rounded-full border px-2 py-0.5 text-[11px] ${ativo ? 'border-ink bg-ink text-surface' : 'border-line text-muted'}`}
                      >
                        {c}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            <button onClick={() => criarOrcamentoLinha({ nome: 'Nova categoria', cor: '#7c9885' })} className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2.5 text-[13px] font-medium text-muted hover:text-ink">
              <IconMais width={15} height={15} /> Adicionar categoria
            </button>
          </>
        )}
      </div>
    </FolhaInferior>
  )
}
