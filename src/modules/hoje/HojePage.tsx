import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IconeFator } from '../../core/components/icones'
import { dataPorExtenso, hojeISO, saudacao } from '../../core/dates'
import { eventosDoDia } from '../agenda/db'
import { useEventos } from '../agenda/hooks'
import { AnelProgresso } from '../habitos/components/AnelProgresso'
import { cicloSimNao } from '../habitos/db'
import { devidoNoDia } from '../habitos/freq'
import { useHabitos, useRegistros as useRegistrosHabitos } from '../habitos/hooks'
import {
  estadoDia,
  registrosDoDia as registrosHabitoDoDia,
  resumoDoDia,
  streakGeral,
} from '../habitos/progresso'
import { useRegistros as useRegistrosHumor, useHumorTipos } from '../humor/hooks'
import { humorDe, mediaNivel, registrosDoDia as registrosHumorDoDia } from '../humor/humor'
import { formatarBRL } from '../financas/db'
import { useMovimentos } from '../financas/hooks'
import { exibir, METRICAS } from '../saude/db'
import { useSaudeDia } from '../saude/hooks'
import { useLivros } from '../biblioteca/hooks'
import { usePaginas } from '../notas/hooks'
import { alternarConclusao, corPrioridade, estaAtrasada, filtrarHoje } from '../tarefas/db'
import { useTarefas } from '../tarefas/hooks'
import type { Tamanho } from './CartaoHoje'
import { CartaoHoje } from './CartaoHoje'
import { faixaDoDia, FAIXAS, hhmmParaMin, minutosDoDia, useAgora } from './agora'
import { SecaoAcoesRapidas } from '../../core/captura/SecaoAcoesRapidas'

/** Um bloco do dashboard: prioridade decide a ordem; render recebe o tamanho. */
interface Bloco {
  id: string
  prioridade: number
  tamanho: Tamanho
  render: (t: Tamanho) => ReactNode
}

const ACENTO = 'var(--vida-accent)'

