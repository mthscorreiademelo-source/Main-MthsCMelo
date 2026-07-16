import { addDays, format, parseISO } from 'date-fns'
import { IconCalendario, IconSetaEsquerda } from '../../../core/components/Icons'
import { hojeISO, rotuloData } from '../../../core/dates'

/**
 * Navega entre os dias para registrar/editar hábitos em datas passadas.
 * Nunca passa de hoje (não dá para preencher o futuro).
 */
export function NavegadorData({ data, onData }: { data: string; onData: (d: string) => void }) {
  const hoje = hojeISO()
  const ehHoje = data === hoje
  const mudar = (delta: number) => {
    const nova = format(addDays(parseISO(data), delta), 'yyyy-MM-dd')
    if (nova <= hoje) onData(nova)
  }

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => mudar(-1)}
        aria-label="Dia anterior"
        className="flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-hover hover:text-ink"
      >
        <IconSetaEsquerda width={17} height={17} />
      </button>

      <label className="relative flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] font-medium transition-colors hover:bg-hover">
        <IconCalendario width={15} height={15} className="text-muted" />
        <span className={ehHoje ? '' : 'text-accent'}>{rotuloData(data)}</span>
        <input
          type="date"
          value={data}
          max={hoje}
          onChange={(e) => e.target.value && onData(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Escolher data"
        />
      </label>

      <button
        onClick={() => mudar(1)}
        disabled={ehHoje}
        aria-label="Próximo dia"
        className="flex size-9 items-center justify-center rounded-full text-muted transition-colors enabled:hover:bg-hover enabled:hover:text-ink disabled:opacity-30"
      >
        <IconSetaEsquerda width={17} height={17} className="rotate-180" />
      </button>

      {!ehHoje && (
        <button
          onClick={() => onData(hoje)}
          className="ml-1 rounded-full bg-hover px-3 py-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink"
        >
          Hoje
        </button>
      )}
    </div>
  )
}
