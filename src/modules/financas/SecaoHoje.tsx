import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { SecaoDashboard } from '../../core/components/SecaoDashboard'
import { hojeISO } from '../../core/dates'
import { filtrarMes, formatarBRL, totais } from './db'
import { useMovimentos } from './hooks'

/** Contribuição das Finanças para o dashboard Hoje. */
export function SecaoHoje() {
  const movimentos = useMovimentos()
  const hoje = hojeISO()
  const mes = hoje.slice(0, 7)

  const { gastoHoje, saldoMes } = useMemo(() => {
    const todos = movimentos ?? []
    const doDia = todos.filter((m) => m.data === hoje && m.tipo === 'saida')
    const gasto = doDia.reduce((s, m) => s + m.valorCentavos, 0)
    const { saldo } = totais(filtrarMes(todos, mes))
    return { gastoHoje: gasto, saldoMes: saldo }
  }, [movimentos, hoje, mes])

  // só aparece quando há algum movimento no mês
  if (!movimentos || filtrarMes(movimentos, mes).length === 0) return null

  return (
    <SecaoDashboard titulo="Finanças" verTodos="/financas">
      <Link
        to="/financas"
        className="flex items-stretch gap-2 rounded-2xl border border-line p-3 transition-colors hover:border-muted/40"
      >
        <div className="flex-1">
          <p className="text-[12px] text-muted">Gastos de hoje</p>
          <p className="text-[16px] font-semibold text-danger">
            {gastoHoje > 0 ? `− ${formatarBRL(gastoHoje)}` : formatarBRL(0)}
          </p>
        </div>
        <div className="w-px bg-line" />
        <div className="flex-1 pl-1">
          <p className="text-[12px] text-muted">Saldo do mês</p>
          <p className={`text-[16px] font-semibold ${saldoMes < 0 ? 'text-danger' : ''}`}>
            {formatarBRL(saldoMes)}
          </p>
        </div>
      </Link>
    </SecaoDashboard>
  )
}
