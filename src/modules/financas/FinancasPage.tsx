import { useEffect, useMemo, useState } from 'react'
import { addMonths, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ModalCentral } from '../../core/components/ModalCentral'
import { IconEngrenagem, IconMais, IconSeta, IconSetaEsquerda } from '../../core/components/Icons'
import { hojeISO, rotuloData } from '../../core/dates'
import { useInsightIA } from '../../core/ia/insights'
import { ObservacaoIA } from '../../core/ia/ObservacaoIA'
import { AnelProgresso } from '../habitos/components/AnelProgresso'
import { useEventos } from '../agenda/hooks'
import { AddMovimento } from './components/AddMovimento'
import { AjustesFinancas } from './components/AjustesFinancas'
import { CardObjetivo } from './components/CardObjetivo'
import { CORES_ANALISE, GraficoBarras, GraficoBarrasCompleto, GraficoEvolucao, Sparkline } from './components/Graficos'
import { MovimentoEditorSheet } from './components/MovimentoEditorSheet'
import { agruparPorDia, atualizarOrcamentoLinha, confirmarRecorrente, definirLimiteMes, filtrarMes, formatarBRL, limparLimiteMes, parsearValor, registrarSnapshot, semearFinancasSePreciso } from './db'
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
  diaEfetivoRecorrente,
  distribuicao,
  gastosPorCategoria,
  gerarInsights,
  mediaLinha,
  mesDe,
  orcamentoInteligente,
  patrimonioLiquido,
  reservaDeEmergencia,
  serieEvolucao,
  serieMensal,
  serieMensalCompleta,
} from './orcamento'
import { MovimentarObjetivo } from './components/MovimentarObjetivo'
import type { Movimento, Objetivo } from './types'

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
const COR_ALERTA = '#e0a800' // âmbar (aviso), tom da identidade do Lume

