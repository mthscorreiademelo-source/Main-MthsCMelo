import { useEffect, useMemo, useState } from 'react'
import { addMonths, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FolhaInferior } from '../../core/components/FolhaInferior'
import { IconEngrenagem, IconMais, IconSeta, IconSetaEsquerda } from '../../core/components/Icons'
import { hojeISO, rotuloData } from '../../core/dates'
import { AnelProgresso } from '../habitos/components/AnelProgresso'
import { useEventos } from '../agenda/hooks'
import { AddMovimento } from './components/AddMovimento'
import { AjustesFinancas } from './components/AjustesFinancas'
import { GraficoEvolucao, Sparkline } from './components/Graficos'
import { MovimentoEditorSheet } from './components/MovimentoEditorSheet'
import { agruparPorDia, filtrarMes, formatarBRL, registrarSnapshot, semearFinancasSePreciso } from './db'
import {
  useContas,
  useFinancasConfig,
  useMovimentos,
  useObjetivos,
  useOrcamentoLinhas,
  useRecorrentes,
  useSnapshots,
} from './hooks'
import {
  distribuicao,
  gerarInsights,
  mesDe,
  orcamentoInteligente,
  patrimonioLiquido,
  reservaDeEmergencia,
  serieEvolucao,
} from './orcamento'
import type { Movimento } from './types'

/* -------------------------------- helpers --------------------------------- */

function reaisPartes(centavos: number): [string, string] {
  const s = formatarBRL(Math.round(centavos))
  const i = s.lastIndexOf(',')
  return i >= 0 ? [s.slice(0, i), s.slice(i + 1)] : [s, '00']
}
function brlCurto(centavos: number): string {
  const v = centavos / 100
  if (Math.abs(v) >= 1000) return `R$ ${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`
  return `R$ ${v.toFixed(0)}`
}
function horaDe(ts: number): string {
  return format(new Date(ts), 'HH:mm')
}

const ROTULO = 'text-[11px] font-semibold uppercase tracking-wide text-muted'
const CARTAO = 'rounded-2xl border border-line bg-surface/50 p-4'

/* -------------------------------- página ---------------------------------- */

