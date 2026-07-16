import { Link } from 'react-router-dom'
import { SecaoDashboard } from '../../core/components/SecaoDashboard'
import { IconeFator } from '../../core/components/icones'
import { hojeISO } from '../../core/dates'
import { exibir, METRICAS } from './db'
import { useSaude } from './hooks'

const DESTAQUES = METRICAS.filter((m) => m.chave === 'sonoMin' || m.chave === 'passos')

/** Contribuição da Saúde para o dashboard Hoje. */
export function SecaoHoje() {
  const dias = useSaude()
  if (dias === undefined) return null
  const hoje = dias.find((d) => d.data === hojeISO())

  return (
    <SecaoDashboard titulo="Saúde" verTodos="/saude">
      <Link
        to="/saude"
        className="flex items-center gap-3 rounded-2xl border border-line p-3 transition-colors hover:border-muted/40"
      >
        {hoje ? (
          DESTAQUES.map((m) => (
            <div key={m.chave} className="flex flex-1 items-center gap-2">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${m.cor}22` }}
              >
                <IconeFator nome={m.icone} width={17} height={17} style={{ color: m.cor }} />
              </span>
              <span>
                <span className="block text-[11px] text-muted">{m.nome}</span>
                <span className="block text-[15px] font-semibold">{exibir(m.chave, hoje[m.chave])}</span>
              </span>
            </div>
          ))
        ) : (
          <span className="py-1 text-[14px] font-medium text-muted">Registrar saúde de hoje</span>
        )}
      </Link>
    </SecaoDashboard>
  )
}
