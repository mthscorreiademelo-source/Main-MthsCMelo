import { useMemo, useState } from 'react'
import { addMonths, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EmptyState } from '../../core/components/EmptyState'
import { IconButton } from '../../core/components/Button'
import { IconCifrao, IconSetaEsquerda } from '../../core/components/Icons'
import { rotuloData } from '../../core/dates'
import { AddMovimento } from './components/AddMovimento'
import { MovimentoEditorSheet } from './components/MovimentoEditorSheet'
import { agruparPorDia, filtrarMes, formatarBRL, totais } from './db'
import { useMovimentos } from './hooks'
import type { Movimento } from './types'

export function FinancasPage() {
  const movimentos = useMovimentos()
  const [mes, setMes] = useState(() => format(new Date(), 'yyyy-MM'))
  const [selecionado, setSelecionado] = useState<Movimento | null>(null)

  const doMes = useMemo(
    () => filtrarMes(movimentos ?? [], mes),
    [movimentos, mes],
  )
  const { entradas, saidas, saldo } = useMemo(() => totais(doMes), [doMes])
  const grupos = useMemo(() => agruparPorDia(doMes), [doMes])

  function mudarMes(delta: number) {
    setMes(format(addMonths(parseISO(`${mes}-01`), delta), 'yyyy-MM'))
  }

  const rotuloMes = (() => {
    const texto = format(parseISO(`${mes}-01`), "MMMM 'de' yyyy", { locale: ptBR })
    return texto.charAt(0).toUpperCase() + texto.slice(1)
  })()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <AddMovimento />

      <div className="flex items-center justify-between">
        <IconButton onClick={() => mudarMes(-1)} aria-label="Mês anterior">
          <IconSetaEsquerda width={18} height={18} />
        </IconButton>
        <h2 className="text-[15px] font-semibold">{rotuloMes}</h2>
        <IconButton onClick={() => mudarMes(1)} aria-label="Próximo mês">
          <IconSetaEsquerda width={18} height={18} className="rotate-180" />
        </IconButton>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-line p-3">
          <p className="text-[12px] text-muted">Entradas</p>
          <p className="truncate text-[15px] font-semibold text-accent">
            {formatarBRL(entradas)}
          </p>
        </div>
        <div className="rounded-lg border border-line p-3">
          <p className="text-[12px] text-muted">Saídas</p>
          <p className="truncate text-[15px] font-semibold text-danger">
            {formatarBRL(saidas)}
          </p>
        </div>
        <div className="rounded-lg border border-line p-3">
          <p className="text-[12px] text-muted">Saldo</p>
          <p
            className={`truncate text-[15px] font-semibold ${
              saldo < 0 ? 'text-danger' : ''
            }`}
          >
            {formatarBRL(saldo)}
          </p>
        </div>
      </div>

      {movimentos && doMes.length === 0 && (
        <EmptyState
          icone={<IconCifrao />}
          titulo="Nenhum movimento neste mês"
          descricao="Registre entradas e saídas para acompanhar o resumo mensal."
        />
      )}

      <div className="flex flex-col gap-4">
        {grupos.map(([dia, itens]) => (
          <section key={dia}>
            <h3 className="mb-1 px-1 text-[13px] font-medium text-muted">
              {rotuloData(dia)}
            </h3>
            <ul className="flex flex-col">
              {itens.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => setSelecionado(m)}
                    className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-lg px-2 text-left transition-colors hover:bg-hover"
                  >
                    <span className="min-w-0 flex-1 py-2">
                      <span className="block truncate text-[15px]">{m.descricao}</span>
                      {m.categoria && (
                        <span className="block text-[12px] text-muted">{m.categoria}</span>
                      )}
                    </span>
                    <span
                      className={`shrink-0 text-[15px] font-semibold ${
                        m.tipo === 'entrada' ? 'text-accent' : 'text-danger'
                      }`}
                    >
                      {m.tipo === 'entrada' ? '+' : '−'} {formatarBRL(m.valorCentavos)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <MovimentoEditorSheet movimento={selecionado} onFechar={() => setSelecionado(null)} />
    </div>
  )
}