type AbaFinancas = 'visao' | 'analise' | 'extrato' | 'assinaturas' | 'orcamento'
const ABAS: { id: AbaFinancas; rotulo: string }[] = [
  { id: 'visao', rotulo: 'Visão geral' },
  { id: 'analise', rotulo: 'Análise' },
  { id: 'extrato', rotulo: 'Extrato' },
  { id: 'assinaturas', rotulo: 'Assinaturas' },
  { id: 'orcamento', rotulo: 'Orçamento' },
]

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

  const [aba, setAba] = useState<AbaFinancas>('visao')
  const [mes, setMes] = useState(() => format(new Date(), 'yyyy-MM'))
  const [selecionado, setSelecionado] = useState<Movimento | null>(null)
  const [sheet, setSheet] = useState<'ajustes' | null>(null)
  const [addAberto, setAddAberto] = useState(false)
  const [movimentar, setMovimentar] = useState<Objetivo | null>(null)
  // Filtros do Extrato
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'entrada' | 'saida'>('todos')
  const [catFiltro, setCatFiltro] = useState<{ rotulo: string; cats: string[] } | null>(null)
  const [limitesSoMes, setLimitesSoMes] = useState(false)

  const hoje = hojeISO()
  const mesHoje = mesDe(hoje)
  const anoHoje = Number(hoje.slice(0, 4))
  const mesNumHoje = Number(hoje.slice(5, 7))
  const diaHojeNum = Number(hoje.slice(8, 10))

  // Semeia o exemplo na primeira visita (desligado por padrão).
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
        contas: contas ?? [],
        recorrentes: recorrentes ?? [],
        objetivos: objetivos ?? [],
        eventos: eventos ?? [],
        config,
      }),
    [hoje, movimentos, contas, recorrentes, objetivos, eventos, config],
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
  const insightFin = useInsightIA({
    chave: 'financas-mes',
    contexto: 'finanças do mês (orçamento, patrimônio, gastos) de uma pessoa',
    dados: {
      variacaoPatrimonioMesPct: Math.round(varMes),
      disponivelHojeReais: Math.round(orc.disponivelHoje) / 100,
      economiaProjetadaReais: Math.round(orc.economiaProjetada) / 100,
      observacoes: insights.map((i) => i.texto),
    },
    assinatura: `${mesHoje}|${Math.round(varMes)}|${Math.round(orc.disponivelHoje)}|${Math.round(orc.economiaProjetada)}|${insights.map((i) => i.texto).join('¦')}`,
    heuristico: insights[0]?.texto ?? null,
    habilitado: insights.length > 0,
  })

  const ultimas = useMemo(
    () => [...(movimentos ?? [])].sort((a, b) => b.criadoEm - a.criadoEm).slice(0, 5),
    [movimentos],
  )
  const movsMes = useMemo(() => filtrarMes(movimentos ?? [], mes), [movimentos, mes])
  const categoriasPresentes = useMemo(
    () => [...new Set(movsMes.map((m) => m.categoria ?? 'Outros'))].sort(),
    [movsMes],
  )
  const extratoFiltrado = useMemo(() => {
    let ms = movsMes
    if (filtroTipo !== 'todos') ms = ms.filter((m) => m.tipo === filtroTipo)
    if (catFiltro) ms = ms.filter((m) => catFiltro.cats.includes(m.categoria ?? 'Outros'))
    const q = busca.trim().toLowerCase()
    if (q) ms = ms.filter((m) => m.descricao.toLowerCase().includes(q) || (m.categoria ?? '').toLowerCase().includes(q))
    return agruparPorDia(ms)
  }, [movsMes, filtroTipo, catFiltro, busca])
  const totaisExtrato = useMemo(() => {
    const flat = extratoFiltrado.flatMap(([, itens]) => itens)
    return {
      entradas: flat.filter((m) => m.tipo === 'entrada').reduce((s, m) => s + m.valorCentavos, 0),
      saidas: flat.filter((m) => m.tipo === 'saida').reduce((s, m) => s + m.valorCentavos, 0),
      n: flat.length,
    }
  }, [extratoFiltrado])
  const serieBarras = useMemo(() => serieMensal(movimentos ?? [], mesHoje, 6), [movimentos, mesHoje])
  const temMovimentoBarras = serieBarras.some((s) => s.entradas > 0 || s.saidas > 0)

  // Análise: colunas mensais (real + programado) e gasto por categoria do mês.
  const serieCompleta = useMemo(
    () =>
      serieMensalCompleta({
        movimentos: movimentos ?? [],
        objetivos: objetivos ?? [],
        recorrentes: recorrentes ?? [],
        eventos: eventos ?? [],
        mesAtual: mesHoje,
        meses: 6,
      }),
    [movimentos, objetivos, recorrentes, eventos, mesHoje],
  )
  const temSerieCompleta = serieCompleta.some(
    (s) => s.receitas + s.despesas + s.aportes + s.receitaProg + s.despesaProg + s.aporteProg > 0,
  )
  const gastosCat = useMemo(() => gastosPorCategoria(movimentos ?? [], mes), [movimentos, mes])
  const totalGastosCat = useMemo(() => gastosCat.reduce((s, g) => s + g.total, 0), [gastosCat])
  const balancoMes = useMemo(() => {
    const rec = movsMes.filter((m) => m.tipo === 'entrada').reduce((s, m) => s + m.valorCentavos, 0)
    const des = movsMes.filter((m) => m.tipo === 'saida').reduce((s, m) => s + m.valorCentavos, 0)
    return { rec, des, saldo: rec - des }
  }, [movsMes])

  function drillMes(m: string) {
    setMes(m)
    setAba('extrato')
  }
  function drillCategoria(rotulo: string, cats: string[]) {
    setCatFiltro({ rotulo, cats })
    setFiltroTipo('saida')
    setBusca('')
    setAba('extrato')
  }
  const contasOrdenadas = useMemo(
    () => [...(contas ?? [])].sort((a, b) => a.ordem - b.ordem),
    [contas],
  )
  const recorrentesOrd = useMemo(
    () => [...(recorrentes ?? [])].filter((r) => r.ativo !== false).sort((a, b) => a.diaMes - b.diaMes),
    [recorrentes],
  )

  const rotuloMes = (() => {
    const t = format(parseISO(`${mes}-01`), "MMMM 'de' yyyy", { locale: ptBR })
    return t.charAt(0).toUpperCase() + t.slice(1)
  })()

  const dispNegativo = orc.disponivelMes < 0
  const [heroI, heroC] = reaisPartes(Math.abs(orc.disponivelMes))
  const restanteHoje = Math.max(0, orc.orcamentoDiario - orc.gastoHoje)
  const usadoFrac = orc.orcamentoDiario > 0 ? Math.min(1, orc.gastoHoje / orc.orcamentoDiario) : 0

  if (!pronto) {
    return <div className="mx-auto max-w-5xl p-6 text-[14px] text-muted">Carregando…</div>
  }

  const reservaFrac = reserva && reserva.alvoCentavos > 0 ? reserva.atualCentavos / reserva.alvoCentavos : 0

  // Saúde financeira: quanto da renda já está comprometido e a folga que sobra.
  const folga = orc.rendaMensal - orc.comprometido
  const pctComp = orc.rendaMensal > 0 ? Math.round((orc.comprometido / orc.rendaMensal) * 100) : 0
  const corComp = pctComp > 100 ? 'var(--vida-danger)' : pctComp > 85 ? COR_ALERTA : 'var(--vida-accent)'

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

      {addAberto && (
        <ModalCentral titulo="Registrar movimentação" onFechar={() => setAddAberto(false)}>
          <AddMovimento aoConcluir={() => setAddAberto(false)} />
        </ModalCentral>
      )}

      {/* Abas */}
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${aba === a.id ? 'bg-ink text-surface' : 'text-muted hover:bg-hover hover:text-ink'}`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      {/* ============================ VISÃO GERAL ============================ */}
      {aba === 'visao' && (
        <>
          {/* Suas contas */}
          <div className={CARTAO}>
            <div className="mb-3 flex items-center justify-between">
              <span className={ROTULO}>Suas contas</span>
              <button onClick={() => setSheet('ajustes')} className="text-[12px] font-medium text-muted hover:text-ink">Gerenciar</button>
            </div>
            {contasOrdenadas.length === 0 ? (
              <p className="text-[13px] text-muted">Cadastre suas contas nos ajustes para acompanhar cada saldo.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                {contasOrdenadas.map((c) => {
                  const divida = c.tipo === 'divida'
                  return (
                    <div key={c.id} className="rounded-xl border border-line p-3">
                      <div className="flex items-center gap-2">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[15px]" style={{ backgroundColor: c.cor ? `color-mix(in srgb, ${c.cor} 16%, transparent)` : 'var(--vida-hover)' }}>{c.icone ?? '🏦'}</span>
                        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{c.nome}</span>
                      </div>
                      <div className={`mt-2 text-[18px] font-bold leading-none tabular-nums ${divida ? 'text-danger' : ''}`}>
                        {divida ? '− ' : ''}{formatarBRL(c.saldoCentavos)}
                      </div>
                      <div className="mt-1 text-[10.5px] uppercase tracking-wide text-muted">{rotuloTipoConta(c.tipo)}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Disponível para gastar */}
          <div className="grid grid-cols-1 gap-4 rounded-2xl border border-line bg-surface/50 p-5 md:grid-cols-2">
            <div className="flex flex-col justify-center md:border-r md:border-line md:pr-5">
              <span className={ROTULO}>Disponível para gastar</span>
              <div className="mt-1 flex items-baseline gap-0.5">
                <span className={`text-[46px] font-bold leading-none ${dispNegativo ? 'text-danger' : 'text-accent'}`}>{dispNegativo ? '−' : ''}{heroI}</span>
                <span className={`text-[22px] font-bold ${dispNegativo ? 'text-danger' : 'text-accent'}`}>,{heroC}</span>
              </div>
              <p className="mt-2 text-[13px] text-muted">
                {dispNegativo
                  ? 'Seus compromissos do mês passam do que há em conta. Atenção aos gastos.'
                  : `Livre para gastar até o fim do mês, depois dos compromissos. Dá ${formatarBRL(orc.orcamentoDiario)}/dia.`}
              </p>
              <div className="mt-3 flex flex-col gap-1 rounded-xl bg-hover/60 px-3 py-2.5 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Saldo em conta (líquido)</span>
                  <span className="font-semibold tabular-nums">{formatarBRL(orc.saldoLiquido)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">− Compromissos do mês</span>
                  <span className="font-semibold tabular-nums text-danger">{formatarBRL(orc.comprometido)}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between border-t border-line pt-1.5">
                  <span className="font-medium">= Disponível</span>
                  <span className={`font-bold tabular-nums ${dispNegativo ? 'text-danger' : 'text-accent'}`}>{formatarBRL(orc.disponivelMes)}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-3 md:pl-1">
              <div className="flex items-center gap-2">
                <span className={ROTULO}>Orçamento de hoje</span>
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase text-accent">{orc.diasRestantes}d restantes</span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted">Meta diária</span>
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
                <span className="text-muted">Ainda dá pra gastar hoje</span>
                <span className={`font-semibold ${orc.disponivelHoje < 0 ? 'text-danger' : 'text-accent'}`}>{formatarBRL(restanteHoje)}</span>
              </div>
            </div>
          </div>

          {/* Saúde financeira (novo) */}
          <div className={CARTAO}>
            <span className={ROTULO}>Saúde financeira</span>
            {orc.rendaMensal > 0 ? (
              <>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div>
                    <div className="text-[12px] text-muted">Folga no mês</div>
                    <div className={`text-[26px] font-bold leading-none tabular-nums ${folga >= 0 ? 'text-accent' : 'text-danger'}`}>
                      {folga >= 0 ? '' : '− '}{formatarBRL(Math.abs(folga))}
                    </div>
                    <div className="mt-1 text-[11.5px] text-muted">o que sobra da renda depois dos compromissos</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] text-muted">Comprometido</div>
                    <div className="text-[22px] font-bold leading-none tabular-nums" style={{ color: corComp }}>{pctComp}%</div>
                    <div className="mt-1 text-[11.5px] text-muted">da renda</div>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-hover">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pctComp)}%`, backgroundColor: corComp }} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-1.5 text-[12px]">
                  <LinhaSaude label="Renda mensal" valor={formatarBRL(orc.rendaMensal)} />
                  <LinhaSaude label="Recorrentes" valor={formatarBRL(orc.recorrentesReservados)} neg />
                  <LinhaSaude label="Metas (aportes)" valor={formatarBRL(orc.aportesReservados)} neg />
                  <LinhaSaude label="Investimento" valor={formatarBRL(orc.investimentoReservado)} neg />
                  {orc.eventosReservados > 0 && <LinhaSaude label="Eventos do mês" valor={formatarBRL(orc.eventosReservados)} neg />}
                </div>
              </>
            ) : (
              <div className="mt-2">
                <p className="text-[13px] text-muted">Defina sua renda mensal nos ajustes pra ver quanto do mês já está comprometido e a folga que sobra.</p>
                <button onClick={() => setSheet('ajustes')} className="mt-2 text-[12.5px] font-medium text-accent hover:underline">Definir renda →</button>
              </div>
            )}
          </div>

          {/* Receitas × despesas (últimos 6 meses) */}
          <div className={CARTAO}>
            <div className="mb-2 flex items-center justify-between">
              <span className={ROTULO}>Receitas × despesas</span>
              <div className="flex items-center gap-3 text-[11px] text-muted">
                <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-accent" />Receitas</span>
                <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-danger" />Despesas</span>
              </div>
            </div>
            {temMovimentoBarras ? (
              <>
                <GraficoBarras serie={serieBarras} formatarCurto={brlCurto} mesAtivo={mes} onMes={drillMes} />
                <p className="mt-1 text-center text-[11px] text-muted">Toque num mês para ver o extrato</p>
              </>
            ) : (
              <p className="text-[13px] text-muted">Registre entradas e saídas para comparar mês a mês.</p>
            )}
          </div>

          {/* Reserva + Patrimônio */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

            <div className={CARTAO}>
              <span className={ROTULO}>Patrimônio líquido</span>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                  <div className="text-[24px] font-bold leading-none">{formatarBRL(patrimonio)}</div>
                  <div className={`mt-1.5 flex items-center gap-1 text-[12.5px] font-medium ${varMes >= 0 ? 'text-accent' : 'text-danger'}`}>
                    {varMes >= 0 ? '↑' : '↓'} {varMes >= 0 ? '+' : ''}{varMes.toFixed(1)}% este mês
                  </div>
                </div>
                <Sparkline valores={serie.map((s) => s.valor)} />
              </div>
              <p className="mt-2 text-[11.5px] text-muted">Soma de todas as contas, menos dívidas.</p>
            </div>
          </div>

          {/* Objetivos / caixinhas */}
          <div className={CARTAO}>
            <div className="mb-3 flex items-center justify-between">
              <span className={ROTULO}>Objetivos e caixinhas</span>
              <button onClick={() => setSheet('ajustes')} className="text-[12px] font-medium text-muted hover:text-ink">Gerenciar</button>
            </div>
            {(objetivos ?? []).length === 0 ? (
              <p className="text-[13px] text-muted">Crie objetivos (reserva, metas) nos ajustes. Guardar dinheiro aqui não conta como gasto — é uma transferência da conta pra caixinha.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(objetivos ?? []).map((o) => (
                  <CardObjetivo key={o.id} objetivo={o} mes={mesHoje} onClick={() => setMovimentar(o)} />
                ))}
              </div>
            )}
          </div>

          {/* Evolução + Insight */}
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
              {insightFin.fonte === 'ia' && insightFin.texto ? (
                <div className="mt-3"><ObservacaoIA resultado={insightFin} /></div>
              ) : (
                <ul className="mt-3 flex flex-col gap-3">
                  {insights.length === 0 && <li className="text-[13px] text-muted">Registre alguns gastos para o Lume gerar insights.</li>}
                  {insights.map((ins) => (
                    <li key={ins.id} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: tomBg(ins.tom) }}>{tomIcone(ins.tom)}</span>
                      <span className="text-[13.5px] leading-snug">{ins.texto}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {/* ============================== ANÁLISE ============================= */}
      {aba === 'analise' && (
        <>
          {/* Colunas: receitas × despesas × aportes (real + programado) */}
          <div className={CARTAO}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className={ROTULO}>Receitas · despesas · aportes</span>
              <span className="text-[11px] text-muted">Últimos 6 meses</span>
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
              <span className="flex items-center gap-1"><span className="size-2 rounded-full" style={{ backgroundColor: CORES_ANALISE.receitas }} />Receitas</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-full" style={{ backgroundColor: CORES_ANALISE.despesas }} />Despesas</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-full" style={{ backgroundColor: CORES_ANALISE.aportes }} />Aportes</span>
              <span className="flex items-center gap-1">
                <span className="size-2.5 rounded-sm border border-muted/60" style={{ backgroundImage: 'repeating-linear-gradient(45deg, var(--vida-muted) 0 1.5px, transparent 1.5px 3px)' }} />
                Programado
              </span>
            </div>
            {temSerieCompleta ? (
              <>
                <GraficoBarrasCompleto serie={serieCompleta} formatarCurto={brlCurto} mesAtivo={mes} onMes={drillMes} />
                <p className="mt-1 text-center text-[11px] text-muted">Barra cheia = realizado · hachura = ainda programado. Toque num mês para o extrato.</p>
              </>
            ) : (
              <p className="text-[13px] text-muted">Registre entradas, saídas e aportes para ver a evolução mês a mês.</p>
            )}
          </div>

          {/* Balanço do mês */}
          <div className={CARTAO}>
            <span className={ROTULO}>Balanço · {rotuloMes}</span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-line p-3">
                <div className="text-[11px] text-muted">Receitas</div>
                <div className="mt-0.5 text-[17px] font-bold leading-none tabular-nums" style={{ color: CORES_ANALISE.receitas }}>{formatarBRL(balancoMes.rec)}</div>
              </div>
              <div className="rounded-xl border border-line p-3">
                <div className="text-[11px] text-muted">Despesas</div>
                <div className="mt-0.5 text-[17px] font-bold leading-none tabular-nums text-danger">{formatarBRL(balancoMes.des)}</div>
              </div>
              <div className="rounded-xl border border-line p-3">
                <div className="text-[11px] text-muted">Saldo</div>
                <div className={`mt-0.5 text-[17px] font-bold leading-none tabular-nums ${balancoMes.saldo >= 0 ? 'text-accent' : 'text-danger'}`}>
                  {balancoMes.saldo < 0 ? '− ' : ''}{formatarBRL(Math.abs(balancoMes.saldo))}
                </div>
              </div>
            </div>
          </div>

          {/* Gastos por categoria */}
          <div className={CARTAO}>
            <div className="mb-3 flex items-center justify-between">
              <span className={ROTULO}>Gastos por categoria · {rotuloMes}</span>
              {totalGastosCat > 0 && <span className="text-[12px] font-semibold tabular-nums text-muted">{formatarBRL(totalGastosCat)}</span>}
            </div>
            {gastosCat.length === 0 ? (
              <p className="text-[13px] text-muted">Nenhuma saída registrada neste mês.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {gastosCat.map((g, i) => (
                  <button
                    key={g.categoria}
                    onClick={() => drillCategoria(g.categoria, [g.categoria])}
                    className="-mx-1 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-hover/50"
                    title="Ver lançamentos desta categoria"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[14px]">{iconeCategoria(g.categoria)}</span>
                      <span className="flex-1 truncate text-[13px] font-medium">{g.categoria}</span>
                      <span className="text-[12px] font-semibold tabular-nums">{formatarBRL(g.total)}</span>
                      <span className="w-9 text-right text-[11px] text-muted tabular-nums">{Math.round(g.pct * 100)}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-hover">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(2, g.pct * 100)}%`, backgroundColor: corCategoria(i) }} />
                    </div>
                  </button>
                ))}
              </div>
            )}
            <p className="mt-3 text-[11px] text-muted">Toque numa categoria para ver os lançamentos no extrato.</p>
          </div>
        </>
      )}

      {/* ============================== EXTRATO ============================== */}
      {aba === 'extrato' && (
        <div className={CARTAO}>
          <div className="mb-3 flex items-center justify-between">
            <span className={ROTULO}>Extrato · {rotuloMes}</span>
            <button onClick={() => setAddAberto(true)} className="flex items-center gap-1 text-[12px] font-medium text-accent hover:underline">
              <IconMais width={13} height={13} /> Registrar
            </button>
          </div>

          {/* Filtros */}
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar…"
              className="min-w-32 flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] outline-none placeholder:text-muted/60 focus:border-muted/50"
            />
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as typeof filtroTipo)} className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[13px] outline-none">
              <option value="todos">Tudo</option>
              <option value="entrada">Entradas</option>
              <option value="saida">Saídas</option>
            </select>
            <select
              value={catFiltro && catFiltro.cats.length === 1 ? catFiltro.cats[0] : 'todas'}
              onChange={(e) => setCatFiltro(e.target.value === 'todas' ? null : { rotulo: e.target.value, cats: [e.target.value] })}
              className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[13px] outline-none"
            >
              <option value="todas">Categorias</option>
              {categoriasPresentes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Chip do grupo (quando veio de um drill) + totais */}
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px]">
            {catFiltro && catFiltro.cats.length > 1 && (
              <button onClick={() => setCatFiltro(null)} className="flex items-center gap-1 rounded-full bg-hover px-2.5 py-1 font-medium text-ink">
                {catFiltro.rotulo} <span className="text-muted">✕</span>
              </button>
            )}
            <span className="ml-auto text-muted">{totaisExtrato.n} lançamento(s)</span>
            {totaisExtrato.entradas > 0 && <span className="font-semibold text-accent tabular-nums">+ {formatarBRL(totaisExtrato.entradas)}</span>}
            {totaisExtrato.saidas > 0 && <span className="font-semibold tabular-nums">− {formatarBRL(totaisExtrato.saidas)}</span>}
          </div>

          {extratoFiltrado.length === 0 ? (
            <p className="text-[13px] text-muted">{movsMes.length === 0 ? 'Nenhuma transação neste mês. Toque em Registrar para lançar a primeira.' : 'Nenhuma transação com esses filtros.'}</p>
          ) : (
            <div className="flex flex-col gap-4">
              {extratoFiltrado.map(([dia, itens]) => {
                const totalDia = itens.reduce((s, m) => s + (m.tipo === 'entrada' ? m.valorCentavos : -m.valorCentavos), 0)
                return (
                  <section key={dia}>
                    <div className="mb-1 flex items-center justify-between">
                      <h3 className="text-[12px] font-medium text-muted">{rotuloData(dia)}</h3>
                      <span className={`text-[11.5px] font-medium tabular-nums ${totalDia >= 0 ? 'text-accent' : 'text-muted'}`}>{totalDia >= 0 ? '+' : '−'} {formatarBRL(Math.abs(totalDia))}</span>
                    </div>
                    <ul className="flex flex-col divide-y divide-line">
                      {itens.map((m) => (
                        <li key={m.id}>
                          <button onClick={() => setSelecionado(m)} className="flex w-full items-center gap-3 py-2.5 text-left">
                            <span className="flex size-9 items-center justify-center rounded-full bg-hover text-[15px]">{iconeCategoria(m.categoria)}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[14px] font-medium">{m.descricao}</span>
                              <span className="block text-[11px] text-muted">{m.categoria ?? 'Outros'} · {horaDe(m.criadoEm)}</span>
                            </span>
                            <span className={`shrink-0 text-[14px] font-semibold tabular-nums ${m.tipo === 'entrada' ? 'text-accent' : ''}`}>
                              {m.tipo === 'entrada' ? '+ ' : '− '}{formatarBRL(m.valorCentavos)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================ ASSINATURAS ============================ */}
      {aba === 'assinaturas' && (
        <div className={CARTAO}>
          <div className="mb-3 flex items-center justify-between">
            <span className={ROTULO}>Recorrentes e assinaturas</span>
            <button onClick={() => setSheet('ajustes')} className="text-[12px] font-medium text-muted hover:text-ink">Gerenciar</button>
          </div>
          {recorrentesOrd.length === 0 ? (
            <p className="text-[13px] text-muted">Cadastre gastos e receitas recorrentes (aluguel, assinaturas, salário) nos ajustes. Aqui você confirma cada um quando ele cai, virando um lançamento de verdade.</p>
          ) : (
            <>
              <ul className="flex flex-col divide-y divide-line">
                {recorrentesOrd.map((r) => {
                  const dia = diaEfetivoRecorrente(r, anoHoje, mesNumHoje)
                  const confirmado = r.ultimaConfirmacao === mesHoje
                  const diasAte = dia - diaHojeNum
                  const contaPadrao = contasOrdenadas.find((c) => c.tipo === 'corrente' || c.tipo === 'carteira' || c.tipo === 'poupanca')?.id
                  return (
                    <li key={r.id} className="flex items-center gap-3 py-2.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-hover text-[15px]">{r.icone ?? (r.tipo === 'entrada' ? '💰' : '🔁')}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium">{r.nome}</span>
                        <span className="block text-[11px] text-muted">
                          {r.categoria ?? 'Outros'} · {r.quintoUtil ? `5º dia útil (dia ${dia})` : `todo dia ${dia}`}
                        </span>
                      </span>
                      <div className="flex shrink-0 flex-col items-end gap-0.5">
                        <span className={`text-[14px] font-semibold tabular-nums ${r.tipo === 'entrada' ? 'text-accent' : ''}`}>
                          {r.tipo === 'entrada' ? '+ ' : '− '}{formatarBRL(r.valorCentavos)}
                        </span>
                        {confirmado ? (
                          <span className="text-[10.5px] font-medium text-accent">✓ {r.tipo === 'entrada' ? 'recebido' : 'pago'} este mês</span>
                        ) : (
                          <button
                            onClick={() => confirmarRecorrente(r, mesHoje, contaPadrao)}
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${diasAte <= 0 ? 'bg-ink text-surface' : 'bg-hover text-muted hover:text-ink'}`}
                          >
                            {diasAte < 0 ? 'Confirmar (atrasado)' : diasAte === 0 ? 'Confirmar (hoje)' : `Confirmar · em ${diasAte}d`}
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[13px]">
                <span className="font-semibold">Custo recorrente / mês</span>
                <span className="text-[15px] font-bold tabular-nums text-danger">
                  − {formatarBRL(recorrentesOrd.filter((r) => r.tipo === 'saida').reduce((s, r) => s + r.valorCentavos, 0))}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-muted">Confirmar cria o lançamento no Extrato{contasOrdenadas.length > 0 ? ' e ajusta a conta' : ''}. O valor deixa de ser “reservado” no disponível.</p>
            </>
          )}
        </div>
      )}

      {/* ============================= ORÇAMENTO ============================= */}
      {aba === 'orcamento' && (
        <>
          {(() => {
            const estouradas = dist.filter((d) => d.limiteEfetivo > 0 && d.pct > 1)
            if (estouradas.length === 0) return null
            return (
              <div className="rounded-2xl border border-danger/30 bg-danger/[0.06] p-4">
                <div className="flex items-center gap-2">
                  <span className="text-[15px]">⚠️</span>
                  <span className="text-[13px] font-semibold text-danger">
                    {estouradas.length === 1 ? 'Uma categoria passou do limite' : `${estouradas.length} categorias passaram do limite`}
                  </span>
                </div>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {estouradas.map(({ linha, gastoCentavos, limiteEfetivo }) => (
                    <li key={linha.id} className="flex items-center gap-2 text-[12.5px]">
                      <span>{linha.icone}</span>
                      <span className="flex-1 truncate font-medium">{linha.nome}</span>
                      <span className="tabular-nums text-danger">{formatarBRL(gastoCentavos)} / {formatarBRL(limiteEfetivo)}</span>
                      <span className="tabular-nums font-semibold text-danger">+{formatarBRL(gastoCentavos - limiteEfetivo)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })()}

          <div className={CARTAO}>
            <div className="mb-3 flex items-center justify-between">
              <span className={ROTULO}>Distribuição do orçamento · {rotuloMes}</span>
              <button onClick={() => setSheet('ajustes')} className="text-[12px] font-medium text-muted hover:text-ink">Editar limites</button>
            </div>
            <div className="flex flex-col gap-3">
              {dist.length === 0 && <p className="text-[13px] text-muted">Configure suas categorias e limites nos ajustes.</p>}
              {dist.map(({ linha, gastoCentavos, limiteEfetivo, pct }) => (
                <button
                  key={linha.id}
                  onClick={() => drillCategoria(linha.nome, linha.categorias)}
                  className="-mx-1 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-hover/50"
                  title="Ver lançamentos desta categoria"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[13px]">{linha.icone}</span>
                    <span className="flex-1 truncate text-[13px] font-medium">{linha.nome}</span>
                    {linha.limitesEspecificos?.[mes] != null && <span className="rounded-full bg-hover px-1.5 text-[9px] font-semibold uppercase text-muted">exceção</span>}
                    <span className="text-[12px] font-semibold text-muted">{Math.round(pct * 100)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-hover">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct * 100)}%`, backgroundColor: pct > 1 ? 'var(--vida-danger)' : linha.cor }} />
                  </div>
                  <div className="mt-0.5 text-[10.5px] text-muted">{formatarBRL(gastoCentavos)} / {formatarBRL(limiteEfetivo)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Limites por categoria (editar + usar média + exceção do mês) */}
          {dist.length > 0 && (
            <div className={CARTAO}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className={ROTULO}>Limites por categoria</span>
                <label className="flex items-center gap-1.5 text-[11.5px] text-muted">
                  <input type="checkbox" checked={limitesSoMes} onChange={(e) => setLimitesSoMes(e.target.checked)} />
                  editar só neste mês
                </label>
              </div>
              <div className="flex flex-col gap-2.5">
                {dist.map(({ linha, gastoCentavos, limiteEfetivo }) => {
                  const media = mediaLinha(linha.categorias, movimentos ?? [], mes)
                  const temExcecao = linha.limitesEspecificos?.[mes] != null
                  const salvar = (c: number) => {
                    if (limitesSoMes) definirLimiteMes(linha.id, mes, c)
                    else atualizarOrcamentoLinha(linha.id, { limiteCentavos: c })
                  }
                  return (
                    <div key={linha.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[14px]">{linha.icone}</span>
                      <span className="min-w-20 flex-1 truncate text-[13px] font-medium">{linha.nome}</span>
                      <span className="text-[11px] tabular-nums text-muted">gasto {formatarBRL(gastoCentavos)}</span>
                      <InputLimite centavos={limiteEfetivo} onCommit={salvar} />
                      {media > 0 && (
                        <button onClick={() => salvar(media)} title={`Média 3m: ${formatarBRL(media)}`} className="rounded-full bg-hover px-2 py-1 text-[11px] font-medium text-muted hover:text-ink">
                          usar média
                        </button>
                      )}
                      {temExcecao && (
                        <button onClick={() => limparLimiteMes(linha.id, mes)} title="Voltar ao limite padrão" className="text-[11px] font-medium text-accent hover:underline">
                          ↺ padrão
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="mt-2.5 text-[11px] text-muted">
                {limitesSoMes
                  ? `As mudanças valem só para ${rotuloMes} (exceção). Desmarque para editar o limite padrão.`
                  : 'Editar aqui muda o limite padrão (todo mês). Marque “editar só neste mês” para uma exceção pontual.'}
              </p>
            </div>
          )}

          {/* Últimas transações (atalho para o extrato) */}
          <div className={CARTAO}>
            <div className="mb-3 flex items-center justify-between">
              <span className={ROTULO}>Últimas transações</span>
              <button onClick={() => setAba('extrato')} className="flex items-center gap-1 text-[12px] font-medium text-muted hover:text-ink">Ver extrato <IconSeta width={14} height={14} /></button>
            </div>
            <ul className="flex flex-col divide-y divide-line">
              {ultimas.length === 0 && <li className="py-2 text-[13px] text-muted">Nenhuma transação ainda.</li>}
              {ultimas.map((m) => (
                <li key={m.id}>
                  <button onClick={() => setSelecionado(m)} className="flex w-full items-center gap-3 py-2.5 text-left">
                    <span className="flex size-9 items-center justify-center rounded-full bg-hover text-[15px]">{iconeCategoria(m.categoria)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium">{m.descricao}</span>
                      <span className="block text-[11px] text-muted">{m.categoria ?? 'Outros'} · {rotuloData(m.data)}</span>
                    </span>
                    <span className={`shrink-0 text-[14px] font-semibold tabular-nums ${m.tipo === 'entrada' ? 'text-accent' : ''}`}>
                      {m.tipo === 'entrada' ? '+ ' : '− '}{formatarBRL(m.valorCentavos)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {sheet === 'ajustes' && <AjustesFinancas onFechar={() => setSheet(null)} />}
      <MovimentoEditorSheet movimento={selecionado} onFechar={() => setSelecionado(null)} />
      {movimentar && <MovimentarObjetivo objetivo={movimentar} contas={contas ?? []} onFechar={() => setMovimentar(null)} />}
    </div>
  )
}

/* --------------------------------- helpers UI ----------------------------- */

/** Campo de limite em R$ (edita ao sair do foco). */
function InputLimite({ centavos, onCommit }: { centavos: number; onCommit: (c: number) => void }) {
  const inicial = centavos > 0 ? formatarBRL(centavos).replace('R$', '').trim() : ''
  const [txt, setTxt] = useState(inicial)
  useEffect(() => { setTxt(centavos > 0 ? formatarBRL(centavos).replace('R$', '').trim() : '') }, [centavos])
  return (
    <input
      value={txt}
      onChange={(e) => setTxt(e.target.value)}
      onBlur={() => { const v = parsearValor(txt); if (v != null) onCommit(v) }}
      inputMode="decimal"
      placeholder="0,00"
      aria-label="Limite"
      className="w-24 rounded-lg border border-line bg-surface px-2 py-1 text-right text-[13px] tabular-nums outline-none focus:border-muted/50"
    />
  )
}

function LinhaSaude({ label, valor, neg }: { label: string; valor: string; neg?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{neg ? '− ' : ''}{label}</span>
      <span className={`font-semibold tabular-nums ${neg ? 'text-danger' : ''}`}>{valor}</span>
    </div>
  )
}

function rotuloTipoConta(tipo: string): string {
  switch (tipo) {
    case 'corrente': return 'Conta corrente'
    case 'poupanca': return 'Poupança'
    case 'investimento': return 'Investimento'
    case 'carteira': return 'Carteira'
    case 'divida': return 'Dívida'
    default: return 'Conta'
  }
}
// Paleta ordenada para as barras de categoria (ordem fixa, nunca cíclica de matiz).
const PALETA_CAT = ['#2383e2', '#2f9e6f', '#d99b2b', '#c2554e', '#8b5cf6', '#0d9488', '#db6d9e', '#64748b']
function corCategoria(i: number): string {
  return PALETA_CAT[i % PALETA_CAT.length]
}
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
