import { useMemo, useState } from 'react'
import { addMonths, format, parseISO } from 'date-fns'
import { IconButton } from '../../../core/components/Button'
import { IconMais, IconSetaEsquerda } from '../../../core/components/Icons'
import { DIAS_SEMANA, hojeISO, rotuloData, rotuloMes, semanasDoMes } from '../../../core/dates'
import { CartaoRegistro } from '../components/CartaoRegistro'
import { humorDe, mediaNivel, registrosDoDia } from '../humor'
import type { Fator, HumorTipo, NivelHumor, Registro } from '../types'

interface Props {
  registros: Registro[]
  humorTipos: HumorTipo[]
  fatores: Map<string, Fator>
  onAbrirRegistro: (r: Registro) => void
  onNovoNoDia: (data: string) => void
}

export function Calendario({ registros, humorTipos, fatores, onAbrirRegistro, onNovoNoDia }: Props) {
  const [mes, setMes] = useState(() => format(new Date(), 'yyyy-MM'))
  const [diaSel, setDiaSel] = useState<string | null>(null)
  const hoje = hojeISO()

  // média + contagem por dia
  const porDia = useMemo(() => {
    const m = new Map<string, { media: number; n: number }>()
    const grupos = new Map<string, Registro[]>()
    for (const r of registros) {
      if (!grupos.has(r.data)) grupos.set(r.data, [])
      grupos.get(r.data)!.push(r)
    }
    for (const [dia, lista] of grupos) m.set(dia, { media: mediaNivel(lista), n: lista.length })
    return m
  }, [registros])

  const semanas = useMemo(() => semanasDoMes(mes), [mes])
  function mudarMes(d: number) {
    setMes(format(addMonths(parseISO(`${mes}-01`), d), 'yyyy-MM'))
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 py-2">
      <div className="flex items-center justify-between">
        <IconButton onClick={() => mudarMes(-1)} aria-label="Mês anterior">
          <IconSetaEsquerda width={18} height={18} />
        </IconButton>
        <h2 className="text-[15px] font-semibold">{rotuloMes(mes)}</h2>
        <IconButton onClick={() => mudarMes(1)} aria-label="Próximo mês">
          <IconSetaEsquerda width={18} height={18} className="rotate-180" />
        </IconButton>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {DIAS_SEMANA.map((d, i) => (
          <span key={i} className="pb-0.5 text-center text-[10px] font-medium text-muted/70">
            {d}
          </span>
        ))}
        {semanas.flat().map((dia, i) => {
          if (!dia) return <span key={i} />
          const info = porDia.get(dia)
          const tipo = info ? humorDe(humorTipos, Math.round(info.media) as NivelHumor) : null
          const ehHoje = dia === hoje
          const futuro = dia > hoje
          const numero = Number(dia.slice(-2))
          return (
            <button
              key={i}
              onClick={() => setDiaSel(dia)}
              disabled={futuro}
              aria-label={`${dia}${tipo ? ` — ${tipo.nome}` : ''}`}
              className={`relative flex aspect-square items-center justify-center rounded-xl text-[12px] transition-all ${
                futuro ? 'cursor-default text-muted/25' : 'cursor-pointer'
              } ${tipo ? 'font-semibold text-white' : !futuro ? 'bg-hover/60 text-muted hover:bg-hover' : ''} ${
                ehHoje && !tipo ? 'ring-2 ring-accent ring-inset text-ink' : ''
              }`}
              style={tipo ? { backgroundColor: tipo.cor } : undefined}
            >
              {numero}
              {info && info.n > 1 && (
                <span className="absolute right-1 bottom-1 flex h-1.5 w-1.5 items-center justify-center rounded-full bg-white/80" />
              )}
              {ehHoje && tipo && (
                <span className="absolute inset-0 rounded-xl ring-2 ring-ink/40 ring-inset" />
              )}
            </button>
          )
        })}
      </div>

      {diaSel && (
        <FolhaDia
          data={diaSel}
          registros={registrosDoDia(registros, diaSel)}
          humorTipos={humorTipos}
          fatores={fatores}
          futuro={diaSel > hoje}
          onFechar={() => setDiaSel(null)}
          onAbrirRegistro={(r) => {
            setDiaSel(null)
            onAbrirRegistro(r)
          }}
          onNovo={() => {
            const d = diaSel
            setDiaSel(null)
            onNovoNoDia(d)
          }}
        />
      )}
    </div>
  )
}

function FolhaDia({
  data,
  registros,
  humorTipos,
  fatores,
  futuro,
  onFechar,
  onAbrirRegistro,
  onNovo,
}: {
  data: string
  registros: Registro[]
  humorTipos: HumorTipo[]
  fatores: Map<string, Fator>
  futuro: boolean
  onFechar: () => void
  onAbrirRegistro: (r: Registro) => void
  onNovo: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onFechar} />
      <div className="animar-passo relative max-h-[80%] overflow-y-auto rounded-t-3xl bg-bg px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
        <div className="mx-auto flex w-full max-w-md flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold">
              {data === hojeISO() ? 'Hoje' : rotuloData(data)}
            </h3>
            {!futuro && (
              <button
                onClick={onNovo}
                className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full bg-ink px-3 text-[13px] font-semibold text-bg"
              >
                <IconMais width={16} height={16} />
                Registrar
              </button>
            )}
          </div>
          {registros.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted">
              {futuro ? 'Dia futuro.' : 'Nenhum registro neste dia.'}
            </p>
          ) : (
            registros.map((r) => (
              <CartaoRegistro
                key={r.id}
                registro={r}
                humorTipos={humorTipos}
                fatores={fatores}
                onAbrir={onAbrirRegistro}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