export function FinancasPage() {
  const movimentos = useMovimentos()
  const contas = useContas()
  const objetivos = useObjetivos()
  const recorrentes = useRecorrentes()
  const linhas = useOrcamentoLinhas()
  const config = useFinancasConfig()
  const snapshots = useSnapshots()
  const eventos = useEventos()

  const [mes, setMes] = useState(() => format(new Date(), 'yyyy-MM'))
  const [selecionado, setSelecionado] = useState<Movimento | null>(null)
  const [sheet, setSheet] = useState<'ajustes' | 'transacoes' | null>(null)
  const [addAberto, setAddAberto] = useState(false)

  const hoje = hojeISO()
  const mesHoje = mesDe(hoje)

  // Semeia o exemplo na primeira visita.
  useEffect(() => {
    semearFinancasSePreciso()
  }, [])

  const patrimonio = useMemo(() => patrimonioLiquido(contas ?? []), [contas])

  // Registra o snapshot do mês corrente sempre que o patrimônio muda.
  useEffect(() => {
    if (contas && contas.length > 0) registrarSnapshot(mesHoje, patrimonio)
  }, [contas, patrimonio, mesHoje])

  const pronto = movimentos && contas && objetivos && recorrentes && linhas && snapshots

  const orc = useMemo(
    () =>
      orcamentoInteligente({
        hoje,
        movimentos: movimentos ?? [],
        recorrentes: recorrentes ?? [],
        objetivos: objetivos ?? [],
        eventos: eventos ?? [],
        config,
      }),
    [hoje, movimentos, recorrentes, objetivos, eventos, config],
  )

  const dist = useMemo(() => distribuicao(linhas ?? [], movimentos ?? [], mes), [linhas, movimentos, mes])
  const reserva = useMemo(() => reservaDeEmergencia(objetivos ?? []), [objetivos])
  const serie = useMemo(
    () => serieEvolucao(snapshots ?? [], mesHoje, patrimonio, 6),
    [snapshots, mesHoje, patrimonio],
  )
  const varMes = useMemo(() => {
    if (serie.length < 2) return 0
    const ant = serie[serie.length - 2].valor
    return ant ? ((serie[serie.length - 1].valor - ant) / ant) * 100 : 0
  }, [serie])
  const insights = useMemo(
    () =>
      gerarInsights({
        mes: mesHoje,
        movimentos: movimentos ?? [],
        linhas: linhas ?? [],
        snapshots: snapshots ?? [],
        patrimonioAtual: patrimonio,
        orc,
        formatar: formatarBRL,
      }),
    [mesHoje, movimentos, linhas, snapshots, patrimonio, orc],
  )

  const gastosHoje = useMemo(
    () =>
      (movimentos ?? [])
        .filter((m) => m.data === hoje && m.tipo === 'saida')
        .sort((a, b) => a.criadoEm - b.criadoEm),
    [movimentos, hoje],
  )
  const ultimas = useMemo(
    () => [...(movimentos ?? [])].sort((a, b) => b.criadoEm - a.criadoEm).slice(0, 5),
    [movimentos],
  )
  const objetivosVis = (objetivos ?? []).slice(0, 3)

  const rotuloMes = (() => {
    const t = format(parseISO(`${mes}-01`), "MMMM 'de' yyyy", { locale: ptBR })
    return t.charAt(0).toUpperCase() + t.slice(1)
  })()

  const [heroI, heroC] = reaisPartes(Math.max(0, orc.disponivelHoje))
  const restanteHoje = Math.max(0, orc.orcamentoDiario - orc.gastoHoje)
  const usadoFrac = orc.orcamentoDiario > 0 ? Math.min(1, orc.gastoHoje / orc.orcamentoDiario) : 0
  const pctRestante = orc.orcamentoDiario > 0 ? Math.round((restanteHoje / orc.orcamentoDiario) * 100) : 0
  const contexto =
    orc.disponivelHoje >= 0
      ? `Você ainda tem ${pctRestante}% do orçamento de hoje.`
      : `Você passou ${formatarBRL(-Math.round(orc.disponivelHoje))} do orçamento de hoje.`

  if (!pronto) {
    return <div className="mx-auto max-w-5xl p-6 text-[14px] text-muted">Carregando…</div>
  }

  const reservaFrac = reserva && reserva.alvoCentavos > 0 ? reserva.atualCentavos / reserva.alvoCentavos : 0

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-[22px] font-bold">Finanças</h1>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-full bg-hover px-1 py-0.5">
            <button onClick={() => setMes(format(addMonths(parseISO(`${mes}-01`), -1), 'yyyy-MM'))} aria-label="Mês anterior" className="flex size-7 items-center justify-center rounded-full text-muted hover:text-ink">
              <IconSetaEsquerda width={15} height={15} />
            </button>
            <span className="min-w-28 text-center text-[13px] font-medium">{rotuloMes}</span>
            <button onClick={() => setMes(format(addMonths(parseISO(`${mes}-01`), 1), 'yyyy-MM'))} aria-label="Próximo mês" className="flex size-7 items-center justify-center rounded-full text-muted hover:text-ink">
              <IconSetaEsquerda width={15} height={15} className="rotate-180" />
            </button>
          </div>
          <button onClick={() => setAddAberto((v) => !v)} className="flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[14px] font-medium text-surface">
            <IconMais width={16} height={16} /> Registrar
          </button>
          <button onClick={() => setSheet('ajustes')} aria-label="Ajustes de Finanças" className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink">
            <IconEngrenagem width={18} height={18} />
          </button>
        </div>
      </div>

      {addAberto && <AddMovimento />}

      {/* 1+2. Disponível hoje + Orçamento diário */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-line bg-surface/50 p-5 md:grid-cols-2">
        <div className="flex flex-col justify-center md:border-r md:border-line md:pr-5">
          <div className="flex items-center gap-2">
            <span className={ROTULO}>Disponível para gastar</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase text-accent">Hoje</span>
          </div>
          <div className="mt-1 flex items-baseline gap-0.5">
            <span className={`text-[46px] font-bold leading-none ${orc.disponivelHoje < 0 ? 'text-danger' : 'text-accent'}`}>{heroI}</span>
            <span className={`text-[22px] font-bold ${orc.disponivelHoje < 0 ? 'text-danger' : 'text-accent'}`}>,{heroC}</span>
          </div>
          <p className="mt-2 text-[13px] text-muted">{contexto}</p>
        </div>
        <div className="flex flex-col justify-center gap-3 md:pl-1">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-muted">Orçamento diário</span>
            <span className="font-semibold">{formatarBRL(orc.orcamentoDiario)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-hover">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${usadoFrac * 100}%`, backgroundColor: usadoFrac >= 1 ? 'var(--vida-danger)' : undefined }} />
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-muted">Gasto hoje</span>
            <span className="font-semibold">{formatarBRL(orc.gastoHoje)}</span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-muted">Restante</span>
            <span className="font-semibold text-accent">{formatarBRL(restanteHoje)}</span>
          </div>
        </div>
      </div>

      {/* 3+4. Patrimônio + Reserva */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className={CARTAO}>
          <span className={ROTULO}>Patrimônio líquido</span>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <div className="text-[26px] font-bold leading-none">{formatarBRL(patrimonio)}</div>
              <div className={`mt-1.5 flex items-center gap-1 text-[13px] font-medium ${varMes >= 0 ? 'text-accent' : 'text-danger'}`}>
                {varMes >= 0 ? '↑' : '↓'} {varMes >= 0 ? '+' : ''}{varMes.toFixed(1)}% este mês
              </div>
            </div>
            <Sparkline valores={serie.map((s) => s.valor)} />
          </div>
        </div>

        <div className={CARTAO}>
          <span className={ROTULO}>Reserva de emergência</span>
          {reserva ? (
            <div className="mt-2 flex items-center gap-4">
              <AnelProgresso fracao={reservaFrac} tamanho={72} espessura={7} cor={reserva.cor ?? 'var(--vida-accent)'}>
                <span className="text-[15px] font-bold">{Math.round(reservaFrac * 100)}%</span>
              </AnelProgresso>
              <div className="min-w-0">
                <div className="text-[20px] font-bold leading-none">{formatarBRL(reserva.atualCentavos)}</div>
                <div className="text-[12px] text-muted">de {formatarBRL(reserva.alvoCentavos)}</div>
                {reservaFrac >= 1 ? (
                  <div className="mt-1 text-[13px] font-medium text-accent">🎉 Reserva completa!</div>
                ) : (
                  <div className="mt-1 text-[13px] font-medium text-accent">Faltam {formatarBRL(reserva.alvoCentavos - reserva.atualCentavos)}</div>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-muted">Defina sua reserva de emergência nos ajustes.</p>
          )}
        </div>
      </div>

      {/* 5+6. Gastos de hoje + Distribuição */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className={CARTAO}>
          <span className={ROTULO}>Gastos de hoje</span>
          <ul className="mt-3 flex flex-col gap-2.5">
            {gastosHoje.length === 0 && <li className="text-[13px] text-muted">Nenhum gasto hoje. 🎉</li>}
            {gastosHoje.map((m) => (
              <li key={m.id}>
                <button onClick={() => setSelecionado(m)} className="flex w-full items-center gap-3 text-left">
                  <span className="flex size-9 items-center justify-center rounded-full bg-hover text-[15px]">{iconeCategoria(m.categoria)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{m.descricao}</span>
                    <span className="block text-[11px] text-muted">{m.categoria ?? 'Outros'} · {horaDe(m.criadoEm)}</span>
                  </span>
                  <span className="shrink-0 text-[14px] font-semibold">{formatarBRL(m.valorCentavos)}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <span className="text-[14px] font-semibold">Total hoje</span>
            <span className="text-[15px] font-bold">{formatarBRL(orc.gastoHoje)}</span>
          </div>
          <button onClick={() => setSheet('transacoes')} className="mt-3 flex w-full items-center justify-between rounded-xl bg-hover px-3 py-2.5 text-[13px] font-medium text-muted hover:text-ink">
            Ver todas as transações <IconSeta width={15} height={15} />
          </button>
        </div>

        <div className={CARTAO}>
          <span className={ROTULO}>Distribuição do orçamento</span>
          <div className="mt-3 flex flex-col gap-3">
            {dist.length === 0 && <p className="text-[13px] text-muted">Configure suas categorias nos ajustes.</p>}
            {dist.map(({ linha, gastoCentavos, pct }) => (
              <div key={linha.id}>
                <div className="flex items-center gap-2">
                  <span className="text-[13px]">{linha.icone}</span>
                  <span className="flex-1 truncate text-[13px] font-medium">{linha.nome}</span>
                  <span className="text-[12px] font-semibold text-muted">{Math.round(pct * 100)}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-hover">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct * 100)}%`, backgroundColor: pct > 1 ? 'var(--vida-danger)' : linha.cor }} />
                </div>
                <div className="mt-0.5 text-[10.5px] text-muted">{formatarBRL(gastoCentavos)} / {formatarBRL(linha.limiteCentavos)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7. Objetivos */}
      <div className={CARTAO}>
        <div className="mb-3 flex items-center justify-between">
          <span className={ROTULO}>Objetivos financeiros</span>
          <button onClick={() => setSheet('ajustes')} className="text-[12px] font-medium text-muted hover:text-ink">Ver todos</button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {objetivosVis.map((o) => {
            const frac = o.alvoCentavos > 0 ? o.atualCentavos / o.alvoCentavos : 0
            return (
              <div key={o.id} className="rounded-xl border border-line p-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-full text-[15px]" style={{ backgroundColor: `color-mix(in srgb, ${o.cor ?? '#7c9885'} 16%, transparent)` }}>{o.icone ?? '🎯'}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{o.nome}</span>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-[22px] font-bold leading-none">{Math.round(frac * 100)}</span>
                  <span className="text-[13px] font-semibold text-muted">%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-hover">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, frac * 100)}%`, backgroundColor: o.cor ?? '#7c9885' }} />
                </div>
                <div className="mt-1.5 text-[11px] text-muted">{formatarBRL(o.atualCentavos)} de {formatarBRL(o.alvoCentavos)}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 8+9. Evolução + Insight */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className={CARTAO}>
          <div className="mb-1 flex items-center justify-between">
            <span className={ROTULO}>Evolução patrimonial</span>
            <span className="text-[11px] text-muted">Últimos 6 meses</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[22px] font-bold">{formatarBRL(patrimonio)}</span>
            <span className={`text-[13px] font-semibold ${varMes >= 0 ? 'text-accent' : 'text-danger'}`}>{varMes >= 0 ? '+' : ''}{varMes.toFixed(1)}%</span>
          </div>
          <div className="mt-2">
            <GraficoEvolucao serie={serie} formatarCurto={brlCurto} />
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-accent/[0.06] p-4">
          <span className={ROTULO}>Insight do mês</span>
          <ul className="mt-3 flex flex-col gap-3">
            {insights.length === 0 && <li className="text-[13px] text-muted">Registre alguns gastos para o Lume gerar insights.</li>}
            {insights.map((ins) => (
              <li key={ins.id} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: tomBg(ins.tom) }}>{tomIcone(ins.tom)}</span>
                <span className="text-[13.5px] leading-snug">{ins.texto}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 10. Últimas transações */}
      <div className={CARTAO}>
        <div className="mb-3 flex items-center justify-between">
          <span className={ROTULO}>Últimas transações</span>
          <button onClick={() => setSheet('transacoes')} className="text-[12px] font-medium text-muted hover:text-ink">Ver todas</button>
        </div>
        <ul className="flex flex-col divide-y divide-line">
          {ultimas.map((m) => (
            <li key={m.id}>
              <button onClick={() => setSelecionado(m)} className="flex w-full items-center gap-3 py-2.5 text-left">
                <span className="flex size-9 items-center justify-center rounded-full bg-hover text-[15px]">{iconeCategoria(m.categoria)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{m.descricao}</span>
                  <span className="block text-[11px] text-muted">{m.categoria ?? 'Outros'} · {rotuloData(m.data)}</span>
                </span>
                <span className={`shrink-0 text-[14px] font-semibold ${m.tipo === 'entrada' ? 'text-accent' : ''}`}>
                  {m.tipo === 'entrada' ? '+ ' : '− '}{formatarBRL(m.valorCentavos)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {sheet === 'ajustes' && <AjustesFinancas onFechar={() => setSheet(null)} />}
      {sheet === 'transacoes' && (
        <TransacoesSheet mes={mes} rotuloMes={rotuloMes} movimentos={movimentos ?? []} onSelecionar={(m) => { setSheet(null); setSelecionado(m) }} onFechar={() => setSheet(null)} />
      )}
      <MovimentoEditorSheet movimento={selecionado} onFechar={() => setSelecionado(null)} />
    </div>
  )
}

/* ----------------------------- transações sheet --------------------------- */

function TransacoesSheet({
  mes,
  rotuloMes,
  movimentos,
  onSelecionar,
  onFechar,
}: {
  mes: string
  rotuloMes: string
  movimentos: Movimento[]
  onSelecionar: (m: Movimento) => void
  onFechar: () => void
}) {
  const grupos = useMemo(() => agruparPorDia(filtrarMes(movimentos, mes)), [movimentos, mes])
  return (
    <FolhaInferior titulo={`Transações · ${rotuloMes}`} onFechar={onFechar}>
      <div className="flex flex-col gap-4">
        {grupos.length === 0 && <p className="text-[13px] text-muted">Nenhuma transação neste mês.</p>}
        {grupos.map(([dia, itens]) => (
          <section key={dia}>
            <h3 className="mb-1 text-[12px] font-medium text-muted">{rotuloData(dia)}</h3>
            <ul className="flex flex-col divide-y divide-line">
              {itens.map((m) => (
                <li key={m.id}>
                  <button onClick={() => onSelecionar(m)} className="flex w-full items-center gap-3 py-2.5 text-left">
                    <span className="flex size-8 items-center justify-center rounded-full bg-hover text-[14px]">{iconeCategoria(m.categoria)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px]">{m.descricao}</span>
                      <span className="block text-[11px] text-muted">{m.categoria ?? 'Outros'}</span>
                    </span>
                    <span className={`shrink-0 text-[14px] font-semibold ${m.tipo === 'entrada' ? 'text-accent' : 'text-danger'}`}>
                      {m.tipo === 'entrada' ? '+ ' : '− '}{formatarBRL(m.valorCentavos)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </FolhaInferior>
  )
}

/* --------------------------------- ícones --------------------------------- */

function iconeCategoria(cat?: string): string {
  switch (cat) {
    case 'Alimentação': return '🍽️'
    case 'Transporte': return '🚗'
    case 'Moradia': return '🏠'
    case 'Saúde': return '🩺'
    case 'Educação': return '📚'
    case 'Lazer': return '🎬'
    case 'Investimentos': return '📈'
    default: return '💳'
  }
}
function tomIcone(t: 'positivo' | 'atencao' | 'info'): string {
  return t === 'positivo' ? '↓' : t === 'atencao' ? '↑' : '✦'
}
function tomBg(t: 'positivo' | 'atencao' | 'info'): string {
  return t === 'positivo' ? 'color-mix(in srgb, var(--vida-accent) 18%, transparent)' : t === 'atencao' ? 'color-mix(in srgb, var(--vida-danger) 16%, transparent)' : 'var(--vida-hover)'
}
