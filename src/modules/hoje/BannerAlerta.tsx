import type { SVGProps } from 'react'
import { Link } from 'react-router-dom'
import {
  IconBandeira,
  IconCarrinho,
  IconCifrao,
  IconFechar,
  IconRelogio,
} from '../../core/components/Icons'
import type { Alerta, TipoAlerta } from './alertas'

/**
 * Camada de ALERTA no topo do Hoje: o mais crítico em destaque (grande, colorido),
 * os demais em pastilhas compactas. Dispensável no X. Mantém a identidade do LUME:
 * perigo (vermelho) para alta severidade, acento (azul) para avisos.
 */

function IconeAlerta({ tipo, ...props }: { tipo: TipoAlerta } & SVGProps<SVGSVGElement>) {
  switch (tipo) {
    case 'evento':
      return <IconRelogio {...props} />
    case 'tarefa':
      return <IconBandeira {...props} />
    case 'orcamento':
      return <IconCifrao {...props} />
    case 'despensa':
      return <IconCarrinho {...props} />
  }
}

export function BannerAlerta({
  alertas,
  onDispensar,
}: {
  alertas: Alerta[]
  onDispensar: () => void
}) {
  if (alertas.length === 0) return null
  const [principal, ...resto] = alertas
  const alta = principal.severidade === 'alta'

  const p = alta
    ? { texto: 'text-danger', bg: 'bg-danger/10', ring: 'ring-danger/25' }
    : { texto: 'text-accent', bg: 'bg-accent/10', ring: 'ring-accent/20' }

  return (
    <div
      className={`lume-entrada relative rounded-2xl p-4 ring-1 ring-inset sm:p-5 ${p.bg} ${p.ring}`}
      role="alert"
    >
      <button
        onClick={onDispensar}
        aria-label="Dispensar alertas"
        className="absolute right-2.5 top-2.5 rounded-full p-1 text-muted transition-colors hover:bg-hover hover:text-ink"
      >
        <IconFechar width={18} height={18} />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <span
          className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-bg text-[20px] ${principal.emoji ? '' : p.texto}`}
          aria-hidden
        >
          {principal.emoji ?? <IconeAlerta tipo={principal.tipo} width={20} height={20} />}
        </span>

        <div className="min-w-0 flex-1">
          <span className={`text-[11px] font-semibold uppercase tracking-wide ${p.texto}`}>
            {alta ? 'Atenção' : 'Fique de olho'}
          </span>
          <h2 className={`mt-0.5 text-lg font-bold leading-tight ${p.texto}`}>{principal.titulo}</h2>
          {principal.detalhe && <p className="mt-1 text-[13px] text-muted">{principal.detalhe}</p>}
        </div>

        {principal.to && principal.acao && (
          <Link
            to={principal.to}
            className="hidden shrink-0 self-center rounded-xl bg-ink px-3.5 py-2 text-[13px] font-semibold text-bg transition-opacity hover:opacity-85 sm:block"
          >
            {principal.acao}
          </Link>
        )}
      </div>

      {resto.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 pl-[52px]">
          {resto.slice(0, 3).map((a) =>
            a.to ? (
              <Link
                key={a.id}
                to={a.to}
                className="flex max-w-full items-center gap-1.5 rounded-full bg-bg/70 px-2.5 py-1 text-[12px] text-muted ring-1 ring-inset ring-line transition-colors hover:text-ink"
              >
                {a.emoji ? (
                  <span aria-hidden>{a.emoji}</span>
                ) : (
                  <IconeAlerta tipo={a.tipo} width={13} height={13} className="shrink-0" />
                )}
                <span className="truncate">{a.titulo}</span>
              </Link>
            ) : (
              <span
                key={a.id}
                className="flex max-w-full items-center gap-1.5 rounded-full bg-bg/70 px-2.5 py-1 text-[12px] text-muted ring-1 ring-inset ring-line"
              >
                <span className="truncate">{a.titulo}</span>
              </span>
            ),
          )}
          {resto.length > 3 && (
            <span className="px-1.5 py-1 text-[12px] text-muted">+{resto.length - 3}</span>
          )}
        </div>
      )}
    </div>
  )
}
