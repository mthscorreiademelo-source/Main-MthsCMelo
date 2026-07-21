import { useState } from 'react'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { formatarBRL, guardarNoObjetivo, parsearValor, renderNoObjetivo, retirarDoObjetivo } from '../db'
import type { Conta, Objetivo } from '../types'

type Acao = 'guardar' | 'retirar' | 'rendimento'

const ACOES: { id: Acao; rotulo: string; dica: string }[] = [
  { id: 'guardar', rotulo: 'Guardar', dica: 'Tirar de uma conta e reservar aqui' },
  { id: 'retirar', rotulo: 'Retirar', dica: 'Devolver para uma conta' },
  { id: 'rendimento', rotulo: 'Rendimento', dica: 'Cresceu sozinho (juros), sem mexer em conta' },
]

export function MovimentarObjetivo({
  objetivo,
  contas,
  onFechar,
}: {
  objetivo: Objetivo
  contas: Conta[]
  onFechar: () => void
}) {
  const liquidas = contas.filter((c) => c.tipo === 'corrente' || c.tipo === 'carteira' || c.tipo === 'poupanca')
  const [acao, setAcao] = useState<Acao>('guardar')
  const [valor, setValor] = useState('')
  const [contaId, setContaId] = useState(liquidas[0]?.id ?? '')
  const [erro, setErro] = useState(false)

  async function confirmar() {
    const centavos = parsearValor(valor)
    if (centavos === null || centavos <= 0) { setErro(true); return }
    if (acao === 'guardar') await guardarNoObjetivo(objetivo.id, contaId || undefined, centavos)
    else if (acao === 'retirar') await retirarDoObjetivo(objetivo.id, contaId || undefined, centavos)
    else await renderNoObjetivo(objetivo.id, centavos)
    onFechar()
  }

  const precisaConta = acao !== 'rendimento'
  const falta = Math.max(0, objetivo.alvoCentavos - objetivo.atualCentavos)

  return (
    <FolhaInferior titulo={`${objetivo.icone ?? '🎯'} ${objetivo.nome}`} onFechar={onFechar}>
      <div className="flex flex-col gap-4">
        <div className="rounded-xl bg-hover/60 px-3 py-2.5 text-[13px]">
          <div className="flex items-center justify-between">
            <span className="text-muted">Guardado</span>
            <span className="font-semibold tabular-nums">{formatarBRL(objetivo.atualCentavos)}</span>
          </div>
          <div className="mt-0.5 flex items-center justify-between">
            <span className="text-muted">Falta para a meta</span>
            <span className="font-semibold tabular-nums">{formatarBRL(falta)}</span>
          </div>
        </div>

        {/* Ação */}
        <div className="flex overflow-hidden rounded-xl border border-line">
          {ACOES.map((a) => (
            <button
              key={a.id}
              onClick={() => setAcao(a.id)}
              className={`min-h-10 flex-1 cursor-pointer text-[13.5px] font-medium transition-colors ${
                acao === a.id ? 'bg-ink text-bg' : 'text-muted hover:bg-hover'
              }`}
            >
              {a.rotulo}
            </button>
          ))}
        </div>
        <p className="-mt-2 px-1 text-[12px] text-muted">{ACOES.find((a) => a.id === acao)!.dica}</p>

        {/* Valor */}
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">Valor (R$)</span>
          <input
            value={valor}
            onChange={(e) => { setValor(e.target.value); setErro(false) }}
            inputMode="decimal"
            placeholder="0,00"
            autoFocus
            className={`min-h-12 rounded-lg border bg-transparent px-3 text-[17px] font-semibold outline-none focus:border-muted/50 ${erro ? 'border-danger' : 'border-line'}`}
          />
        </label>

        {/* Conta (guardar/retirar) */}
        {precisaConta && liquidas.length > 0 && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted">{acao === 'guardar' ? 'Tirar da conta' : 'Devolver para a conta'}</span>
            <select
              value={contaId}
              onChange={(e) => setContaId(e.target.value)}
              className="min-h-11 rounded-lg border border-line bg-transparent px-3 text-[15px] outline-none focus:border-muted/50"
            >
              {liquidas.map((c) => (
                <option key={c.id} value={c.id}>{c.icone ? `${c.icone} ` : ''}{c.nome} · {formatarBRL(c.saldoCentavos)}</option>
              ))}
            </select>
          </label>
        )}

        <button
          onClick={confirmar}
          className="mt-1 flex min-h-12 items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-bg"
        >
          {acao === 'guardar' ? 'Guardar' : acao === 'retirar' ? 'Retirar' : 'Lançar rendimento'}
        </button>
      </div>
    </FolhaInferior>
  )
}
