import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { format, isToday, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { IconMais } from '../../../core/components/Icons'
import { useAgora, minutosDoDia } from '../../hoje/agora'
import { useContextos } from '../hooks'
import type { Task } from '../../tarefas/types'
import { iniciais } from '../categorias'
import { expandirEventos, paraHHMM } from '../db'
import type { Evento } from '../types'
import {
  analisePeriodo,
  cargaPorHora,
  estatisticas,
  faixaHoras,
  planoDoDia,
  proximoCompromisso,
  type GrupoSobreposto,
  type ItemPlano,
  type PlanoDia,
} from '../planner'

const ZOOM_MIN = 20
const ZOOM_MAX = 300
const ZOOM_PADRAO = 48
const CHAVE_ZOOM = 'lume-agenda-zoom'

function nomeDiaCurto(iso: string): string {
  const d = parseISO(iso)
  if (isToday(d)) return 'Hoje'
  return format(d, 'EEEE', { locale: ptBR })
}

function durLegivel(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h && m) return `${h}h${String(m).padStart(2, '0')}`
  if (h) return `${h}h`
  return `${m} min`
}

/** Estilo do cartão de evento: fundo claro, barra e ícone na cor da categoria. */
function EventoCard({
  it,
  ini,
  hpx,
  onAbrir,
  left = 4,
  right = 4,
  zIndex,
}: {
  it: ItemPlano
  ini: number
  hpx: number
  onAbrir: () => void
  left?: number
  right?: number
  zIndex?: number
}) {
  const top = ((it.inicioMin - ini) / 60) * hpx
  // Altura proporcional EXATA à duração — sem mínimo. Quem controla a
  // legibilidade é o zoom (o título aparece quando cabe e some quando não).
  const altura = Math.max(3, ((it.fimMin - it.inicioMin) / 60) * hpx - 1)
  const tarefa = it.tipo === 'tarefa'
  const pendente = it.tipo === 'evento' && it.presenca !== 'confirmado'
  const recusado = it.presenca === 'recusado'
  const baixo = altura < 42
  const minusculo = altura < 26
  return (
    <button
      onClick={onAbrir}
      title={`${it.titulo} · ${paraHHMM(it.inicioMin)}–${paraHHMM(it.fimMin)}`}
      className={`group/ev absolute flex flex-col justify-start overflow-hidden rounded-lg text-left shadow-sm transition-all hover:z-30 hover:shadow-md ${
        minusculo ? 'px-1.5 py-0' : 'rounded-xl px-2.5 pt-1 pb-1.5'
      } ${it.concluida ? 'opacity-60' : ''} ${tarefa ? 'border border-dashed' : 'border-l-4'}`}
      style={{
        top,
        height: altura,
        left,
        right,
        zIndex,
        borderColor: it.cor,
        backgroundColor: tarefa ? 'var(--vida-surface)' : `color-mix(in srgb, ${it.cor} 12%, var(--vida-surface))`,
        touchAction: 'manipulation',
      }}
    >
      <div className={`flex items-start gap-1.5`}>
        <span className={`shrink-0 leading-none ${minusculo ? 'text-[10px]' : 'text-[13px]'}`} aria-hidden style={tarefa ? { color: it.cor } : undefined}>
          {it.icone}
        </span>
        <span
          className={`min-w-0 flex-1 truncate font-semibold leading-tight ${minusculo ? 'text-[10.5px]' : 'text-[12.5px]'} ${
            recusado || it.concluida ? 'line-through opacity-70' : ''
          }`}
        >
          {it.titulo}
        </span>
      </div>
      {!baixo && (
        <div className="mt-0.5 truncate pl-[18px] text-[11px] text-muted">
          {paraHHMM(it.inicioMin)}–{paraHHMM(it.fimMin)}
          {it.local ? ` · ${it.local}` : ''}
        </div>
      )}
      {!baixo && it.participantes && it.participantes.length > 0 && (
        <div className="mt-1 flex items-center gap-0.5 pl-[18px]">
          {it.participantes.slice(0, 4).map((n, i) => (
            <span
              key={i}
              className="flex size-5 items-center justify-center rounded-full border border-surface bg-hover text-[8px] font-bold text-muted"
              style={{ marginLeft: i ? -6 : 0 }}
              title={n}
            >
              {iniciais(n)}
            </span>
          ))}
          {it.participantes.length > 4 && (
            <span className="ml-0.5 text-[10px] text-muted">+{it.participantes.length - 4}</span>
          )}
        </div>
      )}
      {pendente && !recusado && (
        <span className="absolute right-1.5 top-1.5 text-[9px] font-medium text-muted">talvez</span>
      )}
    </button>
  )
}

