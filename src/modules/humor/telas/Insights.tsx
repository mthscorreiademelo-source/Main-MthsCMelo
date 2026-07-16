import { useMemo } from 'react'
import { EmptyState } from '../../../core/components/EmptyState'
import { IconHumor } from '../../../core/components/Icons'
import { IconeFator } from '../../../core/components/icones'
import { correlacaoSeries, impactoDeFator } from '../../../core/insights/engine'
import { useSinaisSaude } from '../../saude/sinais'
import { extremosDiaSemana, impactoDosFatores, serieHumorDiaria, tendenciaHumor } from '../insights'
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

export function Insights({ registros, fatores }: { registros: Registro[]; fatores: Fator[] }) {
  const impactos = useMemo(() => impactoDosFatores(registros, fatores), [registros, fatores])
  const extremos = useMemo(() => extremosDiaSemana(registros), [registros])
  const inclin = useMemo(() => tendenciaHumor(registros), [registros])
  const diasRegistrados = useMemo(() => diasComRegistro(registros).size, [registros])
  const humorSerie = useMemo(() => serieHumorDiaria(registros), [registros])

  // cruzamento com Saúde (sono, passos, exercício, FC…)
  const { sinais, fatores: fatoresSaude } = useSinaisSaude()
  const correlacoes = useMemo(
    () =>
      sinais
        .map((s) => ({ s, c: correlacaoSeries(humorSerie, s.serie) }))
        .filter((x) => x.c && x.c.n >= 5 && Math.abs(x.c.r) >= 0.25)
        .sort((a, b) => Math.abs(b.c!.r) - Math.abs(a.c!.r)),
    [sinais, humorSerie],
  )
  const impactosSaude = useMemo(
    () =>
      fatoresSaude
        .map((f) => ({ f, imp: impactoDeFator(humorSerie, f.dias) }))
        .filter((x) => x.imp && x.imp.nCom >= 3 && x.imp.nSem >= 3 && Math.abs(x.imp.delta) >= 0.15)
        .sort((a, b) => b.imp!.delta - a.imp!.delta),
    [fatoresSaude, humorSerie],
  )
  const temSaude = correlacoes.length > 0 || impactosSaude.length > 0

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
  const negativos = impactos.filter((i) => i.impacto.delta <= -0.15).slice(-5).reverse()
  const maxAbs = Math.max(
    0.5,
    ...[...positivos, ...negativos].map((i) => Math.abs(i.impacto.delta)),
    ...impactosSaude.map((i) => Math.abs(i.imp!.delta)),
  )

  const tendTexto =
    inclin > 0.03
      ? 'Seu humor vem melhorando no período. Continue assim. ✦'
      : inclin < -0.03
        ? 'Seu humor vem caindo um pouco. Vale um olhar carinhoso para você. ✦'
        : 'Seu humor está estável no período.'

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 py-2">
      {/* Saúde × humor — a inteligência entre módulos */}
      {temSaude && (
        <Cartao titulo="Saúde e humor">
          {correlacoes.map(({ s, c }) => (
            <p key={s.chave} className="text-[14px] leading-snug">
              Seu humor tende a ser <strong>melhor</strong> nos dias com{' '}
              <strong>{c!.r >= 0 ? 'mais' : 'menos'} {s.rotulo.toLowerCase()}</strong>.
            </p>
          ))}
          {impactosSaude.map(({ f, imp }) => (
            <BarraImpacto
              key={f.chave}
              nome={f.rotulo}
              icone={f.icone ?? 'folha'}
              delta={imp!.delta}
              max={maxAbs}
              cor={imp!.delta >= 0 ? COR_POS : COR_NEG}
            />
          ))}
        </Cartao>
      )}

      {positivos.length > 0 && (
        <Cartao titulo="O que eleva seu humor">
          {positivos.map((i) => (
            <BarraImpacto key={i.fator.id} nome={i.fator.nome} icone={i.fator.icone} delta={i.impacto.delta} max={maxAbs} cor={COR_POS} />
          ))}
        </Cartao>
      )}

      {negativos.length > 0 && (
        <Cartao titulo="O que costuma derrubar">
          {negativos.map((i) => (
            <BarraImpacto key={i.fator.id} nome={i.fator.nome} icone={i.fator.icone} delta={i.impacto.delta} max={maxAbs} cor={COR_NEG} />
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
            <p className="text-[14px] text-muted">E um pouco pior {DIAS_LONGO[extremos.pior.dia]}.</p>
          )}
        </Cartao>
      )}

      <Cartao titulo="Tendência">
        <p className="text-[14px]">{tendTexto}</p>
      </Cartao>

      {!temSaude && (
        <div className="flex items-start gap-3 rounded-2xl border border-dashed border-line p-4">
          <span className="mt-0.5 text-lg">🔗</span>
          <p className="text-[13px] leading-relaxed text-muted">
            Registre ou importe dados em <strong>Saúde</strong> (sono, passos, exercício) e o Lume
            cruza tudo com seu humor aqui — como "você se sente melhor quando dorme mais de 7 horas".
          </p>
        </div>
      )}
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
  nome,
  icone,
  delta,
  max,
  cor,
}: {
  nome: string
  icone: string
  delta: number
  max: number
  cor: string
}) {
  const largura = Math.min(100, (Math.abs(delta) / max) * 100)
  const sinal = delta > 0 ? '+' : '−'
  return (
    <div className="flex items-center gap-3">
      <span className="flex w-32 shrink-0 items-center gap-1.5 text-[13.5px]">
        <IconeFator nome={icone} width={15} height={15} className="text-muted" />
        <span className="truncate">{nome}</span>
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
