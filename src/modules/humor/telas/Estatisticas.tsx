import { useMemo, useState } from 'react'
import { EmptyState } from '../../../core/components/EmptyState'
import { IconHumor } from '../../../core/components/Icons'
import { hojeISO } from '../../../core/dates'
import { IconeFator } from '../components/icones'
import { RostoHumor } from '../components/RostoHumor'
import { contagemPorNivel, humorDe, mediaNivel, streakRegistros } from '../humor'
import { fatoresMaisUsados, humorPorDiaSemana } from '../insights'
import type { Fator, HumorTipo, NivelHumor, Registro } from '../types'

const DIAS_CURTO = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export function Estatisticas({
  registros,
  humorTipos,
  fatores,
}: {
  registros: Registro[]
  humorTipos: HumorTipo[]
  fatores: Map<string, Fator>
}) {
  const [periodo, setPeriodo] = useState<'mes' | 'tudo'>('tudo')
  const mes = hojeISO().slice(0, 7)

  const lista = useMemo(
    () => (periodo === 'mes' ? registros.filter((r) => r.data.startsWith(`${mes}-`)) : registros),
    [registros, periodo, mes],
  )

  const media = mediaNivel(lista)
  const contagem = useMemo(() => contagemPorNivel(lista), [lista])
  const streak = useMemo(() => streakRegistros(registros), [registros])
  const porSemana = useMemo(() => humorPorDiaSemana(lista), [lista])
  const topFatores = useMemo(() => fatoresMaisUsados(lista, fatores), [lista, fatores])
  const tipoMedia = media ? humorDe(humorTipos, Math.round(media) as NivelHumor) : null

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 py-2">
      {/* Seletor de período */}
      <div className="flex gap-1 self-start rounded-full border border-line p-1 text-[13px]">
        {(['mes', 'tudo'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className={`min-h-8 cursor-pointer rounded-full px-3 font-medium transition-colors ${
              periodo === p ? 'bg-ink text-bg' : 'text-muted hover:text-ink'
            }`}
          >
            {p === 'mes' ? 'Este mês' : 'Tudo'}
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <div className="py-10">
          <EmptyState
            icone={<IconHumor />}
            titulo="Sem dados no período"
            descricao="Registre seu humor para ver suas estatísticas aqui."
          />
        </div>
      ) : (
        <>
          {/* Tiles */}
          <div className="grid grid-cols-3 gap-3">
            <Tile valor={media.toFixed(1)} rotulo={tipoMedia?.nome ?? 'Média'} cor={tipoMedia?.cor} />
            <Tile valor={String(lista.length)} rotulo={lista.length === 1 ? 'registro' : 'registros'} />
            <Tile valor={`🔥 ${streak}`} rotulo={streak === 1 ? 'dia seguido' : 'dias seguidos'} />
          </div>

          {/* Distribuição */}
          <section className="flex flex-col gap-3 rounded-3xl border border-line p-5">
            <h2 className="text-[13px] font-medium text-muted">Distribuição</h2>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-hover">
              {humorTipos.map((t) => {
                const qtd = contagem[t.nivel - 1]
                if (!qtd) return null
                return (
                  <span
                    key={t.nivel}
                    style={{ backgroundColor: t.cor, width: `${(qtd / lista.length) * 100}%` }}
                  />
                )
              })}
            </div>
            <div className="flex flex-col gap-1.5">
              {humorTipos.map((t) => (
                <div key={t.nivel} className="flex items-center gap-2 text-[13px]">
                  <RostoHumor nivel={t.nivel} width={16} height={16} style={{ color: t.cor }} />
                  <span className="flex-1 text-muted">{t.nome}</span>
                  <span className="font-semibold tabular-nums">{contagem[t.nivel - 1]}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Por dia da semana */}
          <section className="flex flex-col gap-3 rounded-3xl border border-line p-5">
            <h2 className="text-[13px] font-medium text-muted">Humor por dia da semana</h2>
            <div className="flex h-32 items-stretch gap-2">
              {porSemana.map((m, i) => {
                const tipo = m.n ? humorDe(humorTipos, Math.round(m.media) as NivelHumor) : null
                const altura = m.n ? 15 + ((m.media - 1) / 4) * 85 : 4
                return (
                  <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                    <div
                      className="w-full rounded-md transition-all"
                      style={{
                        height: `${altura}%`,
                        backgroundColor: tipo?.cor ?? 'var(--vida-line)',
                        opacity: tipo ? 1 : 0.5,
                      }}
                    />
                    <span className="text-[10px] text-muted">{DIAS_CURTO[i]}</span>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Fatores mais usados */}
          {topFatores.length > 0 && (
            <section className="flex flex-col gap-3 rounded-3xl border border-line p-5">
              <h2 className="text-[13px] font-medium text-muted">Fatores mais frequentes</h2>
              <div className="flex flex-wrap gap-2">
                {topFatores.map(({ fator, n }) => (
                  <span
                    key={fator.id}
                    className="flex items-center gap-1.5 rounded-full bg-hover px-3 py-1.5 text-[13px]"
                  >
                    <IconeFator nome={fator.icone} width={14} height={14} className="text-muted" />
                    {fator.nome}
                    <span className="font-semibold text-muted">{n}</span>
                  </span>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function Tile({ valor, rotulo, cor }: { valor: string; rotulo: string; cor?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 rounded-2xl border border-line p-4 text-center">
      <span className="text-xl font-bold" style={cor ? { color: cor } : undefined}>
        {valor}
      </span>
      <span className="text-[12px] text-muted">{rotulo}</span>
    </div>
  )
}
