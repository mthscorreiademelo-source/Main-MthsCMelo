import { useMemo } from 'react'
import { getDay, parseISO } from 'date-fns'
import { IconEngrenagem } from '../../../core/components/Icons'
import { dataPorExtenso, hojeISO } from '../../../core/dates'
import { GraficoRecente } from '../components/GraficoRecente'
import { RostoHumor } from '../components/RostoHumor'
import {
  humorDe,
  mediaNivel,
  registrosDoDia,
  streakRegistros,
} from '../humor'
import type { HumorTipo, Registro } from '../types'

const DIAS_NOME = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

export function Hoje({
  registros,
  humorTipos,
  onNovo,
  onAjustes,
}: {
  registros: Registro[]
  humorTipos: HumorTipo[]
  onNovo: () => void
  onAjustes: () => void
}) {
  const hoje = hojeISO()
  const doDia = useMemo(() => registrosDoDia(registros, hoje), [registros, hoje])
  const streak = useMemo(() => streakRegistros(registros), [registros])
  const mediaHoje = mediaNivel(doDia)
  const tipoHoje = doDia.length ? humorDe(humorTipos, Math.round(mediaHoje) as HumorTipo['nivel']) : null

  // melhor dia da semana (insight simples)
  const insight = useMemo(() => calcularMelhorDia(registros), [registros])

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 py-2">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{dataPorExtenso()}</h1>
          <p className="mt-0.5 text-[14px] text-muted">Como está o seu dia?</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {streak > 0 && (
            <span className="rounded-full bg-hover px-3 py-1.5 text-[13px] font-semibold text-muted">
              🔥 {streak} {streak === 1 ? 'dia' : 'dias'}
            </span>
          )}
          <button
            onClick={onAjustes}
            aria-label="Personalizar humores e fatores"
            className="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-hover hover:text-ink"
          >
            <IconEngrenagem width={19} height={19} />
          </button>
        </div>
      </div>

      {/* Humor de hoje / CTA */}
      {tipoHoje ? (
        <button
          onClick={onNovo}
          className="flex cursor-pointer items-center gap-4 rounded-3xl border border-line p-5 text-left transition-colors hover:border-muted/40"
          style={{ backgroundColor: `${tipoHoje.cor}12` }}
        >
          <span
            className="flex size-20 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: `${tipoHoje.cor}26` }}
          >
            <RostoHumor nivel={tipoHoje.nivel} width={48} height={48} style={{ color: tipoHoje.cor }} />
          </span>
          <span>
            <span className="block text-[13px] text-muted">
              {doDia.length === 1 ? 'Seu humor hoje' : `Média de ${doDia.length} registros`}
            </span>
            <span className="block text-xl font-bold">{tipoHoje.nome}</span>
            <span className="mt-1 block text-[13px] text-muted">Toque para registrar mais</span>
          </span>
        </button>
      ) : (
        <button
          onClick={onNovo}
          className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line px-5 py-8 text-center transition-colors hover:border-muted/50"
        >
          <span className="flex -space-x-1">
            {humorTipos.map((t) => (
              <span
                key={t.nivel}
                className="flex size-9 items-center justify-center rounded-full ring-2 ring-bg"
                style={{ backgroundColor: `${t.cor}26` }}
              >
                <RostoHumor nivel={t.nivel} width={20} height={20} style={{ color: t.cor }} />
              </span>
            ))}
          </span>
          <span className="text-[15px] font-semibold">Como você está agora?</span>
          <span className="text-[13px] text-muted">Toque para fazer seu primeiro registro do dia</span>
        </button>
      )}

      {/* Gráfico recente */}
      {registros.length > 0 && (
        <section className="flex flex-col gap-3 rounded-3xl border border-line p-5">
          <h2 className="text-[13px] font-medium text-muted">Últimos 14 dias</h2>
          <GraficoRecente registros={registros} humorTipos={humorTipos} />
        </section>
      )}

      {/* Insight */}
      {insight && (
        <section className="flex items-start gap-3 rounded-3xl border border-line p-5">
          <span className="mt-0.5 text-lg">✦</span>
          <p className="text-[14px] leading-relaxed">{insight}</p>
        </section>
      )}
    </div>
  )
}

function calcularMelhorDia(registros: Registro[]): string | null {
  if (registros.length < 5) return null
  const soma = Array(7).fill(0)
  const cont = Array(7).fill(0)
  for (const r of registros) {
    const d = getDay(parseISO(r.data))
    soma[d] += r.nivel
    cont[d] += 1
  }
  let melhor = -1
  let melhorMedia = 0
  for (let d = 0; d < 7; d++) {
    if (cont[d] === 0) continue
    const m = soma[d] / cont[d]
    if (m > melhorMedia) {
      melhorMedia = m
      melhor = d
    }
  }
  if (melhor < 0) return null
  return `Você costuma se sentir melhor às ${DIAS_NOME[melhor]}s.`
}
