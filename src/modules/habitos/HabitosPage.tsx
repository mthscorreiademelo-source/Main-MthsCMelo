import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../core/components/EmptyState'
import { IconChama, IconGrafico, IconMais, IconMenuPontos } from '../../core/components/Icons'
import { getDay, parseISO } from 'date-fns'
import { hojeISO } from '../../core/dates'
import { CabecalhoProgresso } from './components/CabecalhoProgresso'
import { CartaoHabito } from './components/CartaoHabito'
import { CategoriaSecao } from './components/CategoriaSecao'
import { EditorHabito } from './components/EditorHabito'
import { GerenciarCategorias } from './components/GerenciarCategorias'
import { Heatmap } from './components/Heatmap'
import { NavegadorData } from './components/NavegadorData'
import { alternarRecolhida, garantirSeedsHabitos, ordenarHabitos, ultimosDias } from './db'
import { devidoNoDia, NOMES_DIA } from './freq'
import { sincronizarIntegracoes } from './integracoes'
import { agendarLembretes } from './lembretes'
import { useCategoriasHabito, useContagemSaude, useHabitos, useRegistros } from './hooks'
import {
  contagemSemana,
  diaConcluido,
  estatGlobais,
  fracao,
  fracaoDoDia,
  heatmapGlobal,
  rankingHabitos,
  registrosDoDia,
  resumoDoDia,
  streakGeral,
  valorDoDia,
} from './progresso'
import { AbaRotinas } from './rotinas/AbaRotinas'
import { ExecucaoGuiada } from './rotinas/ExecucaoGuiada'
import { periodoDeHorario, useRotinas } from './rotinas/db'
import { ROTULO_PERIODO, type PeriodoDia, type Rotina } from './rotinas/types'
import type { CategoriaHabito, Habito, HabitoRegistro } from './types'

if (typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__lumeHabitos = {
    contagemSemana, diaConcluido, resumoDoDia, fracaoDoDia, fracao, valorDoDia, estatGlobais, sincronizarIntegracoes,
  }
}

type Aba = 'hoje' | 'habitos' | 'rotinas' | 'historico' | 'insights'
const ABAS: { id: Aba; nome: string }[] = [
  { id: 'hoje', nome: 'Hoje' },
  { id: 'habitos', nome: 'Hábitos' },
  { id: 'rotinas', nome: 'Rotinas' },
  { id: 'historico', nome: 'Histórico' },
  { id: 'insights', nome: 'Insights' },
]
const ORDEM_PERIODO: PeriodoDia[] = ['manha', 'tarde', 'noite', 'qualquer']