function rotuloTempo(min: number): string {
  if (min <= 0) return 'agora'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

/**
 * Dashboard "Hoje" — o cérebro do Lume. Não é uma lista de widgets fixos: lê os
 * dados de todos os módulos e monta blocos com prioridade e tamanho que mudam
 * conforme o horário e o contexto do dia.
 */
export function HojePage() {
  const agora = useAgora()
  const hoje = hojeISO()
  const faixa = faixaDoDia(agora)
  const agoraMin = minutosDoDia(agora)

  const eventos = useEventos()
  const tarefas = useTarefas()
  const habitos = useHabitos()
  const regHabitos = useRegistrosHabitos()
  const regHumor = useRegistrosHumor()
  const humorTipos = useHumorTipos()
  const saudeHoje = useSaudeDia(hoje)
  const movimentos = useMovimentos()
  const livros = useLivros()
  const paginas = usePaginas()

  const blocos: Bloco[] = []

  /* ---------------- Agenda: evento agora / próximo / atrasado ------------- */
  const doDia = eventos ? eventosDoDia(eventos, hoje) : []
  const cronologicos = doDia.filter((e) => !e.diaInteiro && hhmmParaMin(e.inicio) != null)
  const atual = cronologicos.find((e) => {
    const i = hhmmParaMin(e.inicio)!
    const f = hhmmParaMin(e.fim) ?? i + 60
    return i <= agoraMin && agoraMin < f
  })
  const proximo = cronologicos.find((e) => hhmmParaMin(e.inicio)! > agoraMin)

  if (atual) {
    const i = hhmmParaMin(atual.inicio)!
    const f = hhmmParaMin(atual.fim) ?? i + 60
    const atrasado = agoraMin - i <= 15 // começou há pouco
    const restante = f - agoraMin
    const cor = atual.cor ?? ACENTO
    blocos.push({
      id: 'evento-agora',
      prioridade: atrasado ? 120 : 105,
      tamanho: 'hero',
      render: () => (
        <CartaoHoje
          tamanho="hero"
          to="/agenda"
          destaque
          style={{ backgroundColor: `${cor}14`, boxShadow: `inset 0 0 0 1px ${cor}55` }}
        >
          <span className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: cor }}>
            {atrasado ? `Começou há ${agoraMin - i} min` : 'Acontecendo agora'}
          </span>
          <h2 className="mt-1 text-2xl font-bold leading-tight">{atual.titulo}</h2>
          <p className="mt-2 text-[14px] text-muted">
            {atual.inicio}–{atual.fim}
            {atual.local ? ` · ${atual.local}` : ''} · termina em {rotuloTempo(restante)}
          </p>
        </CartaoHoje>
      ),
    })
  }

  if (proximo) {
    const i = hhmmParaMin(proximo.inicio)!
    const faltam = i - agoraMin
    const iminente = faltam <= 60
    const cor = proximo.cor ?? ACENTO
    blocos.push({
      id: 'evento-proximo',
      prioridade: iminente ? 88 : 58,
      tamanho: iminente && !atual ? 'grande' : 'medio',
      render: (t) => (
        <CartaoHoje tamanho={t} to="/agenda">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">
            {atual ? 'Depois' : `Em ${rotuloTempo(faltam)}`}
          </span>
          <div className="mt-1.5 flex items-start gap-2.5">
            <span className="mt-1 h-9 w-1 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
            <span className="min-w-0">
              <span className={`block font-bold leading-tight ${t === 'grande' ? 'text-xl' : 'text-[16px]'}`}>
                {proximo.titulo}
              </span>
              <span className="block text-[13px] text-muted">
                {proximo.inicio}–{proximo.fim}
                {proximo.local ? ` · ${proximo.local}` : ''}
              </span>
            </span>
          </div>
        </CartaoHoje>
      ),
    })
  }

  /* --------------------------- Tarefas prioritárias ---------------------- */
  const tarefasHoje = tarefas ? filtrarHoje(tarefas) : []
  const atrasadas = tarefasHoje.filter(estaAtrasada).length
  if (tarefasHoje.length > 0) {
    const topo = tarefasHoje.slice(0, 3)
    const pesoFaixa = faixa === 'tarde' ? 12 : faixa === 'noite' ? 8 : faixa === 'madrugada' ? -20 : 0
    blocos.push({
      id: 'tarefas',
      prioridade: 62 + (atrasadas ? 18 : 0) + pesoFaixa,
      tamanho: 'medio',
      render: (t) => (
        <CartaoHoje tamanho={t}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-semibold">Tarefas de hoje</span>
            <Link to="/tarefas" className="text-[12px] text-muted hover:text-ink">
              {atrasadas > 0 ? `${atrasadas} atrasada${atrasadas > 1 ? 's' : ''}` : `${tarefasHoje.length}`}
            </Link>
          </div>
          <ul className="flex flex-col gap-0.5">
            {topo.map((tf) => (
              <li key={tf.id}>
                <button
                  onClick={() => alternarConclusao(tf)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-hover"
                >
                  <span
                    className="size-4 shrink-0 rounded-full border-2"
                    style={{ borderColor: corPrioridade(tf.prioridade) }}
                  />
                  <span className={`truncate text-[14px] ${estaAtrasada(tf) ? 'text-danger' : ''}`}>
                    {tf.titulo}
                  </span>
                  {tf.horario && <span className="ml-auto shrink-0 text-[11px] text-muted">{tf.horario}</span>}
                </button>
              </li>
            ))}
          </ul>
        </CartaoHoje>
      ),
    })
  }

  /* ------------------------------ Hábitos de agora ----------------------- */
  const devidos = (habitos ?? []).filter((h) => !h.arquivado && devidoNoDia(h, hoje))
  if (devidos.length > 0 && regHabitos) {
    const mapaReg = registrosHabitoDoDia(regHabitos, hoje)
    const resumo = resumoDoDia(habitos ?? [], regHabitos, hoje)
    const relevante = (hm: number | null) => hm == null || (hm - agoraMin >= -240 && hm - agoraMin <= 180)
    const agora4 = devidos
      .filter((h) => relevante(hhmmParaMin(h.horario)))
      .sort((a, b) => Math.abs((hhmmParaMin(a.horario) ?? agoraMin) - agoraMin) - Math.abs((hhmmParaMin(b.horario) ?? agoraMin) - agoraMin))
      .slice(0, 4)
    const pesoFaixa = faixa === 'manha' ? 16 : faixa === 'fimdenoite' ? 12 : faixa === 'noite' ? 8 : faixa === 'madrugada' ? -25 : 0
    blocos.push({
      id: 'habitos',
      prioridade: 56 + pesoFaixa,
      tamanho: 'medio',
      render: (t) => (
        <CartaoHoje tamanho={t}>
          <div className="flex items-center gap-3">
            <AnelProgresso fracao={resumo.fracao} tamanho={44} espessura={4} cor="var(--vida-accent)">
              <span className="text-[11px] font-bold tabular-nums">{Math.round(resumo.fracao * 100)}%</span>
            </AnelProgresso>
            <div className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold">Hábitos</span>
              <span className="block text-[12px] text-muted">
                {resumo.feitos} de {resumo.total} concluídos
              </span>
            </div>
            <Link to="/habitos" className="shrink-0 text-[12px] text-muted hover:text-ink">
              ver
            </Link>
          </div>
          {agora4.length > 0 && (
            <ul className="mt-2.5 flex flex-col gap-0.5">
              {agora4.map((h) => {
                const est = estadoDia(h, mapaReg.get(h.id))
                const feito = est === 'feito'
                const cor = h.cor ?? 'var(--vida-ink)'
                const conteudo = (
                  <>
                    <span
                      className="flex size-5 shrink-0 items-center justify-center rounded-full"
                      style={feito ? { backgroundColor: cor, color: '#fff' } : { color: cor }}
                    >
                      {feito ? '✓' : <IconeFator nome={h.icone} width={15} height={15} />}
                    </span>
                    <span className={`truncate text-[14px] ${feito ? 'text-muted line-through' : ''}`}>{h.nome}</span>
                    {h.horario && <span className="ml-auto shrink-0 text-[11px] text-muted">{h.horario}</span>}
                  </>
                )
                return (
                  <li key={h.id}>
                    {h.tipo === 'sim_nao' ? (
                      <button
                        onClick={() => cicloSimNao(h.id, hoje)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-hover"
                      >
                        {conteudo}
                      </button>
                    ) : (
                      <Link
                        to="/habitos"
                        className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5 transition-colors hover:bg-hover"
                      >
                        {conteudo}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </CartaoHoje>
      ),
    })
  }

  /* -------------------------------- Humor -------------------------------- */
  if (regHumor) {
    const doDiaHumor = registrosHumorDoDia(regHumor, hoje)
    if (doDiaHumor.length === 0) {
      const pesoFaixa = faixa === 'manha' ? 20 : faixa === 'fimdenoite' ? 16 : 0
      blocos.push({
        id: 'humor-vazio',
        prioridade: 60 + pesoFaixa,
        tamanho: 'medio',
        render: (t) => (
          <CartaoHoje tamanho={t} to="/humor">
            <span className="text-[13px] font-semibold">Como você está?</span>
            <p className="mt-1 text-[13px] text-muted">
              {faixa === 'fimdenoite' ? 'Registre como foi o seu dia.' : 'Toque para registrar seu humor.'}
            </p>
            <div className="mt-2.5 flex gap-1.5">
              {humorTipos.map((ht) => (
                <span
                  key={ht.nivel}
                  className="size-6 rounded-full"
                  style={{ backgroundColor: ht.cor }}
                  title={ht.nome}
                />
              ))}
            </div>
          </CartaoHoje>
        ),
      })
    } else {
      const tipo = humorDe(humorTipos, Math.round(mediaNivel(doDiaHumor)) as 1 | 2 | 3 | 4 | 5)
      blocos.push({
        id: 'humor-ok',
        prioridade: 22,
        tamanho: 'pequeno',
        render: (t) => (
          <CartaoHoje tamanho={t} to="/humor">
            <div className="flex items-center gap-2.5">
              <span className="size-9 shrink-0 rounded-full" style={{ backgroundColor: tipo.cor }} />
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold">{tipo.nome}</span>
                <span className="block text-[11px] text-muted">humor de hoje</span>
              </span>
            </div>
          </CartaoHoje>
        ),
      })
    }
  }

  /* -------------------------------- Notas -------------------------------- */
  if (paginas && paginas.length > 0) {
    const recentes = paginas.slice(0, 4)
    blocos.push({
      id: 'notas',
      prioridade: 46,
      tamanho: 'medio',
      render: (t) => (
        <CartaoHoje tamanho={t}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-semibold">Notas recentes</span>
            <Link to="/notas" className="text-[12px] text-muted hover:text-ink">
              ver
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {recentes.map((p) => (
              <Link
                key={p.id}
                to={`/notas/${p.id}`}
                className="flex aspect-[3/4] flex-col overflow-hidden rounded-lg border border-line bg-bg"
                title={p.titulo || 'Sem título'}
              >
                {p.miniatura ? (
                  <img src={p.miniatura} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="line-clamp-4 p-1.5 text-[10px] leading-tight text-muted">
                    {p.titulo || 'Sem título'}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </CartaoHoje>
      ),
    })
  }

  /* -------------------------------- Saúde -------------------------------- */
  if (saudeHoje) {
    const sd = saudeHoje as unknown as Record<string, number | undefined>
    const metricas = METRICAS.filter((m) => sd[m.chave] != null).slice(0, 4)
    if (metricas.length > 0) {
      const pesoFaixa = faixa === 'manha' ? 12 : 0
      blocos.push({
        id: 'saude',
        prioridade: 40 + pesoFaixa,
        tamanho: 'pequeno',
        render: (t) => (
          <CartaoHoje tamanho={t} to="/saude">
            <span className="mb-2 block text-[13px] font-semibold">Saúde</span>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {metricas.map((m) => (
                <span key={m.chave} className="flex flex-col">
                  <span className="text-[15px] font-bold tabular-nums" style={{ color: m.cor }}>
                    {exibir(m.chave, sd[m.chave] as number)}
                  </span>
                  <span className="text-[11px] text-muted">{m.nome}</span>
                </span>
              ))}
            </div>
          </CartaoHoje>
        ),
      })
    }
  }

  /* ------------------------------ Biblioteca ----------------------------- */
  const lendo = (livros ?? [])
    .filter((l) => l.status === 'lendo' && !l.ehCompilado)
    .sort((a, b) => (b.atualizadoEm ?? b.adicionadoEm) - (a.atualizadoEm ?? a.adicionadoEm))[0]
  if (lendo) {
    const pesoFaixa = faixa === 'fimdenoite' ? 22 : faixa === 'noite' ? 14 : 0
    blocos.push({
      id: 'biblioteca',
      prioridade: 38 + pesoFaixa,
      tamanho: 'pequeno',
      render: (t) => (
        <CartaoHoje tamanho={t} to={`/biblioteca/${lendo.id}`}>
          <div className="flex items-center gap-3">
            {lendo.capa ? (
              <img src={lendo.capa} alt="" className="h-14 w-10 shrink-0 rounded object-cover shadow-sm" />
            ) : (
              <span className="h-14 w-10 shrink-0 rounded bg-hover" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold">{lendo.titulo}</span>
              <span className="block text-[11px] text-muted">Continuar lendo</span>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-line">
                <span className="block h-full rounded-full bg-ink" style={{ width: `${lendo.progresso ?? 0}%` }} />
              </span>
            </span>
          </div>
        </CartaoHoje>
      ),
    })
  }

  /* ------------------------------- Finanças ------------------------------ */
  if (movimentos && movimentos.length > 0) {
    const gastoHoje = movimentos
      .filter((m) => m.data === hoje && m.tipo === 'saida')
      .reduce((s, m) => s + m.valorCentavos, 0)
    blocos.push({
      id: 'financas',
      prioridade: gastoHoje > 0 ? 36 : 24,
      tamanho: 'pequeno',
      render: (t) => (
        <CartaoHoje tamanho={t} to="/financas">
          <span className="block text-[13px] font-semibold">Gasto de hoje</span>
          <span className="mt-1 block text-[20px] font-bold tabular-nums">{formatarBRL(gastoHoje)}</span>
        </CartaoHoje>
      ),
    })
  }

  /* ----------------------------- Insight do dia -------------------------- */
  const streak = habitos && regHabitos ? streakGeral(habitos, regHabitos) : 0
  if (streak >= 3) {
    blocos.push({
      id: 'insight',
      prioridade: 50,
      tamanho: 'pequeno',
      render: (t) => (
        <CartaoHoje tamanho={t} className="bg-ink/[0.03]">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">Insight</span>
          <p className="mt-1 text-[14px] font-medium">
            Você mantém todos os hábitos há {streak} dias seguidos. 🔥
          </p>
        </CartaoHoje>
      ),
    })
  }

  /* ------------------------------ Montagem ------------------------------- */
  blocos.sort((a, b) => b.prioridade - a.prioridade)
  // promove o mais importante a linha inteira (a "matéria de capa")
  const ordem = ['hero', 'grande', 'medio', 'pequeno'] as const
  const nodes = blocos.map((bl, idx) => {
    let t = bl.tamanho
    if (idx === 0 && ordem.indexOf(t) > ordem.indexOf('grande')) t = 'grande'
    return <div key={bl.id}>{bl.render(t)}</div>
  })

  const carregando = eventos === undefined && tarefas === undefined && habitos === undefined

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header className="lume-entrada pt-1">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold tracking-tight">{saudacao(agora)}</h1>
          <span className="text-[12px] font-medium text-muted/70">{FAIXAS[faixa].rotulo}</span>
        </div>
        <p className="mt-1 text-sm text-muted">{dataPorExtenso(agora)}</p>
      </header>

      <SecaoAcoesRapidas />

      {carregando ? (
        <p className="py-16 text-center text-sm text-muted">Organizando o seu dia…</p>
      ) : nodes.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">
          Nada urgente agora. Aproveite para respirar. 🌿
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{nodes}</div>
      )}

      <MensagemIA
        faixa={faixa}
        eventos={cronologicos.length}
        tarefas={tarefasHoje.length}
      />
    </div>
  )
}

function MensagemIA({
  faixa,
  eventos,
  tarefas,
}: {
  faixa: ReturnType<typeof faixaDoDia>
  eventos: number
  tarefas: number
}) {
  let msg: string
  if (faixa === 'manha') {
    msg =
      eventos + tarefas === 0
        ? 'Uma manhã tranquila pela frente. Um bom momento para começar algo seu.'
        : `Bom começo de dia. Você tem ${eventos} compromisso${eventos === 1 ? '' : 's'} e ${tarefas} tarefa${tarefas === 1 ? '' : 's'} planejadas.`
  } else if (faixa === 'meiodia') {
    msg = 'Meio do dia — vale uma pausa e um copo de água antes de seguir.'
  } else if (faixa === 'tarde') {
    msg =
      tarefas > 0
        ? 'A tarde rende. Talvez seja a hora de avançar na tarefa mais importante.'
        : 'Tarde livre — um bom espaço para foco ou descanso.'
  } else if (faixa === 'noite') {
    msg = 'A noite chegou. Hora de encerrar o que dá e desacelerar aos poucos.'
  } else if (faixa === 'fimdenoite') {
    msg = 'O dia está quase no fim. Um bom momento para revisar como foi e preparar o amanhã.'
  } else {
    msg = 'Ainda é madrugada. Se puder, descanse — o dia começa melhor com sono.'
  }
  return <p className="lume-entrada px-1 pt-1 pb-2 text-[13px] leading-relaxed text-muted/90">{msg}</p>
}
