import { useMemo } from 'react'
import { EmptyState } from '../../../core/components/EmptyState'
import { IconHumor } from '../../../core/components/Icons'
import { IconeFator } from '../components/icones'
import { extremosDiaSemana, impactoDosFatores, tendenciaHumor } from '../insights'
import { diasComRegistro } from '../humor'
import type { Fator, Registro } from '../types'

const DIAS_LONGO = [
  'aos domingos',
  'às segundas',
  'às terças',
  'às quartas',
  'às quintas',
  'às sextas',
  'aos sábados',
]
const COR_POS = '#5b9c86'
const COR_NEG = '#c46a5e'

export function Insights({
  registros,
  fatores,
}: {
  registros: Registro[]
  fatores: Fator[]
}) {
  const impactos = useMemo(() => impactoDosFatores(registros, fatores), [registros, fatores])
  const extremos = useMemo(() => extremosDiaSemana(registros), [registros])
  const inclin = useMemo(() => tendenciaHumor(registros), [registros])
  const diasRegistrados = useMemo(() => diasComRegistro(registros).size, [registros])

  if (diasRegistrados < 4) {
    return (
      <div className="py-10">
        <EmptyState
          icone={<IconHumor />}
          titulo="Ainda reunindo padrões"
          descricao="Registre seu humor por alguns dias e o Lume começa a revelar o que afeta como você se sente."
        />
      </div>
    )
  }

  const positivos = impactos.filter((i) => i.impacto.delta >= 0.15).slice(0, 5)
  const negativos = impactos
    .filter((i) => i.impacto.delta <= -0.15)
    .slice(-5)
    .reverse()
  const maxAbs = Math.max(
    0.5,
    ...[...positivos, ...negativos].map((i) => Math.abs(i.impacto.delta)),
  )

  const tendTexto =
    inclin > 0.03
      ? 'Seu humor vem melhorando no período. Continue assim. ✦'
      : inclin < -0.03
        ? 'Seu humor vem caindo um pouco. Vale um olhar carinhoso para você. ✦'
        : 'Seu humor está estável no período.'

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 py-2">
      {positivos.length > 0 && (
        <Cartao titulo="O que eleva seu humor">
          {positivos.map((i) => (
            <BarraImpacto key={i.fator.id} fator={i.fator} delta={i.impacto.delta} max={maxAbs} cor={COR_POS} />
          ))}
        </Cartao>
      )}

      {negativos.length > 0 && (
        <Cartao titulo="O que costuma derrubar">
          {negativos.map((i) => (
            <BarraImpacto key={i.fator.id} fator={i.fator} delta={i.impacto.delta} max={maxAbs} cor={COR_NEG} />
          ))}
        </Cartao>
      )}

      {(extremos.melhor || extremos.pior) && (
        <Cartao titulo="Seus dias da semana">
          {extremos.melhor && (
            <p className="text-[14px]">
              Você tende a se sentir <strong>melhor {DIAS_LONGO[extremos.melhor.dia]}</strong>.
            </p>
          )}
          {extremos.pior && extremos.pior.dia !== extremos.melhor?.dia && (
            <p className="text-[14px] text-muted">
              E um pouco pior {DIAS_LONGO[extremos.pior.dia]}.
            </p>
          )}
        </Cartao>
      )}

      <Cartao titulo="Tendência">
        <p className="text-[14px]">{tendTexto}</p>
      </Cartao>

      {/* Ponte para a visão integrada */}
      <div className="flex items-start gap-3 rounded-2xl border border-dashed border-line p-4">
        <span className="mt-0.5 text-lg">🔗</span>
        <p className="text-[13px] leading-relaxed text-muted">
          Quando você adicionar <strong>Sono</strong>, <strong>Exercícios</strong> e{' '}
          <strong>Finanças</strong>, o Lume cruza tudo isso com seu humor automaticamente — como
          "você se sente melhor quando dorme mais de 7 horas".
        </p>
      </div>
    </div>
  )
}

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-line p-5">
      <h2 className="text-[13px] font-medium text-muted">{titulo}</h2>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  )
}

function BarraImpacto({
  fator,
  delta,
  max,
  cor,
}: {
  fator: Fator
  delta: number
  max: number
  cor: string
}) {
  const largura = Math.min(100, (Math.abs(delta) / max) * 100)
  const sinal = delta > 0 ? '+' : '−'
  return (
    <div className="flex items-center gap-3">
      <span className="flex w-32 shrink-0 items-center gap-1.5 text-[13.5px]">
        <IconeFator nome={fator.icone} width={15} height={15} className="text-muted" />
        <span className="truncate">{fator.nome}</span>
      </span>
      <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-hover">
        <span
          className="block h-full rounded-full transition-all"
          style={{ width: `${largura}%`, backgroundColor: cor }}
        />
      </span>
      <span className="w-10 shrink-0 text-right text-[12.5px] font-semibold tabular-nums" style={{ color: cor }}>
        {sinal}
        {Math.abs(delta).toFixed(1)}
      </span>
    </div>
  )
}
