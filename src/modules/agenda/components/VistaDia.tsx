import { useMemo } from 'react'
import { format, isToday, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EmptyState } from '../../../core/components/EmptyState'
import { IconCalendario, IconMais } from '../../../core/components/Icons'
import { corPrioridade } from '../../tarefas/db'
import type { Task } from '../../tarefas/types'
import { eventosDoDia, paraHHMM, paraMin } from '../db'
import type { Evento } from '../types'

type Item = {
  chave: string
  inicioMin: number
  rotuloHora: string
  titulo: string
  sub?: string
  cor: string
  vazado?: boolean
  riscado?: boolean
  onAbrir: () => void
}

export function VistaDia({
  dia,
  eventos,
  tarefas,
  onAbrirEvento,
  onAbrirTarefa,
  onCriar,
}: {
  dia: string
  eventos: Evento[]
  tarefas: Task[]
  onAbrirEvento: (e: Evento) => void
  onAbrirTarefa: (t: Task) => void
  onCriar: (data: string, ini: number, fim: number) => void
}) {
  const { topo, timados } = useMemo(() => {
    const evs = eventosDoDia(eventos, dia)
    const topo: Item[] = []
    const timados: Item[] = []

    for (const e of evs) {
      const item: Item = {
        chave: 'e' + e.id,
        inicioMin: paraMin(e.inicio),
        rotuloHora: e.diaInteiro ? 'Dia todo' : `${e.inicio}–${e.fim}`,
        titulo: e.titulo,
        sub: e.local,
        cor: e.cor ?? '#4073ff',
        vazado: e.presenca !== 'confirmado',
        riscado: e.presenca === 'recusado',
        onAbrir: () => onAbrirEvento(e),
      }
      ;(e.diaInteiro ? topo : timados).push(item)
    }

    for (const t of tarefas.filter((t) => t.data === dia)) {
      const item: Item = {
        chave: 't' + t.id,
        inicioMin: t.horario ? paraMin(t.horario) : -1,
        rotuloHora: t.horario ? `${t.horario}–${paraHHMM(paraMin(t.horario) + (t.duracaoMin ?? 60))}` : 'sem horário',
        titulo: t.titulo,
        cor: corPrioridade(t.prioridade),
        riscado: !!t.concluidaEm,
        onAbrir: () => onAbrirTarefa(t),
      }
      ;(t.horario ? timados : topo).push(item)
    }

    timados.sort((a, b) => a.inicioMin - b.inicioMin)
    return { topo, timados }
  }, [eventos, tarefas, dia, onAbrirEvento, onAbrirTarefa])

  const dt = parseISO(dia)
  const hoje = isToday(dt)
  const agoraMin = (() => {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  })()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[13px] font-medium uppercase text-muted">{format(dt, 'EEEE', { locale: ptBR })}</div>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold ${hoje ? 'text-accent' : ''}`}>{format(dt, 'd')}</span>
            <span className="text-[15px] text-muted">{format(dt, "MMMM 'de' yyyy", { locale: ptBR })}</span>
          </div>
        </div>
        <button
          onClick={() => onCriar(dia, 9 * 60, 10 * 60)}
          className="flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[14px] font-medium text-surface"
        >
          <IconMais width={16} height={16} /> Evento
        </button>
      </div>

      {topo.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {topo.map((it) => (
            <button
              key={it.chave}
              onClick={it.onAbrir}
              className="rounded-lg px-3 py-1.5 text-[13px] font-medium"
              style={
                it.vazado
                  ? { border: `1.5px solid ${it.cor}`, color: it.cor }
                  : { backgroundColor: it.cor, color: '#fff' }
              }
            >
              <span className={it.riscado ? 'line-through' : ''}>{it.titulo}</span>
            </button>
          ))}
        </div>
      )}

      {timados.length === 0 && topo.length === 0 ? (
        <EmptyState icone={<IconCalendario />} titulo="Dia livre" descricao="Toque em “Evento” para agendar algo neste dia." />
      ) : (
        <div className="flex flex-col">
          {timados.map((it, i) => {
            const mostrarAgora = hoje && i === timados.findIndex((x) => x.inicioMin >= agoraMin)
            return (
              <div key={it.chave}>
                {mostrarAgora && (
                  <div className="flex items-center gap-2 py-1 pl-16">
                    <span className="size-2 rounded-full bg-red-500" />
                    <span className="h-px flex-1 bg-red-500/70" />
                  </div>
                )}
                <button onClick={it.onAbrir} className="flex w-full items-stretch gap-3 rounded-lg py-2 pr-2 text-left transition-colors hover:bg-hover">
                  <span className="w-14 shrink-0 pt-0.5 text-right text-[12px] font-medium text-muted tabular-nums">
                    {it.rotuloHora.split('–')[0]}
                  </span>
                  <span className="w-1 shrink-0 rounded-full" style={{ backgroundColor: it.cor }} />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[15px] font-medium ${it.riscado ? 'text-muted line-through' : ''}`}>
                      {it.titulo}
                    </span>
                    <span className="block truncate text-[12px] text-muted">
                      {it.rotuloHora}
                      {it.sub ? ` · ${it.sub}` : ''}
                    </span>
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