export function HabitosPage() {
  const habitos = useHabitos()
  const registros = useRegistros()
  const categorias = useCategoriasHabito()
  const rotinas = useRotinas()
  const nSaude = useContagemSaude()

  const [aba, setAba] = useState<Aba>('hoje')
  const [data, setData] = useState(hojeISO())
  const [editor, setEditor] = useState<{ habito: Habito | null } | null>(null)
  const [gerenciando, setGerenciando] = useState(false)
  const [semCatRecolhida, setSemCatRecolhida] = useState(false)
  const [execRotina, setExecRotina] = useState<Rotina | null>(null)

  useEffect(() => { garantirSeedsHabitos() }, [])
  useEffect(() => { if (habitos && habitos.some((h) => h.fonteId)) void sincronizarIntegracoes(habitos) }, [habitos, nSaude])
  useEffect(() => { if (habitos && registros) return agendarLembretes(habitos, registros) }, [habitos, registros])

  const hoje = hojeISO()
  const dataAtiva = aba === 'historico' ? data : hoje
  const ativos = useMemo(() => (habitos ?? []).filter((h) => !h.arquivado), [habitos])
  const regsDia = useMemo(() => registrosDoDia(registros ?? [], dataAtiva), [registros, dataAtiva])
  const semanaInfo = useMemo(() => {
    const m = new Map<string, { feitos: number; meta: number }>()
    for (const h of ativos) if (h.frequencia?.tipo === 'semanal') m.set(h.id, { feitos: contagemSemana(h, registros ?? [], dataAtiva), meta: Math.max(1, h.frequencia.vezes ?? 1) })
    return m
  }, [ativos, registros, dataAtiva])
  const resumo = useMemo(() => resumoDoDia(ativos, registros ?? [], dataAtiva), [ativos, registros, dataAtiva])
  const streak = useMemo(() => streakGeral(ativos, registros ?? []), [ativos, registros])
  const cats = useMemo(() => [...(categorias ?? [])].sort((a, b) => a.ordem - b.ordem), [categorias])
  const vazio = !!habitos && ativos.length === 0

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Hábitos e Rotinas</h1>
        <div className="flex items-center gap-1">
          <Link to="/habitos/estatisticas" className="flex size-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-hover hover:text-ink" aria-label="Estatísticas"><IconGrafico width={18} height={18} /></Link>
          <button onClick={() => setGerenciando(true)} className="flex size-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-hover hover:text-ink" aria-label="Gerenciar categorias"><IconMenuPontos width={18} height={18} /></button>
          <button onClick={() => setEditor({ habito: null })} className="flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[14px] font-medium text-surface hover:opacity-90"><IconMais width={16} height={16} /> Hábito</button>
        </div>
      </div>

      {/* Barra de subtabs */}
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5">
        {ABAS.map((a) => (
          <button key={a.id} onClick={() => setAba(a.id)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13.5px] font-medium transition-colors ${aba === a.id ? 'bg-ink text-surface' : 'text-muted hover:bg-hover'}`}>{a.nome}</button>
        ))}
      </div>

      {/* ---------------------------------- HOJE --------------------------------- */}
      {aba === 'hoje' && (
        vazio ? (
          <EmptyState icone={<IconChama />} titulo="Crie um hábito simples ou comece por uma rotina" descricao="Escolha o tipo (sim/não, contador, tempo…), a frequência e uma categoria — ou monte uma rotina na aba Rotinas." />
        ) : (
          <AbaHoje ativos={ativos} regsDia={regsDia} semanaInfo={semanaInfo} resumo={resumo} streak={streak} hoje={hoje} rotinas={rotinas} onIniciarRotina={setExecRotina} onEditar={(h) => setEditor({ habito: h })} />
        )
      )}

      {/* --------------------------------- HÁBITOS ------------------------------- */}
      {aba === 'habitos' && (
        vazio ? (
          <EmptyState icone={<IconChama />} titulo="Nenhum hábito ainda" descricao="Crie seu primeiro hábito — o histórico e as sequências ficam preservados." />
        ) : (
          <Biblioteca cats={cats} ativos={ativos} regsDia={regsDia} semanaInfo={semanaInfo} data={hoje} semCatRecolhida={semCatRecolhida} onToggleSemCat={() => setSemCatRecolhida((v) => !v)} onEditar={(h) => setEditor({ habito: h })} onToggleCat={(c) => alternarRecolhida(c.id, !c.recolhida)} />
        )
      )}

      {/* --------------------------------- ROTINAS ------------------------------- */}
      {aba === 'rotinas' && <AbaRotinas />}

      {/* -------------------------------- HISTÓRICO ------------------------------ */}
      {aba === 'historico' && (
        <div className="flex flex-col gap-4">
          <NavegadorData data={data} onData={setData} />
          {ativos.length > 0 && <CabecalhoProgresso resumo={resumo} streak={streak} ehHoje={dataAtiva === hoje} />}
          {ativos.length > 0 && (
            <Biblioteca cats={cats} ativos={ativos} regsDia={regsDia} semanaInfo={semanaInfo} data={dataAtiva} semCatRecolhida={semCatRecolhida} onToggleSemCat={() => setSemCatRecolhida((v) => !v)} onEditar={(h) => setEditor({ habito: h })} onToggleCat={(c) => alternarRecolhida(c.id, !c.recolhida)} />
          )}
          <div className="rounded-2xl border border-line bg-surface/50 p-4">
            <span className="mb-2 block text-[12px] font-semibold uppercase tracking-wide text-muted">Últimos meses</span>
            <Heatmap dias={heatmapGlobal(ativos, registros ?? [], 133)} cor="var(--vida-accent)" />
          </div>
        </div>
      )}

      {/* --------------------------------- INSIGHTS ------------------------------ */}
      {aba === 'insights' && <AbaInsights ativos={ativos} registros={registros ?? []} streak={streak} />}

      {editor && <EditorHabito habito={editor.habito} categorias={cats} onFechar={() => setEditor(null)} />}
      {gerenciando && <GerenciarCategorias categorias={cats} onFechar={() => setGerenciando(false)} />}
      {execRotina && <ExecucaoGuiada rotina={(rotinas ?? []).find((r) => r.id === execRotina.id) ?? execRotina} onFechar={() => setExecRotina(null)} />}
    </div>
  )
}

/* ------------------------------- Visão Hoje ------------------------------- */

function AbaHoje({ ativos, regsDia, semanaInfo, resumo, streak, hoje, rotinas, onIniciarRotina, onEditar }: {
  ativos: Habito[]
  regsDia: Map<string, HabitoRegistro>
  semanaInfo: Map<string, { feitos: number; meta: number }>
  resumo: ReturnType<typeof resumoDoDia>
  streak: number
  hoje: string
  rotinas: Rotina[] | undefined
  onIniciarRotina: (r: Rotina) => void
  onEditar: (h: Habito) => void
}) {
  const dow = getDay(parseISO(hoje))
  const devidos = useMemo(() => ordenarHabitos(ativos.filter((h) => devidoNoDia(h, hoje))), [ativos, hoje])
  const grupos = useMemo(() => {
    const g: Record<PeriodoDia, Habito[]> = { manha: [], tarde: [], noite: [], qualquer: [] }
    for (const h of devidos) g[periodoDeHorario(h.horario)].push(h)
    return g
  }, [devidos])
  const rotinasHoje = (rotinas ?? []).filter((r) => !r.arquivada && (!r.dias?.length || r.dias.includes(dow)))

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoProgresso resumo={resumo} streak={streak} ehHoje />

      {rotinasHoje.length > 0 && (
        <section className="flex flex-col gap-2">
          <span className="px-1 text-[13px] font-semibold text-muted">Rotinas</span>
          <div className="flex flex-col gap-2">
            {rotinasHoje.map((r) => (
              <button key={r.id} onClick={() => onIniciarRotina(r)} className="flex items-center gap-3 rounded-2xl border border-line bg-surface/50 p-3 text-left hover:bg-hover/50">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[20px]" style={{ backgroundColor: `color-mix(in srgb, ${r.cor} 16%, var(--vida-surface))` }}>{r.icone}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{r.nome}</span>
                  <span className="block text-[12px] text-muted">{r.etapas.length} etapas{r.periodo && r.periodo !== 'qualquer' ? ` · ${ROTULO_PERIODO[r.periodo]}` : ''}</span>
                </span>
                <span className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-[12.5px] font-semibold text-surface">▶ Iniciar</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {devidos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line py-8 text-center text-[13px] text-muted">Não há hábitos planejados para hoje.</p>
      ) : (
        ORDEM_PERIODO.filter((p) => grupos[p].length > 0).map((p) => (
          <section key={p} className="flex flex-col gap-2">
            <span className="px-1 text-[13px] font-semibold text-muted">{ROTULO_PERIODO[p]}</span>
            <div className="flex flex-col gap-2">
              {grupos[p].map((h) => (
                <CartaoHabito key={h.id} habito={h} registro={regsDia.get(h.id)} data={hoje} semana={semanaInfo.get(h.id)} onEditar={onEditar} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}

/* ------------------------------ Biblioteca -------------------------------- */

function Biblioteca({ cats, ativos, regsDia, semanaInfo, data, semCatRecolhida, onToggleSemCat, onEditar, onToggleCat }: {
  cats: CategoriaHabito[]
  ativos: Habito[]
  regsDia: Map<string, HabitoRegistro>
  semanaInfo: Map<string, { feitos: number; meta: number }>
  data: string
  semCatRecolhida: boolean
  onToggleSemCat: () => void
  onEditar: (h: Habito) => void
  onToggleCat: (c: CategoriaHabito) => void
}) {
  const idsCat = new Set(cats.map((c) => c.id))
  const porCategoria = new Map<string, Habito[]>()
  const semCategoria: Habito[] = []
  for (const h of ordenarHabitos(ativos)) {
    if (h.categoriaId && idsCat.has(h.categoriaId)) {
      const arr = porCategoria.get(h.categoriaId) ?? []
      arr.push(h)
      porCategoria.set(h.categoriaId, arr)
    } else semCategoria.push(h)
  }

  return (
    <div className="flex flex-col gap-4">
      {cats.map((c) => (
        <CategoriaSecao key={c.id} nome={c.nome} cor={c.cor} icone={c.icone} recolhida={!!c.recolhida} habitos={porCategoria.get(c.id) ?? []} registros={regsDia} semanaInfo={semanaInfo} data={data} onToggle={() => onToggleCat(c)} onEditar={onEditar} />
      ))}
      {semCategoria.length > 0 && (
        <section className="flex flex-col gap-2">
          <button onClick={onToggleSemCat} className="flex items-center gap-2 rounded-lg px-1 py-1 text-left text-[14px] font-semibold text-muted hover:bg-hover">
            Sem categoria <span className="text-[12px] font-normal">{semCategoria.length}</span>
          </button>
          <div className="lume-colapso" data-recolhido={semCatRecolhida}>
            <div className="lume-colapso-conteudo">
              <div className="flex flex-col gap-2 pl-1">
                {semCategoria.map((h) => (
                  <CartaoHabito key={h.id} habito={h} registro={regsDia.get(h.id)} data={data} semana={semanaInfo.get(h.id)} onEditar={onEditar} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

/* -------------------------------- Insights -------------------------------- */

function AbaInsights({ ativos, registros, streak }: { ativos: Habito[]; registros: HabitoRegistro[]; streak: number }) {
  const g = useMemo(() => estatGlobais(ativos, registros, 30), [ativos, registros])
  const ranking = useMemo(() => rankingHabitos(ativos, registros, 30).slice(0, 5), [ativos, registros])

  // Leitura observacional (heurística): qual dia da semana costuma ser mais
  // consistente, nas últimas 8 semanas. Correlação, não causa.
  const padraoDia = useMemo(() => {
    if (ativos.length === 0) return null
    const dias = ultimosDias(56)
    const soma = Array(7).fill(0)
    const cont = Array(7).fill(0)
    for (const d of dias) {
      const devidos = ativos.filter((h) => devidoNoDia(h, d))
      if (devidos.length === 0) continue
      const dow = getDay(parseISO(d))
      soma[dow] += resumoDoDia(ativos, registros, d).fracao
      cont[dow] += 1
    }
    const medias = soma.map((s, i) => (cont[i] >= 2 ? s / cont[i] : -1))
    let melhor = -1, valor = -1
    medias.forEach((m, i) => { if (m > valor) { valor = m; melhor = i } })
    if (melhor < 0 || valor <= 0) return null
    return { dia: NOMES_DIA[melhor], pct: Math.round(valor * 100) }
  }, [ativos, registros])
  const tiles = [
    { rot: 'Hábitos ativos', val: String(g.ativos) },
    { rot: 'Conclusão (30d)', val: `${Math.round(g.taxa * 100)}%` },
    { rot: 'Dias perfeitos', val: String(g.diasPerfeitos) },
    { rot: 'Sequência', val: `${streak} d` },
  ]
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.rot} className="rounded-xl border border-line bg-surface/50 px-3 py-2.5">
            <div className="text-[18px] font-bold tabular-nums">{t.val}</div>
            <div className="text-[11px] text-muted">{t.rot}</div>
          </div>
        ))}
      </div>

      {ranking.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface/50 p-4">
          <span className="mb-2.5 block text-[12px] font-semibold uppercase tracking-wide text-muted">Consistência por hábito</span>
          <ul className="flex flex-col gap-2.5">
            {ranking.map((l) => (
              <li key={l.habito.id} className="flex items-center gap-2.5">
                <span className="min-w-0 flex-1 truncate text-[13.5px]">{l.habito.nome}</span>
                <span className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-hover">
                  <span className="block h-full rounded-full" style={{ width: `${Math.round(l.taxa * 100)}%`, backgroundColor: l.habito.cor ?? 'var(--vida-accent)' }} />
                </span>
                <span className="w-9 shrink-0 text-right text-[12px] font-semibold tabular-nums text-muted">{Math.round(l.taxa * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-line bg-accent/[0.06] p-4">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">Leitura</span>
          <span className="text-[10px] text-muted/70">observacional · correlação, não causa</span>
        </div>
        <p className="mt-1.5 text-[13.5px] leading-snug">
          {g.ativos === 0 ? 'Crie hábitos para o Lume acompanhar sua consistência ao longo do tempo.'
            : `Nos últimos 30 dias você concluiu ${Math.round(g.taxa * 100)}% do que estava previsto, com ${g.diasPerfeitos} dia${g.diasPerfeitos === 1 ? '' : 's'} completo${g.diasPerfeitos === 1 ? '' : 's'}. A sequência não deve pesar: um dia de folga não apaga o seu progresso.`}
        </p>
        {padraoDia && (
          <p className="mt-1.5 text-[13.5px] leading-snug">📅 Observando as últimas semanas, <b className="capitalize">{padraoDia.dia}</b> tende a ser o seu dia mais consistente ({padraoDia.pct}%).</p>
        )}
        <Link to="/habitos/estatisticas" className="mt-2 inline-block text-[12.5px] font-medium text-accent">Ver estatísticas completas →</Link>
      </div>
    </div>
  )
}
