import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { IconLapis, IconSetaEsquerda } from '../../core/components/Icons'
import { IconeFator } from '../../core/components/icones'
import { EditorHabito } from './components/EditorHabito'
import { Heatmap } from './components/Heatmap'
import { rotuloFrequencia } from './freq'
import { ehMedido } from './db'
import { useCategoriasHabito, useHabito, useRegistros } from './hooks'
import { diasParaHeatmap, estatisticasHabito, mapaPorData } from './progresso'

function Tile({ valor, rotulo, cor }: { valor: string; rotulo: string; cor?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-line bg-surface/60 p-3">
      <span className="text-[20px] font-bold tabular-nums" style={cor ? { color: cor } : undefined}>
        {valor}
      </span>
      <span className="text-[12px] text-muted">{rotulo}</span>
    </div>
  )
}

export function HabitoDetalhePage() {
  const { id } = useParams()
  const habito = useHabito(id)
  const registros = useRegistros()
  const categorias = useCategoriasHabito()
  const [editando, setEditando] = useState(false)

  const stats = useMemo(
    () => (habito ? estatisticasHabito(habito, registros ?? []) : null),
    [habito, registros],
  )
  const heat = useMemo(
    () => (habito ? diasParaHeatmap(habito, mapaPorData(registros ?? [], habito.id), 154) : []),
    [habito, registros],
  )

  if (habito === undefined) return <p className="py-16 text-center text-sm text-muted">Carregando…</p>
  if (habito === null)
    return (
      <div className="py-16 text-center text-sm text-muted">
        Hábito não encontrado.{' '}
        <Link to="/habitos" className="underline">
          Voltar
        </Link>
      </div>
    )

  const cor = habito.cor ?? 'var(--vida-ink)'
  // No Sim/Não o "feito" é verde fixo (igual ao cartão); nos outros tipos, a cor do hábito.
  const corFeito = habito.tipo === 'sim_nao' ? '#6db56a' : cor
  const cat = categorias?.find((c) => c.id === habito.categoriaId)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <Link to="/habitos" className="flex items-center gap-1 text-[13px] text-muted hover:text-ink">
          <IconSetaEsquerda width={16} height={16} />
          Hábitos
        </Link>
        <button
          onClick={() => setEditando(true)}
          className="flex min-h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] font-medium text-muted transition-colors hover:text-ink"
        >
          <IconLapis width={15} height={15} />
          Editar
        </button>
      </div>

      {/* Cabeçalho do hábito */}
      <div className="flex items-center gap-3">
        <span
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${cor}1f`, color: cor }}
        >
          <IconeFator nome={habito.icone} width={24} height={24} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{habito.nome}</h1>
          <p className="truncate text-[13px] text-muted">
            {cat ? `${cat.nome} · ` : ''}
            {rotuloFrequencia(habito.frequencia)}
          </p>
        </div>
      </div>
      {habito.descricao && <p className="text-[14px] text-muted">{habito.descricao}</p>}

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Tile valor={`${stats.streak}`} rotulo="Sequência atual" cor={cor} />
          <Tile valor={`${stats.melhor}`} rotulo="Melhor sequência" />
          <Tile valor={`${Math.round(stats.taxa * 100)}%`} rotulo="Taxa de conclusão" />
          <Tile
            valor={`${stats.feitosSemana}${stats.devidosSemana ? `/${stats.devidosSemana}` : ''}`}
            rotulo="Esta semana"
          />
          <Tile valor={`${stats.feitosMes}`} rotulo="Este mês" />
          {ehMedido(habito.tipo) && stats.media != null && (
            <Tile
              valor={`${Math.round(stats.media * 10) / 10}${habito.unidade ? ' ' + habito.unidade : ''}`}
              rotulo="Média por dia"
            />
          )}
        </div>
      )}

      {/* Mapa de calor */}
      <section className="flex flex-col gap-2">
        <h2 className="text-[13px] font-medium text-muted">Últimos meses</h2>
        <div className="rounded-xl border border-line bg-surface/60 p-3">
          <Heatmap dias={heat} cor={cor} habito={habito} />
          {habito.tipo === 'sim_nao' && (
            <p className="mt-2 text-[11px] text-muted">Toque num dia para marcar feito / não fez.</p>
          )}
          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted">
            <span className="flex items-center gap-1">
              <span className="size-3 rounded-[3px]" style={{ backgroundColor: corFeito }} /> feito
            </span>
            <span className="flex items-center gap-1">
              <span className="size-3 rounded-[3px]" style={{ backgroundColor: '#d8695e' }} /> não feito
            </span>
            <span className="flex items-center gap-1">
              <span className="size-3 rounded-[3px] bg-line" /> pendente
            </span>
          </div>
        </div>
      </section>

      {editando && (
        <EditorHabito habito={habito} categorias={categorias ?? []} onFechar={() => setEditando(false)} />
      )}
    </div>
  )
}
