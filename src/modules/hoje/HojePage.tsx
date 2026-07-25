import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { IconeFator } from '../../core/components/icones'
import { db } from '../../core/db/db'
import { useInsightIA } from '../../core/ia/insights'
import { dataPorExtenso, hojeISO, saudacao } from '../../core/dates'
import { emojiEspecie } from '../pets/db'
import { catInfo, diasRestantes, statusValidade } from '../compras/db'
import type { ItemDespensa, MovDespensa } from '../compras/types'
import { corEfetiva, iconeEvento } from '../agenda/categorias'
import { eventosDoDia } from '../agenda/db'
import { useEventos } from '../agenda/hooks'
import { CapaImg } from '../biblioteca/components/CapaImg'
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

  // Pets: cuidados de hoje ainda pendentes, por pet.
  const petsPendentes = useLiveQuery(async () => {
    const dia = agora.getDay()
    const pets = await db.pets.filter((p) => p.status !== 'arquivado').toArray()
    const out: { id: string; nome: string; emoji: string; pendentes: number; total: number }[] = []
    for (const p of pets) {
      const cuidados = await db.petCuidados.where('petId').equals(p.id).toArray()
      const doDia = cuidados.filter((c) => c.ativo && (!c.dias || c.dias.length === 0 || c.dias.includes(dia)))
      if (doDia.length === 0) continue
      const regs = await db.petCuidadoRegistros.where('petId').equals(p.id).filter((r) => r.data === hoje && r.feito).toArray()
      const feitos = new Set(regs.map((r) => r.cuidadoId))
      const pendentes = doDia.filter((c) => !feitos.has(c.id)).length
      if (pendentes > 0) out.push({ id: p.id, nome: p.nome, emoji: p.emoji ?? emojiEspecie(p.especie), pendentes, total: doDia.length })
    }
    return out
  }, [hoje])

  // Compras: itens da despensa provavelmente acabando ou vencendo.
  const despensaAlertas = useLiveQuery(async () => {
    const itens = (await db.despensa.toArray()) as ItemDespensa[]
    if (itens.length === 0) return []
    const hist = await db.despensaHistorico.toArray()
    const mapa: Record<string, MovDespensa[]> = {}
    for (const m of hist) (mapa[m.despensaId] ??= []).push(m)
    const out: { id: string; nome: string; icone: string; motivo: string }[] = []
    for (const i of itens) {
      const dias = i.monitorarIA === false ? null : diasRestantes(i, mapa[i.id] ?? [])
      const val = statusValidade(i)
      if (dias != null && dias <= 3) out.push({ id: i.id, nome: i.nome, icone: catInfo(i.categoria).icone, motivo: `~${dias} ${dias === 1 ? 'dia' : 'dias'}` })
      else if (i.nivelAprox === 'quase_vazio' && i.monitorarIA !== false) out.push({ id: i.id, nome: i.nome, icone: catInfo(i.categoria).icone, motivo: 'quase acabando' })
      else if (['vencido', 'hoje'].includes(val)) out.push({ id: i.id, nome: i.nome, icone: catInfo(i.categoria).icone, motivo: val === 'vencido' ? 'vencido' : 'vence hoje' })
    }
    return out.slice(0, 5)
  }, [hoje])

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
                  {(() => {
                    // Horário PLANEJADO (bloco de hoje) tem destaque; o PRAZO fica discreto.
                    const planejado =
                      tf.blocoInicio && (!tf.blocoData || tf.blocoData === hoje) ? tf.blocoInicio : undefined
                    if (planejado) {
                      return (
                        <span className="ml-auto flex shrink-0 flex-col items-end leading-tight">
                          <span className="text-[12px] font-semibold tabular-nums">{planejado}</span>
                          {tf.horario && (
                            <span className="text-[10px] tabular-nums text-muted">Prazo: {tf.horario}</span>
                          )}
                        </span>
                      )
                    }
                    if (tf.horario) {
                      return <span className="ml-auto shrink-0 text-[11px] tabular-nums text-muted">{tf.horario}</span>
                    }
                    return null
                  })()}
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
                className="flex aspect-[3/4] flex-col isolate overflow-hidden rounded-lg border border-line bg-bg"
                title={p.titulo || 'Sem título'}
              >
                {p.miniatura ? (
                  <img src={p.miniatura} alt="" className="h-full w-full object-cover mix-blend-multiply dark:mix-blend-normal" />
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
              <CapaImg
                src={lendo.capa}
                className="h-14 w-10 shrink-0 rounded object-cover shadow-sm"
                fallback={<span className="h-14 w-10 shrink-0 rounded bg-hover" />}
              />
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

  /* ------------------------------- Pets ---------------------------------- */
  if (petsPendentes && petsPendentes.length > 0) {
    const totalPend = petsPendentes.reduce((s, l) => s + l.pendentes, 0)
    blocos.push({
      id: 'pets',
      prioridade: 42 + (faixa === 'manha' ? 10 : 0),
      tamanho: 'medio',
      render: (t) => (
        <CartaoHoje tamanho={t}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-semibold">Cuidados dos pets</span>
            <Link to="/pets" className="text-[12px] text-muted hover:text-ink">{totalPend} pendente{totalPend > 1 ? 's' : ''}</Link>
          </div>
          <ul className="flex flex-col gap-0.5">
            {petsPendentes.slice(0, 4).map((l) => (
              <li key={l.id}>
                <Link to={`/pets/${l.id}`} className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 transition-colors hover:bg-hover">
                  <span className="text-[16px]" aria-hidden>{l.emoji}</span>
                  <span className="flex-1 truncate text-[14px]">{l.nome}</span>
                  <span className="shrink-0 text-[11px] text-muted">{l.total - l.pendentes}/{l.total}</span>
                </Link>
              </li>
            ))}
          </ul>
        </CartaoHoje>
      ),
    })
  }

  /* ------------------------------ Compras -------------------------------- */
  if (despensaAlertas && despensaAlertas.length > 0) {
    blocos.push({
      id: 'compras',
      prioridade: 34,
      tamanho: 'pequeno',
      render: (t) => (
        <CartaoHoje tamanho={t}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-semibold">Provavelmente acabando</span>
            <Link to="/compras" className="text-[12px] text-muted hover:text-ink">ver</Link>
          </div>
          <ul className="flex flex-col gap-0.5">
            {despensaAlertas.map((a) => (
              <li key={a.id}>
                <Link to={`/compras/despensa/${a.id}`} className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 transition-colors hover:bg-hover">
                  <span className="text-[15px]" aria-hidden>{a.icone}</span>
                  <span className="flex-1 truncate text-[14px]">{a.nome}</span>
                  <span className="shrink-0 text-[11px] text-muted">{a.motivo}</span>
                </Link>
              </li>
            ))}
          </ul>
        </CartaoHoje>
      ),
    })
  }

  /* ----------------------------- Observação do dia ----------------------- */
  // A heurística de sempre é o fallback; a IA (quando ligada) redige em cima
  // dos MESMOS números reais. Sempre honesta: padrão observado, nunca causa.
  const insightHeur = insightDoDia({
    habitos: habitos ?? [],
    regHabitos: regHabitos ?? [],
    movimentos: movimentos ?? [],
    regHumor: regHumor ?? [],
    hoje,
  })
  const streakGeralHoje = habitos && regHabitos ? streakGeral(habitos, regHabitos) : 0
  const resumoHabHoje = habitos && regHabitos ? resumoDoDia(habitos, regHabitos, hoje) : null
  const gastoHojeCent = (movimentos ?? [])
    .filter((m) => m.data === hoje && m.tipo === 'saida')
    .reduce((s, m) => s + m.valorCentavos, 0)
  const dadosInsight = {
    faixaDoDia: FAIXAS[faixa].rotulo,
    eventosHoje: cronologicos.length,
    tarefasHoje: tarefasHoje.length,
    tarefasAtrasadas: atrasadas,
    habitosFeitos: resumoHabHoje?.feitos ?? null,
    habitosTotal: resumoHabHoje?.total ?? null,
    sequenciaHabitosDias: streakGeralHoje,
    gastoHojeReais: Math.round(gastoHojeCent) / 100,
  }
  const assinaturaInsight = `${hoje}|${faixa}|${cronologicos.length}|${tarefasHoje.length}|${atrasadas}|${resumoHabHoje?.feitos ?? -1}/${resumoHabHoje?.total ?? -1}|${streakGeralHoje}|${gastoHojeCent}`
  const insightIA = useInsightIA({
    chave: 'hoje',
    contexto: 'resumo e observação do dia de hoje de uma pessoa',
    dados: dadosInsight,
    assinatura: assinaturaInsight,
    heuristico: insightHeur?.texto ?? null,
  })
  // Só há bloco quando há texto de verdade (IA ou heurística) ou está pensando.
  // Nunca mostramos o `erro` cru na home: se a IA falhar, cai na heurística em
  // silêncio (o diagnóstico segue disponível via console no hook).
  if (insightIA.texto || insightIA.fonte === 'carregando') {
    const emoji = insightIA.fonte === 'ia' ? '✨' : (insightHeur?.emoji ?? '💡')
    blocos.push({
      id: 'insight',
      prioridade: 50,
      tamanho: 'pequeno',
      render: (t) => (
        <CartaoHoje tamanho={t} className="bg-ink/[0.03]">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">Observação {emoji}</span>
          {insightIA.fonte === 'carregando' && !insightIA.texto ? (
            <p className="mt-1 text-[13px] text-muted">Pensando…</p>
          ) : insightIA.texto ? (
            <p className="mt-1 text-[14px] font-medium">{insightIA.texto}</p>
          ) : null}
        </CartaoHoje>
      ),
    })
  }

  /* ------------------------------ Montagem ------------------------------- */
  // Prioridade decide a ordem. O primeiro bloco é o "foco" (linha inteira, a
  // matéria de capa); o restante flui numa grade que se empacota (masonry),
  // sem os vãos brancos de uma grade rígida — e se reorganiza quando o
  // conteúdo dos blocos muda ao longo do dia.
  blocos.sort((a, b) => b.prioridade - a.prioridade)
  const foco = blocos[0]
  const resto = blocos.slice(1)

  const carregando = eventos === undefined && tarefas === undefined && habitos === undefined

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header className="lume-entrada pt-1">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{saudacao(agora)}</h1>
          <span className="shrink-0 text-[12px] font-medium text-muted/70">{FAIXAS[faixa].rotulo}</span>
        </div>
        <p className="mt-1 text-sm text-muted">{dataPorExtenso(agora)}</p>
      </header>

      {!carregando && <RibbonDia eventos={cronologicos} agora={agora} agoraMin={agoraMin} faixa={faixa} />}

      {carregando ? (
        <p className="py-16 text-center text-sm text-muted">Organizando o seu dia…</p>
      ) : !foco ? (
        <p className="py-12 text-center text-sm text-muted">
          Nada urgente agora. Aproveite para respirar. 🌿
        </p>
      ) : (
        <>
          <div className="lume-entrada">{foco.render(foco.tamanho)}</div>
          {resto.length > 0 && (
            <div className="gap-4 sm:columns-2">
              {resto.map((bl) => (
                <div key={bl.id} className="mb-4 break-inside-avoid">
                  {bl.render(bl.tamanho === 'hero' || bl.tamanho === 'grande' ? 'medio' : bl.tamanho)}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <MensagemIA
        faixa={faixa}
        eventos={cronologicos.length}
        tarefas={tarefasHoje.length}
      />
    </div>
  )
}

/**
 * "Seu dia" — fita de tempo que mostra, de forma calma, onde você está no dia:
 * uma trilha do início ao fim, com o marcador de agora e pontos para os
 * compromissos com horário. É o elemento-assinatura do Hoje, ancorado no que o
 * Lume tem de mais característico: o tempo.
 */
function RibbonDia({
  eventos,
  agora,
  agoraMin,
  faixa,
}: {
  eventos: ReturnType<typeof eventosDoDia>
  agora: Date
  agoraMin: number
  faixa: ReturnType<typeof faixaDoDia>
}) {
  const comHora = eventos
    .map((e) => ({ e, i: hhmmParaMin(e.inicio), f: hhmmParaMin(e.fim) }))
    .filter((x): x is { e: typeof x.e; i: number; f: number | null } => x.i != null)

  const inicios = comHora.map((x) => x.i)
  const fins = comHora.map((x) => x.f ?? x.i + 60)
  const inicioDia = Math.max(0, Math.min(6 * 60, agoraMin, ...inicios))
  const fimDia = Math.min(24 * 60, Math.max(23 * 60, agoraMin, ...fins))
  const vao = Math.max(1, fimDia - inicioDia)
  const pos = (m: number) => Math.max(0, Math.min(100, ((m - inicioDia) / vao) * 100))
  const hh = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}h`
  const horaAgora = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`

  return (
    <div className="lume-entrada rounded-2xl border border-line bg-surface/70 px-4 py-3.5">
      <div className="mb-3 flex items-baseline justify-between text-[12px]">
        <span className="font-semibold">Seu dia</span>
        <span className="tabular-nums text-muted/70">{horaAgora} · {FAIXAS[faixa].rotulo.toLowerCase()}</span>
      </div>
      <div className="relative h-7">
        {/* trilha de base do dia (início → fim) */}
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-line" />
        {/* preenchimento de progresso do dia até agora */}
        <div
          className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full"
          style={{ width: `${pos(agoraMin)}%`, background: 'linear-gradient(90deg, color-mix(in srgb, var(--vida-accent) 25%, transparent), var(--vida-accent))' }}
        />
        {/* uma barra por evento, ocupando sua duração (início → fim) */}
        {comHora.map(({ e, i, f }) => {
          const fim = f ?? i + 60
          const larguraPct = Math.max(0, pos(fim) - pos(i))
          const cabeIcone = larguraPct >= 6
          const rotulo = `${iconeEvento(e)} ${e.inicio}${e.fim ? `–${e.fim}` : ''} · ${e.titulo}`
          return (
            <div
              key={e.id}
              className="absolute top-1/2 flex h-5 -translate-y-1/2 items-center justify-center overflow-hidden rounded-lg ring-1 ring-bg"
              style={{ left: `${pos(i)}%`, width: `${larguraPct}%`, minWidth: 8, backgroundColor: corEfetiva(e) }}
              title={rotulo}
            >
              {cabeIcone && (
                <span className="text-[11px] leading-none" aria-hidden>
                  {iconeEvento(e)}
                </span>
              )}
            </div>
          )
        })}
        {/* marcador de "agora" (sempre por cima das barras) */}
        <span
          className="absolute top-1/2 z-10 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-bg"
          style={{ left: `${pos(agoraMin)}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-muted/60">
        <span>{hh(inicioDia)}</span>
        <span>{hh(fimDia)}</span>
      </div>
    </div>
  )
}

/**
 * "Observação do dia": escolhe UM sinal factual entre vários módulos, em ordem
 * de relevância. É sempre honesta — descreve uma contagem/padrão observado,
 * nunca afirma causa. Retorna null quando não há nada digno de nota.
 */
function insightDoDia({
  habitos,
  regHabitos,
  movimentos,
  regHumor,
  hoje,
}: {
  habitos: Parameters<typeof streakGeral>[0]
  regHabitos: Parameters<typeof streakGeral>[1]
  movimentos: { data: string; tipo: string; valorCentavos: number }[]
  regHumor: { data: string; nivel: number }[]
  hoje: string
}): { texto: string; emoji: string } | null {
  const dMs = (d: string) => new Date(`${d}T00:00:00`).getTime()
  const hojeMs = dMs(hoje)

  // 1. Sequência de hábitos mantida.
  const streak = habitos.length && regHabitos.length ? streakGeral(habitos, regHabitos) : 0
  if (streak >= 3) return { texto: `Você mantém todos os hábitos há ${streak} dias seguidos.`, emoji: '🔥' }

  // 2. Gasto de hoje comparado à média diária dos últimos 30 dias.
  const saidas = movimentos.filter((m) => m.tipo === 'saida')
  if (saidas.length >= 8) {
    const janela = saidas.filter((m) => { const t = dMs(m.data); return t >= hojeMs - 30 * 86400000 && t < hojeMs })
    const diasComGasto = new Set(janela.map((m) => m.data)).size
    const gastoHoje = saidas.filter((m) => m.data === hoje).reduce((s, m) => s + m.valorCentavos, 0)
    if (diasComGasto >= 5 && gastoHoje > 0) {
      const media = janela.reduce((s, m) => s + m.valorCentavos, 0) / diasComGasto
      const dif = media > 0 ? Math.round(((gastoHoje - media) / media) * 100) : 0
      if (Math.abs(dif) >= 20) {
        return {
          texto: `Hoje você gastou ${formatarBRL(gastoHoje)} — ${Math.abs(dif)}% ${dif > 0 ? 'acima' : 'abaixo'} da sua média diária (${formatarBRL(Math.round(media))}).`,
          emoji: dif > 0 ? '💸' : '🟢',
        }
      }
    }
  }

  // 3. Humor médio desta semana vs. a anterior (observação, não causa).
  if (regHumor.length >= 6) {
    const semana = regHumor.filter((r) => { const t = dMs(r.data); return t > hojeMs - 7 * 86400000 && t <= hojeMs })
    const anterior = regHumor.filter((r) => { const t = dMs(r.data); return t > hojeMs - 14 * 86400000 && t <= hojeMs - 7 * 86400000 })
    if (semana.length >= 3 && anterior.length >= 3) {
      const media = (arr: { nivel: number }[]) => arr.reduce((s, r) => s + r.nivel, 0) / arr.length
      const dif = media(semana) - media(anterior)
      if (Math.abs(dif) >= 0.4) {
        return { texto: `Seu humor médio nesta semana está ${dif > 0 ? 'mais alto' : 'mais baixo'} que na semana anterior.`, emoji: dif > 0 ? '🙂' : '🫂' }
      }
    }
  }

  return null
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