/**
 * Um grupo de sobreposição. Em vez de empilhar cartas ou dividir em colunas,
 * os eventos ficam em camadas: os mais LONGOS ao fundo (largura cheia) e os
 * mais CURTOS por cima, levemente recuados à esquerda — assim a borda do
 * evento longo continua visível/clicável e o curto salta à frente. É a leitura
 * mais intuitiva quando um compromisso curto cai dentro de um bloco maior.
 */
function GrupoBloco({
  grupo,
  ini,
  hpx,
  onAbrirItem,
}: {
  grupo: GrupoSobreposto
  ini: number
  hpx: number
  onAbrirItem: (it: ItemPlano) => void
}) {
  if (grupo.itens.length === 1) {
    const it = grupo.itens[0]
    return <EventoCard it={it} ini={ini} hpx={hpx} onAbrir={() => onAbrirItem(it)} />
  }

  // Mais longos primeiro (ao fundo); empate desempata pelo horário de início.
  const ordenados = [...grupo.itens].sort((a, b) => {
    const dur = (b.fimMin - b.inicioMin) - (a.fimMin - a.inicioMin)
    return dur !== 0 ? dur : a.inicioMin - b.inicioMin
  })
  const PASSO = 10 // recuo por camada
  return (
    <>
      {ordenados.map((it, idx) => (
        <EventoCard
          key={it.id}
          it={it}
          ini={ini}
          hpx={hpx}
          onAbrir={() => onAbrirItem(it)}
          left={4 + idx * PASSO}
          right={4}
          zIndex={10 + idx}
        />
      ))}
    </>
  )
}

/**
 * Cabeçalho do dia. Fica numa faixa FIXA acima da área rolável (não é sticky
 * sobreposto ao conteúdo). Assim os cantos superiores arredondados nunca têm
 * nada rolando por trás — some a "ponta" que aparecia atrás do título ao rolar.
 */
function CabecalhoDia({ plano, ehHoje }: { plano: PlanoDia; ehHoje: boolean }) {
  const dt = parseISO(plano.dia)
  return (
    <header
      className={`flex items-center gap-2 rounded-t-2xl border-x border-t border-b px-3 py-2.5 ${ehHoje ? 'border-accent/40' : 'border-line'}`}
      style={{ backgroundColor: ehHoje ? 'color-mix(in srgb, var(--vida-accent) 12%, var(--vida-surface))' : 'var(--vida-surface)' }}
    >
      <span className={`text-[22px] font-bold leading-none ${ehHoje ? 'text-accent' : ''}`}>{format(dt, 'd')}</span>
      <div className="flex min-w-0 flex-col leading-none">
        <span className="truncate text-[12px] font-semibold capitalize">{nomeDiaCurto(plano.dia)}</span>
        <span className="text-[10px] uppercase tracking-wide text-muted">{format(dt, 'MMM', { locale: ptBR })}</span>
      </div>
    </header>
  )
}

