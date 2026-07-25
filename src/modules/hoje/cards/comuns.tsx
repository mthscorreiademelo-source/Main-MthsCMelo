import { Link } from 'react-router-dom'
import {
  IconBandeira,
  IconCarrinho,
  IconCheckCircle,
  IconCifrao,
  IconDocumento,
  IconLocal,
  IconMais,
  IconPata,
  IconRelogio,
  IconSol,
} from '../../../core/components/Icons'
import { IconeFator } from '../../../core/components/icones'
import { AnelProgresso } from '../../habitos/components/AnelProgresso'
import { alternarConclusao, corPrioridade, estaAtrasada } from '../../tarefas/db'
import type { Task } from '../../tarefas/types'
import { corEfetiva } from '../../agenda/categorias'
import type { Evento } from '../../agenda/types'
import { formatarBRL } from '../../financas/db'
import { salvarDia } from '../../saude/db'
import { CartaoHoje } from '../CartaoHoje'
import { LinhaDoTempo } from '../LinhaDoTempo'
import { hhmmParaMin } from '../agora'
import { BarraProgresso, CabecalhoCard, Rotulo, rotuloFaltam } from '../ui'
import type { PropsCard } from './tipos'
import { nomeProjeto } from './tipos'

const COR_TRABALHO = '#299438'
const COR_FINANCAS = '#299438'
const COR_AMBAR = '#e0a800'
const COR_AGUA = '#4d9bd6'

const ROTULO_PRIO: Record<number, string> = { 1: 'Alta', 2: 'Média', 3: 'Baixa', 4: '' }

/* ------------------------------ Próximo evento ------------------------------ */
export function CardProximoEvento({ dados, tamanho }: PropsCard) {
  const alvo: Evento | undefined = dados.atual ?? dados.proximo
  if (!alvo) return null
  const cor = corEfetiva(alvo)
  const i = hhmmParaMin(alvo.inicio)!
  const f = hhmmParaMin(alvo.fim) ?? i + 60
  const acontecendo = !!dados.atual
  const restante = acontecendo ? f - dados.agoraMin : i - dados.agoraMin

  return (
    <CartaoHoje tamanho={tamanho} to="/agenda">
      <CabecalhoCard icone={<IconRelogio width={16} height={16} />} titulo="Próximo evento" cor={cor} />
      <span className="text-[13px] font-medium tabular-nums" style={{ color: cor }}>
        {alvo.inicio}–{alvo.fim}
      </span>
      <span className="mt-0.5 line-clamp-2 text-[17px] font-bold leading-tight">{alvo.titulo}</span>
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-[12px] text-muted">
        {alvo.local && (
          <span className="flex items-center gap-1">
            <IconLocal width={13} height={13} /> {alvo.local}
          </span>
        )}
        <span className="flex items-center gap-1">
          <IconRelogio width={13} height={13} />
          {acontecendo ? `termina ${rotuloFaltam(restante)}` : rotuloFaltam(restante)}
        </span>
      </div>
    </CartaoHoje>
  )
}

/* ------------------------------ Linha do tempo ------------------------------ */
export function CardLinhaTempo({ dados, tamanho }: PropsCard) {
  return (
    <CartaoHoje tamanho={tamanho}>
      <LinhaDoTempo eventos={dados.cronologicos} agoraMin={dados.agoraMin} horaAgora={dados.horaAgora} />
    </CartaoHoje>
  )
}

