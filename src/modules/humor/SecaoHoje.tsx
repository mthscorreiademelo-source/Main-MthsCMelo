import { Link } from 'react-router-dom'
import { SecaoDashboard } from '../../core/components/SecaoDashboard'
import { hojeISO } from '../../core/dates'
import { RostoHumor } from './components/RostoHumor'
import { humorDe, mediaNivel, registrosDoDia } from './humor'
import { useHumorTipos, useRegistros } from './hooks'
import type { HumorTipo } from './types'

/** Contribuição do Humor para o dashboard Hoje. */
export function SecaoHoje() {
  const registros = useRegistros()
  const tipos = useHumorTipos()
  if (registros === undefined) return null

  const doDia = registrosDoDia(registros, hojeISO())
  const tipo = doDia.length
    ? humorDe(tipos, Math.round(mediaNivel(doDia)) as HumorTipo['nivel'])
    : null

  return (
    <SecaoDashboard titulo="Humor" verTodos="/humor">
      <Link
        to="/humor"
        className="flex items-center gap-3 rounded-2xl border border-line p-3 transition-colors hover:border-muted/40"
        style={tipo ? { backgroundColor: `${tipo.cor}10` } : undefined}
      >
        {tipo ? (
          <>
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${tipo.cor}26` }}
            >
              <RostoHumor nivel={tipo.nivel} width={26} height={26} style={{ color: tipo.cor }} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">{tipo.nome}</span>
              <span className="block text-[13px] text-muted">
                {doDia.length === 1 ? 'registrado hoje' : `média de ${doDia.length} registros`}
              </span>
            </span>
          </>
        ) : (
          <>
            <span className="flex -space-x-1.5">
              {tipos.map((t) => (
                <span
                  key={t.nivel}
                  className="flex size-8 items-center justify-center rounded-full ring-2 ring-bg"
                  style={{ backgroundColor: `${t.cor}26` }}
                >
                  <RostoHumor nivel={t.nivel} width={17} height={17} style={{ color: t.cor }} />
                </span>
              ))}
            </span>
            <span className="text-[14px] font-medium text-muted">Como você está hoje?</span>
          </>
        )}
      </Link>
    </SecaoDashboard>
  )
}