function CorpoDia({
  plano,
  ini,
  fim,
  hpx,
  agoraMin,
  ehHoje,
  onAbrirEvento,
  onAbrirTarefa,
  onCriar,
  onAbrirContextos,
}: {
  plano: PlanoDia
  ini: number
  fim: number
  hpx: number
  agoraMin: number
  ehHoje: boolean
  onAbrirEvento: (e: Evento) => void
  onAbrirTarefa: (t: Task) => void
  onCriar: (data: string, iniMin: number, fimMin: number) => void
  onAbrirContextos: () => void
}) {
  const altura = ((fim - ini) / 60) * hpx
  const horas: number[] = []
  for (let h = Math.ceil(ini / 60); h <= fim / 60; h += 1) horas.push(h)

  // Prévia do bloco de tempo: 1º toque cria a prévia (sem gravar nada);
  // arrastar ajusta o horário; tocar na prévia confirma e abre "novo evento".
  const [previa, setPrevia] = useState<{ ini: number; fim: number } | null>(null)
  const arrasto = useRef<{ tipo: 'mover' | 'fim'; y0: number; ini0: number; fim0: number; moveu: boolean } | null>(null)

  function abrirItem(it: ItemPlano) {
    if (it.tipo === 'evento') onAbrirEvento(it.ref as Evento)
    else onAbrirTarefa(it.ref as Task)
  }

  function minutoEm(clientY: number, el: HTMLElement): number {
    const r = el.getBoundingClientRect()
    const min = ini + ((clientY - r.top) / hpx) * 60
    return Math.min(fim, Math.max(ini, Math.round(min / 15) * 15))
  }

  function clicarVazio(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return
    const m = Math.min(fim - 30, minutoEm(e.clientY, e.currentTarget))
    setPrevia({ ini: m, fim: m + 60 })
  }

  function iniciarArrasto(e: React.PointerEvent, tipo: 'mover' | 'fim') {
    if (!previa) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    arrasto.current = { tipo, y0: e.clientY, ini0: previa.ini, fim0: previa.fim, moveu: false }
  }

  function moverArrasto(e: React.PointerEvent) {
    const a = arrasto.current
    if (!a || !previa) return
    const delta = Math.round(((e.clientY - a.y0) / hpx) * 60 / 15) * 15
    if (Math.abs(e.clientY - a.y0) > 3) a.moveu = true
    if (a.tipo === 'mover') {
      const dur = a.fim0 - a.ini0
      const novoIni = Math.max(ini, Math.min(fim - dur, a.ini0 + delta))
      setPrevia({ ini: novoIni, fim: novoIni + dur })
    } else {
      const novoFim = Math.max(a.ini0 + 15, Math.min(fim, a.fim0 + delta))
      setPrevia({ ini: a.ini0, fim: novoFim })
    }
  }

  function soltarArrasto(e: React.PointerEvent) {
    const a = arrasto.current
    arrasto.current = null
    if (!a || !previa) return
    // Tocar na prévia (sem arrastar) confirma e abre o editor de evento.
    if (!a.moveu && a.tipo === 'mover') {
      const p = previa
      setPrevia(null)
      onCriar(plano.dia, p.ini, p.fim)
    }
    e.stopPropagation()
  }

  return (
    <div className="lume-entrada flex flex-col overflow-hidden rounded-b-2xl border-x border-b border-line bg-surface/40">
      {/* Faixa de dia inteiro */}
      {plano.diaInteiro.length > 0 && (
        <div className="flex flex-col gap-1 border-b border-line px-2 py-1.5">
          {plano.diaInteiro.map((it) => (
            <button
              key={it.id}
              onClick={() => abrirItem(it)}
              className="truncate rounded-lg px-2 py-1 text-left text-[11px] font-medium"
              style={{ backgroundColor: `color-mix(in srgb, ${it.cor} 16%, var(--vida-surface))`, color: it.cor }}
            >
              {it.icone} {it.titulo}
            </button>
          ))}
        </div>
      )}

      {/* Corpo com eixo de tempo */}
      <div className="relative shrink-0" style={{ height: altura }} onClick={clicarVazio}>
        {/* Contextos (fundo suave) */}
        {plano.contextos.map((c) => {
          const a = Math.max(c.inicioMin, ini)
          const b = Math.min(c.fimMin, fim)
          if (b <= a) return null
          return (
            <div
              key={c.id}
              className="pointer-events-none absolute inset-x-0"
              style={{ top: ((a - ini) / 60) * hpx, height: ((b - a) / 60) * hpx, backgroundColor: `color-mix(in srgb, ${c.cor} ${Math.round(c.opacidade * 100)}%, transparent)` }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); onAbrirContextos() }}
                className="pointer-events-auto absolute left-1.5 top-1 rounded px-1 text-[9px] font-medium uppercase tracking-wide text-muted/60 hover:bg-hover hover:text-ink"
                title={`Editar contexto “${c.rotulo}”`}
              >
                {c.icone} {c.rotulo}
              </button>
            </div>
          )
        })}

        {/* Linhas-guia de hora (de 1h em 1h) */}
        {horas.map((h) => (
          <div key={h} className="pointer-events-none absolute inset-x-0 border-t border-line/50" style={{ top: ((h * 60 - ini) / 60) * hpx }}>
            {(hpx >= 34 || h % 2 === 0) && <span className="absolute left-1 -top-[1px] bg-surface/40 px-0.5 text-[9px] text-muted/60">{String(h).padStart(2, '0')}h</span>}
          </div>
        ))}

        {/* Prazos (deadlines) — linhas finas */}
        {plano.deadlines.map((d) => (
          <button
            key={d.id}
            onClick={(e) => { e.stopPropagation(); onAbrirTarefa(d.ref) }}
            title={`Prazo ${paraHHMM(d.horarioMin)} · ${d.titulo}`}
            className="absolute inset-x-0 z-[15] flex items-center gap-1 px-1"
            style={{ top: ((d.horarioMin - ini) / 60) * hpx - 6 }}
          >
            <span className="shrink-0 rounded px-1 text-[8.5px] font-bold text-white" style={{ backgroundColor: d.cor }}>
              ⚑ {paraHHMM(d.horarioMin)}
            </span>
            <span className="h-0 flex-1 border-t border-dashed" style={{ borderColor: d.cor }} />
          </button>
        ))}

        {/* Linha do agora */}
        {ehHoje && agoraMin >= ini && agoraMin <= fim && (
          <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: ((agoraMin - ini) / 60) * hpx }}>
            <div className="relative border-t-2 border-red-500">
              <span className="absolute -left-0.5 -top-[5px] size-2.5 rounded-full bg-red-500" />
            </div>
          </div>
        )}

        {/* Eventos / tarefas */}
        {plano.grupos.map((g) => (
          <GrupoBloco key={g.id} grupo={g} ini={ini} hpx={hpx} onAbrirItem={abrirItem} />
        ))}

        {/* Prévia do novo evento — confirma ao tocar, arrasta para ajustar */}
        {previa && (
          <div
            className="lume-pop absolute z-[25] rounded-xl border-2 border-dashed border-accent bg-accent/10 px-2 py-1 text-left"
            style={{
              top: ((previa.ini - ini) / 60) * hpx,
              height: Math.max(26, ((previa.fim - previa.ini) / 60) * hpx - 1),
              left: 4,
              right: 4,
              touchAction: 'none',
              cursor: 'grab',
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => iniciarArrasto(e, 'mover')}
            onPointerMove={moverArrasto}
            onPointerUp={soltarArrasto}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-[11px] font-semibold text-accent">
                {paraHHMM(previa.ini)}–{paraHHMM(previa.fim)}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setPrevia(null) }}
                onPointerDown={(e) => e.stopPropagation()}
                className="shrink-0 rounded px-1 text-[13px] leading-none text-muted hover:text-ink"
                aria-label="Cancelar prévia"
              >
                ×
              </button>
            </div>
            <div className="truncate text-[9.5px] text-muted">toque para criar</div>
            {/* Alça inferior para ajustar duração */}
            <div
              onPointerDown={(e) => iniciarArrasto(e, 'fim')}
              onPointerMove={moverArrasto}
              onPointerUp={soltarArrasto}
              className="absolute inset-x-0 bottom-0 flex h-3 cursor-ns-resize items-center justify-center"
            >
              <span className="h-0.5 w-6 rounded-full bg-accent/60" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------ Painel lateral ---------------------------- */

function PainelInteligente({
  planos,
  eventos,
  dias,
  hoje,
  agoraMin,
  onAbrirEvento,
  onIrSemana,
  onCriar,
  onIrHoje,
}: {
  planos: PlanoDia[]
  eventos: Evento[]
  dias: string[]
  hoje: string
  agoraMin: number
  onAbrirEvento: (e: Evento) => void
  onIrSemana: () => void
  onCriar: () => void
  onIrHoje: () => void
}) {
  const est = useMemo(() => estatisticas(planos), [planos])
  // varre 14 dias à frente para o próximo compromisso
  const diasBusca = useMemo(() => {
    const out: string[] = []
    const base = parseISO(dias[0] < hoje ? hoje : dias[0])
    for (let i = 0; i < 14; i++) out.push(format(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i), 'yyyy-MM-dd'))
    return out
  }, [dias, hoje])
  const prox = useMemo(() => proximoCompromisso(eventos, diasBusca, hoje, agoraMin), [eventos, diasBusca, hoje, agoraMin])
  const analise = useMemo(() => analisePeriodo(planos, est, (iso) => {
    const d = parseISO(iso)
    return isToday(d) ? 'Hoje' : format(d, 'EEEE', { locale: ptBR })
  }), [planos, est])

  const rotuloProx = (() => {
    if (!prox) return null
    if (prox.emAndamento) return 'acontecendo agora'
    if (prox.faltamMin < 60) return `em ${prox.faltamMin} min`
    if (prox.faltamMin < 24 * 60) return `em ${durLegivel(prox.faltamMin)}`
    const d = parseISO(prox.dia)
    return isToday(d) ? 'hoje' : format(d, "EEE d", { locale: ptBR })
  })()

  return (
    <div className="flex flex-col gap-3">
      {/* Próximo compromisso */}
      <div className="rounded-2xl border border-line bg-surface/60 p-3.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Próximo compromisso</span>
        {prox ? (
          <button onClick={() => onAbrirEvento(prox.evento)} className="mt-2 block w-full text-left">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="min-w-0 flex-1 truncate text-[17px] font-bold leading-tight">{prox.evento.titulo}</h3>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[13px]">
              <span className="font-semibold text-accent">{rotuloProx}</span>
              <span className="text-muted">· {prox.evento.inicio}</span>
            </div>
            {prox.evento.local && <div className="mt-0.5 truncate text-[12px] text-muted">📍 {prox.evento.local}</div>}
          </button>
        ) : (
          <p className="mt-2 text-[13px] text-muted">Nada agendado por perto.</p>
        )}
      </div>

      {/* Foco do período */}
      <div className="rounded-2xl border border-line bg-surface/60 p-3.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Foco do período</span>
        <p className="mt-1.5 text-[13.5px] leading-snug">{analise.foco}</p>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { rot: 'Eventos', val: String(est.totalEventos) },
          { rot: 'Tarefas', val: String(est.totalTarefas) },
          { rot: 'Ocupado', val: durLegivel(est.ocupadoMin) },
          { rot: 'Livre', val: durLegivel(est.livreMin) },
        ].map((s) => (
          <div key={s.rot} className="rounded-xl border border-line bg-surface/60 px-3 py-2">
            <div className="text-[17px] font-bold tabular-nums">{s.val}</div>
            <div className="text-[11px] text-muted">{s.rot}</div>
          </div>
        ))}
      </div>

      {/* Análise */}
      {analise.observacoes.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface/60 p-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Análise</span>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {analise.observacoes.map((o, i) => (
              <li key={i} className="flex gap-1.5 text-[12.5px] leading-snug text-ink/90">
                <span className="text-accent">·</span>
                {o}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Botões rápidos */}
      <div className="flex flex-col gap-1.5">
        <button onClick={onCriar} className="flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-ink text-[13px] font-medium text-surface">
          <IconMais width={15} height={15} /> Criar evento
        </button>
        <div className="flex gap-1.5">
          <button onClick={onIrSemana} className="min-h-9 flex-1 rounded-xl border border-line text-[13px] font-medium text-muted hover:text-ink">
            Abrir semana
          </button>
          <button onClick={onIrHoje} className="min-h-9 flex-1 rounded-xl border border-line text-[13px] font-medium text-muted hover:text-ink">
            Ir para hoje
          </button>
        </div>
      </div>
    </div>
  )
}

/* --------------------------- Linha de carga inferior ---------------------- */

function LinhaCarga({ planos, iniH, fimH }: { planos: PlanoDia[]; iniH: number; fimH: number }) {
  const horas = Array.from({ length: fimH - iniH }, (_, i) => iniH + i)
  return (
    <div className="rounded-2xl border border-line bg-surface/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Ritmo do período</span>
        <span className="text-[10px] text-muted/70">carga por hora</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {planos.map((p) => {
          const carga = cargaPorHora(p, iniH, fimH)
          return (
            <div key={p.dia} className="flex items-center gap-2">
              <span className="w-8 shrink-0 text-[10px] font-medium capitalize text-muted">
                {isToday(parseISO(p.dia)) ? 'Hoje' : format(parseISO(p.dia), 'EEE', { locale: ptBR })}
              </span>
              <div className="flex flex-1 items-end gap-[2px]" style={{ height: 22 }}>
                {carga.map((min, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm transition-all"
                    title={`${String(iniH + i).padStart(2, '0')}h · ${min} min`}
                    style={{
                      height: `${Math.max(6, (min / 60) * 100)}%`,
                      backgroundColor: min === 0 ? 'var(--vida-line)' : `color-mix(in srgb, var(--vida-accent) ${30 + (min / 60) * 55}%, transparent)`,
                    }}
                  />
                ))}
              </div>
            </div>
          )
        })}
        {/* eixo de horas */}
        <div className="flex items-center gap-2">
          <span className="w-8 shrink-0" />
          <div className="flex flex-1 gap-[2px]">
            {horas.map((h) => (
              <span key={h} className="flex-1 text-center text-[8px] text-muted/60">
                {h % 3 === 0 ? `${h}h` : ''}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------- Componente ------------------------------ */

export function PlannerTresDias({
  dias,
  eventos,
  tarefas,
  hoje,
  onAbrirEvento,
  onAbrirTarefa,
  onCriar,
  onIrSemana,
  onIrHoje,
  onAbrirContextos,
  mostrarPainel = true,
}: {
  dias: string[]
  eventos: Evento[]
  tarefas: Task[]
  hoje: string
  onAbrirEvento: (e: Evento) => void
  onAbrirTarefa: (t: Task) => void
  onCriar: (data: string, iniMin: number, fimMin: number) => void
  onIrSemana: () => void
  onIrHoje: () => void
  onAbrirContextos: () => void
  mostrarPainel?: boolean
}) {
  const agora = useAgora()
  const agoraMin = minutosDoDia(agora)
  const contextos = useContextos()
  const [painelMin, setPainelMin] = useState(false)
  const [horaPx, setHoraPx] = useState<number>(() => {
    const salvo = typeof localStorage !== 'undefined' ? Number(localStorage.getItem(CHAVE_ZOOM)) : NaN
    return salvo >= ZOOM_MIN && salvo <= ZOOM_MAX ? salvo : ZOOM_PADRAO
  })
  const scrollRef = useRef<HTMLDivElement>(null)
  // Largura da barra de rolagem do corpo — reservada também no cabeçalho fixo
  // para que as colunas de título fiquem alinhadas com as colunas de eventos.
  const [sbw, setSbw] = useState(0)

  function ajustarZoom(fator: number) {
    setHoraPx((z) => {
      const novo = Math.round(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z * fator)))
      try { localStorage.setItem(CHAVE_ZOOM, String(novo)) } catch { /* ignore */ }
      return novo
    })
  }

  // Dia inteiro é alto: ao abrir, rola até perto do horário atual (com folga).
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const alvo = (Math.max(0, agoraMin - 90) / 60) * horaPx
    el.scrollTop = Math.min(alvo, el.scrollHeight)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dias[0]])

  const ctx = useMemo(() => contextos ?? [], [contextos])
  const ocorrencias = useMemo(() => expandirEventos(eventos, dias), [eventos, dias])
  const planos = useMemo(
    () => dias.map((d) => planoDoDia(d, ocorrencias, tarefas, { contextos: ctx })),
    [dias, ocorrencias, tarefas, ctx],
  )
  const { ini, fim } = useMemo(() => faixaHoras(planos), [planos])
  const iniH = Math.floor(ini / 60)
  const fimH = Math.ceil(fim / 60)

  // Mede a barra de rolagem (0 em navegadores com overlay). Reavalia quando o
  // conteúdo muda de altura (dias/zoom) e ao redimensionar a janela.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const medir = () => setSbw(el.offsetWidth - el.clientWidth)
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [planos, horaPx])

  return (
    <div className="flex flex-col gap-3">
      {/* Controle de zoom (proporção dos blocos), estilo Google Agenda */}
      <div className="flex items-center justify-end gap-1">
        <span className="mr-1 text-[11px] text-muted">Zoom</span>
        <button onClick={() => ajustarZoom(1 / 1.3)} disabled={horaPx <= ZOOM_MIN} aria-label="Diminuir zoom" className="flex size-7 items-center justify-center rounded-full border border-line text-[15px] font-medium text-muted hover:text-ink disabled:opacity-40">−</button>
        <button onClick={() => ajustarZoom(1.3)} disabled={horaPx >= ZOOM_MAX} aria-label="Aumentar zoom" className="flex size-7 items-center justify-center rounded-full border border-line text-[15px] font-medium text-muted hover:text-ink disabled:opacity-40">+</button>
      </div>
      <div className="flex items-start gap-3">
        {/* Caixa da grade com ALTURA FIXA: o cabeçalho fica no topo (não rola)
            e só o corpo rola por dentro. Assim os títulos ficam sempre
            visíveis e nada passa por trás dos cantos arredondados. */}
        <div className="flex min-w-0 flex-1 flex-col" style={{ height: 'calc(100vh - 210px)' }}>
          {(() => {
            const gapCls = planos.length > 4 ? 'gap-1' : 'gap-2.5'
            const colCls = `min-w-0 flex-1 ${planos.length === 1 ? 'sm:max-w-2xl' : ''}`
            return (
              <>
                {/* Faixa de cabeçalhos — reserva a largura da barra de rolagem
                    à direita para alinhar com o corpo rolável. */}
                <div className={`flex shrink-0 ${gapCls}`} style={{ paddingRight: sbw }}>
                  {planos.map((p) => (
                    <div key={p.dia} className={colCls}>
                      <CabecalhoDia plano={p} ehHoje={p.dia === hoje} />
                    </div>
                  ))}
                </div>
                {/* Corpo rolável — só os eventos rolam. */}
                <div
                  ref={scrollRef}
                  className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-1"
                  style={{ scrollbarGutter: 'stable' }}
                >
                  <div className={`flex ${gapCls}`}>
                    {planos.map((p) => (
                      <div key={p.dia} className={colCls}>
                        <CorpoDia
                          plano={p}
                          ini={ini}
                          fim={fim}
                          hpx={horaPx}
                          agoraMin={agoraMin}
                          ehHoje={p.dia === hoje}
                          onAbrirEvento={onAbrirEvento}
                          onAbrirTarefa={onAbrirTarefa}
                          onCriar={onCriar}
                          onAbrirContextos={onAbrirContextos}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )
          })()}
        </div>
        {mostrarPainel && !painelMin && (
          <aside className="hidden w-72 shrink-0 lg:block">
            <div className="mb-2 flex justify-end">
              <button
                onClick={() => setPainelMin(true)}
                className="rounded-full border border-line px-2.5 py-1 text-[12px] font-medium text-muted hover:text-ink"
                title="Minimizar painel"
              >
                Ocultar painel →
              </button>
            </div>
            <PainelInteligente
              planos={planos}
              eventos={eventos}
              dias={dias}
              hoje={hoje}
              agoraMin={agoraMin}
              onAbrirEvento={onAbrirEvento}
              onIrSemana={onIrSemana}
              onCriar={() => onCriar(dias[0], 9 * 60, 10 * 60)}
              onIrHoje={onIrHoje}
            />
          </aside>
        )}
        {mostrarPainel && painelMin && (
          <button
            onClick={() => setPainelMin(false)}
            className="hidden shrink-0 self-start rounded-full border border-line bg-surface/60 px-2 py-2 text-[12px] font-medium text-muted hover:text-ink lg:block"
            title="Mostrar painel"
          >
            ←
          </button>
        )}
      </div>

      {mostrarPainel && (
        <div className="lg:hidden">
          <PainelInteligente
            planos={planos}
            eventos={eventos}
            dias={dias}
            hoje={hoje}
            agoraMin={agoraMin}
            onAbrirEvento={onAbrirEvento}
            onIrSemana={onIrSemana}
            onCriar={() => onCriar(dias[0], 9 * 60, 10 * 60)}
            onIrHoje={onIrHoje}
          />
        </div>
      )}

      {mostrarPainel && <LinhaCarga planos={planos} iniH={iniH} fimH={fimH} />}
    </div>
  )
}
