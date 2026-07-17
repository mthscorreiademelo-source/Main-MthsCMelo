import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPE } from 'react'
import { format, isToday, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { atualizarTarefa, corPrioridade } from '../../tarefas/db'
import type { Task } from '../../tarefas/types'
import { arredondar, atualizarEvento, disporSobreposicao, expandirEventos, paraHHMM, paraMin } from '../db'
import type { Evento, Presenca } from '../types'

const HORA_PX = 48
const ALTURA = 24 * HORA_PX
const DUR_PADRAO = 60

type Bloco = {
  id: string
  tipo: 'evento' | 'tarefa'
  ref: Evento | Task
  inicioMin: number
  fimMin: number
  titulo: string
  cor: string
  presenca?: Presenca
  ehOcorrencia?: boolean
  concluida?: boolean
}

interface Arrasto {
  id: string
  modo: 'mover' | 'resize'
  dia: string
  inicioMin: number
  fimMin: number
  moveu: boolean
}

/** Estilo do bloco conforme presença (evento): confirmado = sólido; pendente/
 *  recusado = vazado (moldura colorida). O nome riscado (recusado) fica na UI. */
function estiloEvento(cor: string, presenca?: Presenca): React.CSSProperties {
  if (presenca === 'confirmado') return { backgroundColor: cor, color: '#fff' }
  return { backgroundColor: 'var(--vida-bg)', color: cor, border: `1.5px solid ${cor}` }
}

export function GradeTempo({
  dias,
  eventos,
  tarefas,
  onAbrirEvento,
  onAbrirTarefa,
  onCriar,
  onPanDias,
}: {
  dias: string[]
  eventos: Evento[]
  tarefas: Task[]
  onAbrirEvento: (e: Evento) => void
  onAbrirTarefa: (t: Task) => void
  onCriar: (data: string, inicioMin: number, fimMin: number) => void
  onPanDias: (delta: number) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [arrasto, setArrasto] = useState<Arrasto | null>(null)
  const [criando, setCriando] = useState<{ dia: string; a: number; b: number } | null>(null)
  const arrastoRef = useRef<Arrasto | null>(null)
  const criandoRef = useRef<typeof criando>(null)
  arrastoRef.current = arrasto
  criandoRef.current = criando

  const ocorrencias = useMemo(() => expandirEventos(eventos, dias), [eventos, dias])

  // Ao abrir, foca no horário atual (com um pouco de folga antes, e os
  // próximos eventos logo abaixo) em vez de começar no início do dia.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const d = new Date()
    const nowMin = d.getHours() * 60 + d.getMinutes()
    const alvo = (nowMin / 60) * HORA_PX - Math.max(el.clientHeight * 0.28, 90)
    el.scrollTop = Math.max(0, Math.min(alvo, ALTURA - el.clientHeight))
  }, [])

  const [agoraMin, setAgoraMin] = useState(() => {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  })
  useEffect(() => {
    const t = setInterval(() => {
      const d = new Date()
      setAgoraMin(d.getHours() * 60 + d.getMinutes())
    }, 60_000)
    return () => clearInterval(t)
  }, [])

  function blocosTimados(dia: string): Bloco[] {
    const evs: Bloco[] = ocorrencias
      .filter((o) => o.data === dia && !o.evento.diaInteiro)
      .map((o) => ({
        id: `ev:${o.evento.id}:${dia}`,
        tipo: 'evento',
        ref: o.evento,
        inicioMin: paraMin(o.evento.inicio),
        fimMin: Math.max(paraMin(o.evento.inicio) + 15, paraMin(o.evento.fim)),
        titulo: o.evento.titulo,
        cor: o.evento.cor ?? '#4073ff',
        presenca: o.evento.presenca,
        ehOcorrencia: o.ehOcorrencia,
      }))
    // Bloco de tempo dedicado (Reclaim): quando/onde vou fazer a tarefa.
    const tks: Bloco[] = tarefas
      .filter((t) => t.blocoData === dia && t.blocoInicio)
      .map((t) => {
        const ini = paraMin(t.blocoInicio!)
        return {
          id: `ta:${t.id}`,
          tipo: 'tarefa',
          ref: t,
          inicioMin: ini,
          fimMin: ini + (t.duracaoMin ?? DUR_PADRAO),
          titulo: t.titulo,
          cor: corPrioridade(t.prioridade),
          concluida: !!t.concluidaEm,
        }
      })
    return [...evs, ...tks]
  }

  function minDoPonto(clientY: number, colEl: HTMLElement): number {
    const r = colEl.getBoundingClientRect()
    return Math.max(0, Math.min(1440, ((clientY - r.top) / HORA_PX) * 60))
  }
  function colunaDoPonto(clientX: number, clientY: number): HTMLElement | null {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null
    return (el?.closest('[data-dia]') as HTMLElement | null) ?? null
  }

  // Mouse: arrastar cria um intervalo (clique simples = 1h).
  function criarComMouse(e: RPE, dia: string, colEl: HTMLElement) {
    const a = arredondar(minDoPonto(e.clientY, colEl))
    setCriando({ dia, a, b: a + DUR_PADRAO })
    const mover = (ev: PointerEvent) => setCriando({ dia, a, b: arredondar(minDoPonto(ev.clientY, colEl)) })
    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      const c = criandoRef.current
      setCriando(null)
      if (!c) return
      const ini = Math.min(c.a, c.b)
      const fim = Math.max(c.a, c.b)
      onCriar(dia, ini, fim - ini < 15 ? ini + DUR_PADRAO : fim)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  /**
   * Toque na área vazia: distingue os gestos para não criar evento sem querer.
   * - toque rápido (sem mover) → cria 1h
   * - arrasto vertical → deixa a grade rolar (nativo)
   * - arrasto horizontal → navega os dias ao soltar (fluido)
   */
  function apontarGrade(e: RPE, dia: string, colEl: HTMLElement) {
    if (e.button != null && e.button !== 0) return
    if (e.pointerType === 'mouse') {
      criarComMouse(e, dia, colEl)
      return
    }
    const x0 = e.clientX
    const y0 = e.clientY
    const t0 = e.timeStamp
    let dir: 'scroll' | 'pan' | null = null
    const mover = (ev: PointerEvent) => {
      if (dir) return
      const dx = ev.clientX - x0
      const dy = ev.clientY - y0
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.3) dir = 'pan'
      else if (Math.abs(dy) > 10) dir = 'scroll'
    }
    const soltar = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      const dx = ev.clientX - x0
      const dy = ev.clientY - y0
      const dt = ev.timeStamp - t0
      if (dir === 'pan') {
        const colW = colEl.getBoundingClientRect().width || 1
        const delta = -Math.round(dx / colW)
        if (delta !== 0) onPanDias(delta)
      } else if (!dir && Math.abs(dx) < 8 && Math.abs(dy) < 8 && dt < 600) {
        const min = arredondar(minDoPonto(y0, colEl))
        onCriar(dia, min, min + DUR_PADRAO)
      }
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  function iniciarArrasto(e: RPE, bloco: Bloco, dia: string, modo: 'mover' | 'resize') {
    e.stopPropagation()
    // Ocorrências geradas não arrastam — só abrem a série.
    if (bloco.ehOcorrencia) {
      onAbrirEvento(bloco.ref as Evento)
      return
    }
    const colEl = (e.currentTarget as HTMLElement).closest('[data-dia]') as HTMLElement
    const y0 = e.clientY
    const dur = bloco.fimMin - bloco.inicioMin
    setArrasto({ id: bloco.id, modo, dia, inicioMin: bloco.inicioMin, fimMin: bloco.fimMin, moveu: false })

    const mover = (ev: PointerEvent) => {
      const a = arrastoRef.current
      if (!a) return
      const moveu = a.moveu || Math.abs(ev.clientY - y0) > 4
      if (modo === 'resize') {
        const novoFim = arredondar(minDoPonto(ev.clientY, colEl))
        setArrasto({ ...a, fimMin: Math.max(a.inicioMin + 15, novoFim), moveu })
      } else {
        const alvoCol = colunaDoPonto(ev.clientX, ev.clientY) ?? colEl
        const diaAlvo = alvoCol.getAttribute('data-dia') ?? a.dia
        const centro = arredondar(minDoPonto(ev.clientY, alvoCol))
        const ini = Math.max(0, Math.min(1440 - dur, centro - dur / 2))
        setArrasto({ ...a, dia: diaAlvo, inicioMin: ini, fimMin: ini + dur, moveu })
      }
    }
    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      const a = arrastoRef.current
      setArrasto(null)
      if (!a) return
      if (!a.moveu) {
        if (bloco.tipo === 'evento') onAbrirEvento(bloco.ref as Evento)
        else onAbrirTarefa(bloco.ref as Task)
        return
      }
      if (bloco.tipo === 'evento') {
        const ev = bloco.ref as Evento
        atualizarEvento(ev.id, { data: a.dia, inicio: paraHHMM(a.inicioMin), fim: paraHHMM(a.fimMin) })
      } else {
        const t = bloco.ref as Task
        atualizarTarefa(t.id, { blocoData: a.dia, blocoInicio: paraHHMM(a.inicioMin), duracaoMin: a.fimMin - a.inicioMin })
      }
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  const HeaderDia = (
    <div className="flex bg-surface/60">
      <div className="w-12 shrink-0" />
      {dias.map((d) => {
        const dt = parseISO(d)
        const hoje = isToday(dt)
        return (
          <div key={d} className="flex-1 border-l border-line py-2 text-center">
            <div className="text-[11px] uppercase text-muted">{format(dt, 'EEE', { locale: ptBR })}</div>
            <div
              className={`mx-auto mt-0.5 flex size-7 items-center justify-center rounded-full text-[14px] font-semibold ${
                hoje ? 'bg-accent text-white' : ''
              }`}
            >
              {format(dt, 'd')}
            </div>
          </div>
        )
      })}
    </div>
  )

  const FaixaDia = (
    <div className="flex border-t border-line bg-bg">
      <div className="flex w-12 shrink-0 items-center justify-center text-[9px] uppercase text-muted/70">dia</div>
      {dias.map((dia) => {
        // Dia inteiro (single, com recorrência) + eventos de vários dias que cruzam este dia.
        const evsBanda: Evento[] = [
          ...ocorrencias.filter((o) => o.data === dia && o.evento.diaInteiro && !o.evento.dataFim).map((o) => o.evento),
          ...eventos.filter((e) => e.dataFim && e.dataFim > e.data && e.data <= dia && dia <= e.dataFim),
        ]
        const tks = tarefas.filter((t) => t.data === dia && !t.horario && !t.blocoData && !t.concluidaEm)
        return (
          <div key={dia} className="flex min-h-8 flex-1 flex-col gap-0.5 border-l border-line p-1">
            {evsBanda.map((ev) => {
              const cor = ev.cor ?? '#4073ff'
              const recusado = ev.presenca === 'recusado'
              return (
                <button
                  key={ev.id + dia}
                  onClick={() => onAbrirEvento(ev)}
                  title={ev.titulo}
                  className="truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium"
                  style={estiloEvento(cor, ev.presenca)}
                >
                  <span className={recusado ? 'line-through' : ''}>{ev.titulo}</span>
                </button>
              )
            })}
            {tks.map((t) => (
              <button
                key={t.id}
                onClick={() => onAbrirTarefa(t)}
                title={t.titulo}
                className="flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium"
                style={{ backgroundColor: `${corPrioridade(t.prioridade)}22`, color: corPrioridade(t.prioridade) }}
              >
                ✓ {t.titulo}
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line">
      <div ref={scrollRef} className="max-h-[calc(100vh-190px)] overflow-y-auto">
        {/* Cabeçalho fixo (dias + faixa de dia inteiro) — dentro do scroll: alinha com a grade */}
        <div className="sticky top-0 z-30 border-b border-line bg-bg">
          {HeaderDia}
          {FaixaDia}
        </div>

        {/* Grade */}
        <div className="flex" style={{ height: ALTURA }}>
          <div className="w-12 shrink-0">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="relative" style={{ height: HORA_PX }}>
                {h > 0 && (
                  <span className="absolute -top-2 right-1.5 text-[10px] text-muted">
                    {String(h).padStart(2, '0')}:00
                  </span>
                )}
              </div>
            ))}
          </div>

          {dias.map((dia) => {
            const blocos = blocosTimados(dia)
            const pos = disporSobreposicao(
              blocos.map((b) => {
                const arr = arrasto?.id === b.id ? arrasto : null
                return {
                  id: b.id,
                  inicioMin: arr && arr.dia === dia ? arr.inicioMin : b.inicioMin,
                  fimMin: arr && arr.dia === dia ? arr.fimMin : b.fimMin,
                }
              }),
            )
            const ehHoje = isToday(parseISO(dia))
            return (
              <div
                key={dia}
                data-dia={dia}
                className="relative flex-1 border-l border-line"
                style={{ height: ALTURA }}
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget) apontarGrade(e, dia, e.currentTarget as HTMLElement)
                }}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="pointer-events-none absolute inset-x-0 border-t border-line/60" style={{ top: h * HORA_PX }} />
                ))}

                {criando?.dia === dia && (
                  <div
                    className="pointer-events-none absolute inset-x-1 rounded-md border border-accent bg-accent/15"
                    style={{
                      top: (Math.min(criando.a, criando.b) / 60) * HORA_PX,
                      height: (Math.abs(criando.b - criando.a) / 60) * HORA_PX || 8,
                    }}
                  />
                )}

                {ehHoje && (
                  <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: (agoraMin / 60) * HORA_PX }}>
                    <div className="relative border-t-2 border-red-500">
                      <span className="absolute -left-1 -top-[5px] size-2.5 rounded-full bg-red-500" />
                    </div>
                  </div>
                )}

                {blocos.map((b) => {
                  const arr = arrasto?.id === b.id ? arrasto : null
                  const iniMin = arr ? arr.inicioMin : b.inicioMin
                  const fimMin = arr ? arr.fimMin : b.fimMin
                  if (arr && arr.dia !== dia) return null
                  const p = pos.get(b.id) ?? { coluna: 0, colunas: 1 }
                  const top = (iniMin / 60) * HORA_PX
                  const alt = Math.max(18, ((fimMin - iniMin) / 60) * HORA_PX)
                  const larg = 100 / p.colunas
                  const curto = alt < 34
                  const recusado = b.presenca === 'recusado'
                  const estilo =
                    b.tipo === 'evento'
                      ? estiloEvento(b.cor, b.presenca)
                      : { backgroundColor: b.cor, color: '#fff' }
                  return (
                    <div
                      key={b.id}
                      onPointerDown={(e) => iniciarArrasto(e, b, dia, 'mover')}
                      title={b.titulo}
                      className={`absolute z-10 overflow-hidden rounded-md px-1.5 py-0.5 text-left shadow-sm ${b.concluida ? 'opacity-60' : ''}`}
                      style={{ top, height: alt, left: `calc(${p.coluna * larg}% + 2px)`, width: `calc(${larg}% - 4px)`, cursor: 'grab', touchAction: 'none', ...estilo }}
                    >
                      <div className={`truncate text-[11px] font-semibold leading-tight ${b.concluida || recusado ? 'line-through' : ''}`}>
                        {b.tipo === 'tarefa' && '✓ '}
                        {b.titulo}
                      </div>
                      {!curto && (
                        <div className="truncate text-[10px] opacity-90">
                          {paraHHMM(iniMin)}–{paraHHMM(fimMin)}
                        </div>
                      )}
                      {!b.ehOcorrencia && (
                        <div
                          onPointerDown={(e) => iniciarArrasto(e, b, dia, 'resize')}
                          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
                          style={{ touchAction: 'none' }}
                        />
                      )}
                    </div>
                  )
                })}

                {/* Marcas de prazo (horário-limite das tarefas) */}
                {tarefas
                  .filter((t) => t.data === dia && t.horario && !t.concluidaEm)
                  .map((t) => {
                    const cor = corPrioridade(t.prioridade)
                    return (
                      <button
                        key={'lim:' + t.id}
                        onClick={() => onAbrirTarefa(t)}
                        title={`Prazo ${t.horario} · ${t.titulo}`}
                        className="absolute inset-x-0 z-[15] flex items-center gap-1"
                        style={{ top: (paraMin(t.horario!) / 60) * HORA_PX - 7 }}
                      >
                        <span className="shrink-0 rounded px-1 text-[9px] font-bold text-white" style={{ backgroundColor: cor }}>
                          ⚑ {t.horario}
                        </span>
                        <span className="h-0 flex-1 border-t border-dashed" style={{ borderColor: cor }} />
                      </button>
                    )
                  })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