/* -------------------------------- Tarefas ----------------------------------- */
function ItemTarefa({ t, dados }: { t: Task; dados: PropsCard['dados'] }) {
  const atrasada = estaAtrasada(t)
  const projeto = nomeProjeto(dados, t.projetoId)
  const planejado = t.blocoInicio && (!t.blocoData || t.blocoData === dados.hoje) ? t.blocoInicio : undefined
  const hora = planejado ?? t.horario
  const rp = ROTULO_PRIO[t.prioridade]
  return (
    <li>
      <button
        onClick={() => alternarConclusao(t)}
        className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-hover"
      >
        <span
          className="size-4 shrink-0 rounded-full border-2"
          style={{ borderColor: corPrioridade(t.prioridade) }}
        />
        {hora && <span className="w-11 shrink-0 text-[12px] tabular-nums text-muted">{hora}</span>}
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[14px] ${atrasada ? 'text-danger' : ''}`}>{t.titulo}</span>
          {projeto && <span className="block truncate text-[11px] text-muted">{projeto}</span>}
        </span>
        {rp && (
          <span className="flex shrink-0 items-center gap-1 text-[11px]" style={{ color: corPrioridade(t.prioridade) }}>
            <IconBandeira width={11} height={11} /> {rp}
          </span>
        )}
      </button>
    </li>
  )
}

function ListaTarefas({
  dados,
  tamanho,
  tarefas,
  titulo,
  cor,
}: PropsCard & { tarefas: Task[]; titulo: string; cor?: string }) {
  return (
    <CartaoHoje tamanho={tamanho}>
      <CabecalhoCard
        icone={<IconBandeira width={16} height={16} />}
        titulo={titulo}
        cor={cor}
        acao="Ver todas"
        to="/tarefas"
      />
      <ul className="flex flex-col gap-0.5">
        {tarefas.map((t) => (
          <ItemTarefa key={t.id} t={t} dados={dados} />
        ))}
      </ul>
      <Link
        to="/tarefas"
        className="mt-2 flex items-center gap-1.5 px-1 text-[13px] text-muted transition-colors hover:text-ink"
      >
        <IconMais width={14} height={14} /> Adicionar tarefa
      </Link>
    </CartaoHoje>
  )
}

/** Tarefas de hoje (genérico). */
export function CardTarefasHoje({ dados, tamanho }: PropsCard) {
  return <ListaTarefas dados={dados} tamanho={tamanho} tarefas={dados.tarefasHoje.slice(0, 5)} titulo="Tarefas de hoje" />
}

/** Próximas tarefas (modo atenção) — mesma lista, outro rótulo. */
export function CardProximasTarefas({ dados, tamanho }: PropsCard) {
  return (
    <ListaTarefas dados={dados} tamanho={tamanho} tarefas={dados.tarefasHoje.slice(0, 5)} titulo="Próximas tarefas" />
  )
}

/** Tarefas do trabalho (modo foco) — prioriza as ligadas a projeto. */
export function CardTarefasTrabalho({ dados, tamanho }: PropsCard) {
  const doTrabalho = dados.tarefasHoje.filter((t) => !!t.projetoId)
  const resto = dados.tarefasHoje.filter((t) => !t.projetoId)
  const lista = [...doTrabalho, ...resto].slice(0, 5)
  return (
    <ListaTarefas dados={dados} tamanho={tamanho} tarefas={lista} titulo="Tarefas do trabalho" cor={COR_TRABALHO} />
  )
}

/* ------------------------------ Resumo do dia ------------------------------- */
export function CardResumoDia({ dados, tamanho }: PropsCard) {
  const { feitas, total } = dados.indicadores
  if (total === 0) return null
  const frac = feitas / total
  return (
    <CartaoHoje tamanho={tamanho} to="/tarefas">
      <CabecalhoCard icone={<IconCheckCircle width={16} height={16} />} titulo="Resumo do dia" cor={COR_AMBAR} />
      <div className="flex flex-1 items-center gap-4">
        <div className="min-w-0">
          <div className="text-[26px] font-bold leading-none tabular-nums">
            {feitas} <span className="text-muted">/ {total}</span>
          </div>
          <div className="mt-1 text-[12px] text-muted">tarefas concluídas</div>
        </div>
        <AnelProgresso fracao={frac} tamanho={68} espessura={6} cor={COR_AMBAR}>
          <span className="text-[14px] font-bold tabular-nums">{Math.round(frac * 100)}%</span>
        </AnelProgresso>
      </div>
    </CartaoHoje>
  )
}

/* -------------------------------- Finanças ---------------------------------- */
export function CardFinancas({ dados, tamanho }: PropsCard) {
  const orc = dados.orc
  if (!orc) return null
  const restante = Math.max(0, orc.orcamentoDiario - orc.gastoHoje)
  const usado = orc.orcamentoDiario > 0 ? Math.min(1, orc.gastoHoje / orc.orcamentoDiario) : 0
  const estourou = orc.disponivelHoje < 0
  return (
    <CartaoHoje tamanho={tamanho} to="/financas">
      <CabecalhoCard icone={<IconCifrao width={16} height={16} />} titulo="Finanças · Hoje" cor={COR_FINANCAS} />
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-muted">Meta diária</span>
        <span className="font-semibold tabular-nums">{formatarBRL(orc.orcamentoDiario)}</span>
      </div>
      <div className="my-2">
        <BarraProgresso fracao={usado} cor={usado >= 1 ? 'var(--vida-danger)' : 'var(--vida-accent)'} />
      </div>
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-muted">Gasto hoje</span>
        <span className="font-semibold tabular-nums">{formatarBRL(orc.gastoHoje)}</span>
      </div>
      <div className="mt-auto flex items-center justify-between pt-1 text-[13px]">
        <span className="text-muted">Ainda dá pra gastar</span>
        <span className={`font-semibold tabular-nums ${estourou ? 'text-danger' : 'text-accent'}`}>
          {formatarBRL(restante)}
        </span>
      </div>
    </CartaoHoje>
  )
}

/* ----------------------------- Lista de compras ----------------------------- */
export function CardListaCompras({ dados, tamanho }: PropsCard) {
  const itens = dados.despensaAlertas
  if (itens.length === 0) return null
  return (
    <CartaoHoje tamanho={tamanho} to="/compras">
      <CabecalhoCard
        icone={<IconCarrinho width={16} height={16} />}
        titulo="Lista de compras"
        cor={COR_AMBAR}
        acao={`${itens.length} ${itens.length === 1 ? 'item' : 'itens'}`}
      />
      <ul className="flex flex-col gap-1.5">
        {itens.slice(0, 4).map((a) => (
          <li key={a.id} className="flex items-center gap-2.5 text-[13px]">
            <span aria-hidden>{a.icone}</span>
            <span className="min-w-0 flex-1 truncate">{a.nome}</span>
            <span className="shrink-0 text-[11px] text-muted">{a.motivo}</span>
          </li>
        ))}
      </ul>
    </CartaoHoje>
  )
}

/* ---------------------------- Estoque crítico (atenção) --------------------- */
export function CardEstoqueCritico({ dados, tamanho }: PropsCard) {
  const item = dados.despensaAlertas[0]
  if (!item) return null
  return (
    <CartaoHoje tamanho={tamanho} to="/compras" destaque style={{ backgroundColor: 'color-mix(in srgb, var(--vida-danger) 8%, transparent)', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--vida-danger) 30%, transparent)' }}>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[18px]" aria-hidden>{item.icone}</span>
        <Rotulo cor="var(--vida-danger)">Estoque crítico</Rotulo>
      </div>
      <span className="text-[16px] font-bold leading-tight">{item.nome}</span>
      <span className="mt-0.5 text-[13px] text-danger">{item.motivo}</span>
      <div className="mt-auto pt-2">
        <BarraProgresso fracao={0.12} cor="var(--vida-danger)" />
      </div>
    </CartaoHoje>
  )
}

/* --------------------------------- Notas ------------------------------------ */
export function CardNotas({ dados, tamanho }: PropsCard) {
  const recentes = dados.paginas.slice(0, 4)
  if (recentes.length === 0) return null
  return (
    <CartaoHoje tamanho={tamanho}>
      <CabecalhoCard icone={<IconDocumento width={16} height={16} />} titulo="Notas rápidas" acao="Ver todas" to="/notas" />
      <ul className="flex flex-col gap-0.5">
        {recentes.map((p) => (
          <li key={p.id}>
            <Link
              to={`/notas/${p.id}`}
              className="flex items-center gap-2 rounded-lg px-1 py-1.5 transition-colors hover:bg-hover"
            >
              <IconDocumento width={14} height={14} className="shrink-0 text-muted" />
              <span className="truncate text-[13px]">{p.titulo || 'Sem título'}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        to="/notas"
        className="mt-2 flex items-center gap-1.5 px-1 text-[13px] text-muted transition-colors hover:text-ink"
      >
        <IconMais width={14} height={14} /> Nova nota
      </Link>
    </CartaoHoje>
  )
}

/* ---------------------------- Lembretes de saúde ---------------------------- */
export function CardLembretesSaude({ dados, tamanho }: PropsCard) {
  const frac = dados.metaAgua > 0 ? Math.min(1, dados.aguaMl / dados.metaAgua) : 0
  const copos = Math.round(dados.aguaMl / 250)
  const meta = Math.round(dados.metaAgua / 250)
  function beber() {
    salvarDia(dados.hoje, { aguaMl: dados.aguaMl + 250 })
  }
  return (
    <CartaoHoje tamanho={tamanho}>
      <CabecalhoCard icone={<IconeFator nome="gota" width={16} height={16} />} titulo="Lembrete de saúde" cor={COR_AGUA} acao="Ver saúde" to="/saude" />
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[20px] font-bold tabular-nums">{copos}</span>
          <span className="text-[13px] text-muted"> / {meta} copos</span>
          <div className="text-[12px] text-muted">Água de hoje</div>
        </div>
        <button
          onClick={beber}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: COR_AGUA }}
        >
          <IconMais width={14} height={14} /> Copo
        </button>
      </div>
      <div className="mt-2.5">
        <BarraProgresso fracao={frac} cor={COR_AGUA} />
      </div>
    </CartaoHoje>
  )
}

/* ---------------------------- Cuidados dos pets ----------------------------- */
export function CardCuidadosPets({ dados, tamanho }: PropsCard) {
  const pets = dados.petsPendentes
  if (pets.length === 0) return null
  const totalPend = pets.reduce((s, l) => s + l.pendentes, 0)
  return (
    <CartaoHoje tamanho={tamanho}>
      <CabecalhoCard
        icone={<IconPata width={16} height={16} />}
        titulo="Cuidados dos pets"
        acao={`${totalPend} pendente${totalPend > 1 ? 's' : ''}`}
        to="/pets"
      />
      <ul className="flex flex-col gap-0.5">
        {pets.slice(0, 4).map((l) => (
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
  )
}

/* ---------------------- Pausa (meio-dia) / Descanso (madrugada) ------------- */
export function CardPausaMeioDia({ tamanho }: PropsCard) {
  return (
    <CartaoHoje
      tamanho={tamanho}
      destaque
      style={{ backgroundColor: 'color-mix(in srgb, var(--vida-accent) 8%, transparent)', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--vida-accent) 20%, transparent)' }}
    >
      <div className="mb-2 flex items-center gap-2 text-accent">
        <IconSol width={22} height={22} />
        <Rotulo cor="var(--vida-accent)">Meio do dia</Rotulo>
      </div>
      <h2 className="text-2xl font-bold leading-tight">Uma pausa faz bem.</h2>
      <p className="mt-2 max-w-md text-[14px] text-muted">
        Respire fundo, beba um copo de água e volte com energia. Metade do dia já passou — siga no seu ritmo.
      </p>
      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <Link to="/saude" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90">
          <IconeFator nome="gota" width={14} height={14} /> Registrar água
        </Link>
        <Link to="/tarefas" className="inline-flex min-h-9 items-center rounded-lg border border-line px-3.5 text-[13px] font-medium transition-colors hover:bg-hover">
          Ver tarefas
        </Link>
      </div>
    </CartaoHoje>
  )
}

export function CardDescanso({ tamanho }: PropsCard) {
  return (
    <CartaoHoje tamanho={tamanho}>
      <div className="mb-2 flex items-center gap-2 text-muted">
        <IconeFator nome="lua" width={22} height={22} />
        <Rotulo>Madrugada</Rotulo>
      </div>
      <h2 className="text-2xl font-bold leading-tight">Hora de descansar.</h2>
      <p className="mt-2 max-w-md text-[14px] text-muted">
        Ainda é madrugada. Se puder, descanse — um bom sono é o melhor começo para o próximo dia.
      </p>
    </CartaoHoje>
  )
}
