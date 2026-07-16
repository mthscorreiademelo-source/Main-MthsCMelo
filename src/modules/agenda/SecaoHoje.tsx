import { Link } from 'react-router-dom'
import { SecaoDashboard } from '../../core/components/SecaoDashboard'
import { hojeISO } from '../../core/dates'
import { eventosDoDia } from './db'
import { useEventos } from './hooks'

/** Contribuição da Agenda para o Hoje: eventos do dia. */
export function SecaoHoje() {
  const eventos = useEventos()
  if (eventos === undefined) return null
  const doDia = eventosDoDia(eventos, hojeISO())
  if (doDia.length === 0) return null

  return (
    <SecaoDashboard titulo="Agenda de hoje" contagem={doDia.length} verTodos="/agenda">
      <Link to="/agenda" className="flex flex-col overflow-hidden rounded-2xl border border-line">
        {doDia.slice(0, 5).map((e, i) => (
          <span key={e.id} className={`flex items-center gap-2.5 p-2.5 ${i > 0 ? 'border-t border-line' : ''}`}>
            <span className="w-11 shrink-0 text-right text-[12px] font-medium text-muted tabular-nums">
              {e.diaInteiro ? 'dia' : e.inicio}
            </span>
            <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: e.cor ?? '#4073ff' }} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium">{e.titulo}</span>
              {e.local && <span className="block truncate text-[12px] text-muted">{e.local}</span>}
            </span>
          </span>
        ))}
      </Link>
    </SecaoDashboard>
  )
}
