import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { db } from '../../../core/db/db'
import { AnelProgresso } from '../../habitos/components/AnelProgresso'
import { hojeISO } from '../../../core/dates'
import { formatarBRL } from '../../financas/db'
import { corPrioridade } from '../../tarefas/db'
import type { Projeto, Task } from '../../tarefas/types'

/* Paleta categórica de ordem FIXA (hues bem separados, já usados no app). */
const CAT_CORES = ['#7c9885', '#4073ff', '#eb8909', '#884dff', '#0f9b9b', '#c0405e', '#808080']

const CARTAO = 'rounded-2xl border border-line bg-surface/50 p-4'
const ROTULO = 'text-[12px] font-semibold uppercase tracking-wide text-muted'

function Aba({ titulo, verTudo, onVer, children }: { titulo: string; verTudo?: string; onVer?: () => void; children: React.ReactNode }) {
  return (
    <div className={CARTAO}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className={`${ROTULO} min-w-0 truncate`}>{titulo}</span>
        {verTudo && <button onClick={onVer} className="shrink-0 text-[12px] font-medium text-muted hover:text-ink">{verTudo}</button>}
      </div>
      {children}
    </div>
  )
}

export function VisaoGeralProjeto({ projeto, onAba }: { projeto: Projeto; onAba: (id: string) => void }) {
  const id = projeto.id
  const tarefas = useLiveQuery(async () => db.tasks.where('projetoId').equals(id).toArray(), [id])
  const eventos = useLiveQuery(async () => db.eventos.where('projetoId').equals(id).toArray(), [id])
  const movimentos = useLiveQuery(async () => db.movimentos.where('projetoId').equals(id).toArray(), [id])
  const paginas = useLiveQuery(async () => db.paginas.where('projetoId').equals(id).reverse().sortBy('atualizadaEm'), [id])
  const hoje = hojeISO()

  const cont = useMemo(() => {
    const raiz = (tarefas ?? []).filter((t) => !t.paiId)
    const concluidas = raiz.filter((t) => t.concluidaEm).length
    const pend = raiz.filter((t) => !t.concluidaEm)
    const atrasadas = pend.filter((t) => t.data && t.data < hoje).length
    const emAndamento = pend.filter((t) => t.data && t.data >= hoje).length
    const naoIniciadas = pend.filter((t) => !t.data).length
    const total = raiz.length
    return { concluidas, atrasadas, emAndamento, naoIniciadas, total, frac: total ? concluidas / total : 0 }
  }, [tarefas, hoje])

  const proximasTarefas = useMemo(
    () =>
      (tarefas ?? [])
        .filter((t) => !t.concluidaEm && !t.paiId)
        .sort((a: Task, b: Task) => {
          const da = a.data ?? '9999', db_ = b.data ?? '9999'
          return da !== db_ ? (da < db_ ? -1 : 1) : (a.prioridade ?? 4) - (b.prioridade ?? 4)
        })
        .slice(0, 4),
    [tarefas],
  )

  const proximosEventos = useMemo(
    () => (eventos ?? []).filter((e) => e.data >= hoje).sort((a, b) => (a.data === b.data ? a.inicio.localeCompare(b.inicio) : a.data < b.data ? -1 : 1)).slice(0, 4),
    [eventos, hoje],
  )

  const fin = useMemo(() => {
    const ms = movimentos ?? []
    const entradas = ms.filter((m) => m.tipo === 'entrada').reduce((s, m) => s + m.valorCentavos, 0)
    const saidas = ms.filter((m) => m.tipo === 'saida').reduce((s, m) => s + m.valorCentavos, 0)
    const porCat = new Map<string, number>()
    for (const m of ms) if (m.tipo === 'saida') porCat.set(m.categoria ?? 'Outros', (porCat.get(m.categoria ?? 'Outros') ?? 0) + m.valorCentavos)
    const dist = [...porCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([nome, val], i) => ({ nome, val, cor: CAT_CORES[i % CAT_CORES.length], pct: saidas ? val / saidas : 0 }))
    return { entradas, saidas, saldo: entradas - saidas, dist }
  }, [movimentos])

  const insights = useMemo(() => {
    const out: { icone: string; texto: string }[] = []
    if (cont.total > 0) out.push({ icone: '📈', texto: `Você concluiu ${Math.round(cont.frac * 100)}% das tarefas deste projeto.` })
    if (cont.atrasadas > 0) out.push({ icone: '⏰', texto: `${cont.atrasadas} tarefa${cont.atrasadas > 1 ? 's' : ''} atrasada${cont.atrasadas > 1 ? 's' : ''} — vale priorizar.` })
    if (proximosEventos[0]) {
      const dias = Math.round((parseISO(proximosEventos[0].data).getTime() - parseISO(hoje).getTime()) / 86400000)
      out.push({ icone: '📅', texto: `Próximo evento: ${proximosEventos[0].titulo} ${dias <= 0 ? 'hoje' : `em ${dias} dia${dias > 1 ? 's' : ''}`}.` })
    }
    if (fin.saldo < 0) out.push({ icone: '💰', texto: `Os gastos do projeto passaram do que entrou em ${formatarBRL(-fin.saldo)}.` })
    return out.slice(0, 4)
  }, [cont, proximosEventos, hoje, fin])

  const CONT = [
    { rot: 'Concluídas', val: cont.concluidas, cor: '#299438', emoji: '✅' },
    { rot: 'Em andamento', val: cont.emAndamento, cor: '#4073ff', emoji: '🔵' },
    { rot: 'Atrasadas', val: cont.atrasadas, cor: '#c0405e', emoji: '🔴' },
    { rot: 'Não iniciadas', val: cont.naoIniciadas, cor: '#808080', emoji: '⚪' },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Resumo — faixa larga: anel + KPIs */}
      <div className={CARTAO}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4 sm:pr-5 sm:border-r sm:border-line">
            <AnelProgresso fracao={cont.frac} tamanho={84} espessura={10} cor={projeto.cor ?? 'var(--vida-accent)'}>
              <div className="text-center">
                <div className="text-[17px] font-bold leading-none">{Math.round(cont.frac * 100)}%</div>
                <div className="text-[8px] text-muted">progresso</div>
              </div>
            </AnelProgresso>
            <div className="sm:hidden">
              <div className="text-[13px] font-semibold">{cont.total} tarefa{cont.total === 1 ? '' : 's'}</div>
              <div className="text-[11.5px] text-muted">no projeto</div>
            </div>
          </div>
          <ul className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
            {CONT.map((c) => (
              <li key={c.rot} className="rounded-xl bg-hover/50 px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: c.cor }} />
                  <span className="text-[19px] font-bold leading-none tabular-nums">{c.val}</span>
                </div>
                <span className="mt-1 block text-[11px] leading-tight text-muted">{c.rot}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Próximas tarefas */}
      <Aba titulo="Próximas tarefas" verTudo="Ver todas" onVer={() => onAba('tarefas')}>
        {proximasTarefas.length === 0 ? (
          <p className="text-[13px] text-muted">Sem tarefas pendentes.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {proximasTarefas.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <span className="size-4 shrink-0 rounded-full border border-line" />
                <span className="min-w-0 flex-1 truncate text-[13.5px]">{t.titulo}</span>
                {t.prioridade && <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: corPrioridade(t.prioridade) }}>P{t.prioridade}</span>}
              </li>
            ))}
          </ul>
        )}
      </Aba>

      {/* Próximos eventos */}
      <Aba titulo="Próximos eventos" verTudo="Ver agenda" onVer={() => onAba('agenda')}>
        {proximosEventos.length === 0 ? (
          <p className="text-[13px] text-muted">Nada agendado.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {proximosEventos.map((e) => (
              <li key={e.id} className="flex items-center gap-2 text-[13px]">
                <span className="flex size-8 shrink-0 flex-col items-center justify-center rounded-lg bg-hover leading-none">
                  <span className="text-[13px] font-bold">{format(parseISO(e.data), 'd')}</span>
                  <span className="text-[8px] uppercase text-muted">{format(parseISO(e.data), 'MMM', { locale: ptBR })}</span>
                </span>
                <span className="min-w-0 flex-1 truncate">{e.titulo}</span>
                <span className="shrink-0 text-[11px] tabular-nums text-muted">{e.inicio}</span>
              </li>
            ))}
          </ul>
        )}
      </Aba>

      {/* Notas recentes */}
      <Aba titulo="Notas recentes" verTudo="Ver todas" onVer={() => onAba('notas')}>
        {(paginas ?? []).length === 0 ? (
          <p className="text-[13px] text-muted">Sem notas ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(paginas ?? []).slice(0, 4).map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-[13px]">
                <span className="text-[14px]">{p.tipo === 'desenho' ? '✏️' : '📝'}</span>
                <span className="min-w-0 flex-1 truncate">{p.titulo || 'Sem título'}</span>
                <span className="shrink-0 text-[10.5px] text-muted">{format(new Date(p.atualizadaEm), 'd MMM', { locale: ptBR })}</span>
              </li>
            ))}
          </ul>
        )}
      </Aba>

      {/* Financeiro */}
      <Aba titulo="Financeiro do projeto" verTudo="Ver detalhes" onVer={() => onAba('financeiro')}>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><div className="text-[15px] font-bold text-danger">{formatarBRL(fin.saidas)}</div><div className="text-[10px] text-muted">Gasto</div></div>
          <div><div className="text-[15px] font-bold text-accent">{formatarBRL(fin.entradas)}</div><div className="text-[10px] text-muted">Recebido</div></div>
          <div><div className={`text-[15px] font-bold ${fin.saldo < 0 ? 'text-danger' : ''}`}>{formatarBRL(fin.saldo)}</div><div className="text-[10px] text-muted">Saldo</div></div>
        </div>
        {fin.dist.length > 0 && (
          <>
            <div className="mt-3 flex h-2.5 gap-[2px] overflow-hidden rounded-full">
              {fin.dist.map((d) => (
                <div key={d.nome} title={`${d.nome} · ${Math.round(d.pct * 100)}%`} style={{ width: `${d.pct * 100}%`, backgroundColor: d.cor }} />
              ))}
            </div>
            <ul className="mt-2 flex flex-col gap-1">
              {fin.dist.map((d) => (
                <li key={d.nome} className="flex items-center gap-2 text-[12px]">
                  <span className="size-2 rounded-full" style={{ backgroundColor: d.cor }} />
                  <span className="flex-1 truncate text-muted">{d.nome}</span>
                  <span className="font-semibold tabular-nums">{Math.round(d.pct * 100)}%</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Aba>

      {/* Insights (heurísticos) */}
      <div className="rounded-2xl border border-line bg-accent/[0.06] p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className={ROTULO}>Insights</span>
          <span className="text-[10px] text-muted/70">leitura automática</span>
        </div>
        {insights.length === 0 ? (
          <p className="text-[13px] text-muted">Adicione tarefas, eventos e gastos ao projeto para o Lume gerar leituras.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {insights.map((ins, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13px] leading-snug">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface">{ins.icone}</span>
                <span>{ins.texto}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      </div>
    </div>
  )
}
