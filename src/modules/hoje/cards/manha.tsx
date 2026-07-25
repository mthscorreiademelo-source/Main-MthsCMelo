import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  IconCalendario,
  IconCheck,
  IconDocumento,
  IconEstrela,
  IconLivro,
  IconMais,
  IconNuvem,
  IconRaio,
  IconRepetir,
  IconSol,
} from '../../../core/components/Icons'
import { DIAS_SEMANA } from '../../../core/dates'
import { criarNotaComTexto } from '../../../core/captura/fluxos'
import { atualizarPagina } from '../../notas/acoes'
import { CapaImg } from '../../biblioteca/components/CapaImg'
import { corEfetiva, iconeEvento } from '../../agenda/categorias'
import { CartaoHoje } from '../CartaoHoje'
import { Pomodoro } from '../Pomodoro'
import { diasDaSemana } from '../calculos'
import { escolhaDoDia, FRASES, PERGUNTAS_REFLEXAO } from '../frases'
import { hhmmParaMin } from '../agora'
import { BarraProgresso, CabecalhoCard } from '../ui'
import type { ContagemSemana } from '../calculos'
import { CampoDiario } from './CampoDiario'
import type { PropsCard } from './tipos'

/* ------------------------------ Sessão de foco ------------------------------ */
export function CardSessaoFoco({ tamanho }: PropsCard) {
  return (
    <CartaoHoje tamanho={tamanho}>
      <CabecalhoCard icone={<IconRaio width={16} height={16} />} titulo="Sessão de foco" />
      <p className="mb-1 text-[13px] text-muted">Comece o dia com um bloco de foco e propósito.</p>
      <Pomodoro compacto={tamanho !== 'hero'} />
    </CartaoHoje>
  )
}

/* --------------------------- Planejamento semanal --------------------------- */
function LinhaSemana({ icone, rotulo, c }: { icone: string; rotulo: string; c: ContagemSemana }) {
  const frac = c.total > 0 ? c.feitos / c.total : 0
  return (
    <div className="flex items-center gap-2">
      <span className="flex w-24 shrink-0 items-center gap-1.5 text-[12px] text-muted">
        <span aria-hidden>{icone}</span> {rotulo}
      </span>
      <span className="flex-1">
        <BarraProgresso fracao={frac} altura={6} />
      </span>
      <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-muted">
        {c.feitos} / {c.total}
      </span>
    </div>
  )
}

export function CardPlanejamentoSemanal({ dados, tamanho }: PropsCard) {
  const dias = diasDaSemana(dados.hoje)
  return (
    <CartaoHoje tamanho={tamanho}>
      <CabecalhoCard icone={<IconCalendario width={16} height={16} />} titulo="Planejamento semanal" />
      <div className="mb-3 grid grid-cols-7 gap-1 text-center">
        {dias.map((iso, idx) => {
          const ehHoje = iso === dados.hoje
          return (
            <div key={iso}>
              <div className="text-[10px] text-muted">{DIAS_SEMANA[idx]}</div>
              <div
                className={`mx-auto mt-0.5 flex size-6 items-center justify-center rounded-full text-[12px] tabular-nums ${
                  ehHoje ? 'bg-accent font-bold text-white' : 'text-ink'
                }`}
              >
                {Number(iso.slice(8, 10))}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex flex-col gap-2">
        <LinhaSemana icone="✓" rotulo="Tarefas" c={dados.semana.tarefas} />
        <LinhaSemana icone="📅" rotulo="Eventos" c={dados.semana.eventos} />
        <LinhaSemana icone="🔁" rotulo="Hábitos" c={dados.semana.habitos} />
      </div>
      <Link to="/tarefas" className="mt-3 text-[12px] font-medium text-accent hover:underline">
        Ver planejamento completo →
      </Link>
    </CartaoHoje>
  )
}

/* ------------------------------ Capturar ideia ------------------------------ */
export function CardCapturarIdeia({ tamanho }: PropsCard) {
  const [txt, setTxt] = useState('')
  const [salvo, setSalvo] = useState(false)
  async function salvar() {
    const t = txt.trim()
    if (!t) return
    try {
      const id = await criarNotaComTexto(t)
      await atualizarPagina(id, { tags: ['ideia'], atualizadaEm: Date.now() })
    } catch {
      /* se falhar, o texto continua no campo para tentar de novo */
      return
    }
    setTxt('')
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2000)
  }
  return (
    <CartaoHoje tamanho={tamanho}>
      <CabecalhoCard icone={<IconRaio width={16} height={16} />} titulo="Capturar ideia" cor="#eb8909" />
      <p className="mb-2 text-[13px] text-muted">Uma boa ideia agora pode virar um projeto depois.</p>
      <textarea
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
        placeholder="Anote sua ideia rápida…"
        rows={2}
        className="w-full flex-1 resize-none rounded-lg border border-line bg-bg px-3 py-2 text-[14px] outline-none transition-colors focus:border-accent"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[12px] text-muted">{salvo ? 'Ideia salva em Notas ✓' : ''}</span>
        <button
          onClick={salvar}
          disabled={!txt.trim()}
          className="rounded-lg bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Salvar ideia
        </button>
      </div>
    </CartaoHoje>
  )
}

/* ------------------------------ Reflexão rápida ----------------------------- */
export function CardReflexao({ dados, tamanho }: PropsCard) {
  const pergunta = escolhaDoDia(PERGUNTAS_REFLEXAO, dados.hoje)
  return (
    <CartaoHoje tamanho={tamanho}>
      <CabecalhoCard icone={<IconNuvem width={16} height={16} />} titulo="Reflexão rápida" cor="#884dff" />
      <CampoDiario tipo="reflexao" hoje={dados.hoje} pergunta={pergunta} placeholder="Responda em um minuto…" cor="#884dff" />
    </CartaoHoje>
  )
}

/* -------------------------------- Frase do dia ------------------------------ */
export function CardFraseDoDia({ dados, tamanho }: PropsCard) {
  const frase = escolhaDoDia(FRASES, dados.hoje)
  return (
    <CartaoHoje tamanho={tamanho}>
      <CabecalhoCard icone={<IconEstrela width={16} height={16} />} titulo="Frase do dia" cor="#eb8909" />
      <blockquote className="flex flex-1 flex-col justify-center">
        <p className="text-[16px] font-medium italic leading-relaxed">“{frase.texto}”</p>
        <footer className="mt-2 text-[13px] text-muted">— {frase.autor}</footer>
      </blockquote>
    </CartaoHoje>
  )
}

/* ------------------------------ Leitura sugerida ---------------------------- */
export function CardLeitura({ dados, tamanho }: PropsCard) {
  const livro = dados.livroLendo
  if (!livro) return null
  return (
    <CartaoHoje tamanho={tamanho} to={`/biblioteca/${livro.id}`}>
      <CabecalhoCard icone={<IconLivro width={16} height={16} />} titulo="Leitura sugerida" cor="#299438" />
      <div className="flex flex-1 items-center gap-3">
        {livro.capa ? (
          <CapaImg
            src={livro.capa}
            className="h-16 w-11 shrink-0 rounded object-cover shadow-sm"
            fallback={<span className="h-16 w-11 shrink-0 rounded bg-hover" />}
          />
        ) : (
          <span className="h-16 w-11 shrink-0 rounded bg-hover" />
        )}
        <div className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold">{livro.titulo}</span>
          <span className="block text-[12px] text-muted">Continuar lendo</span>
          <span className="mt-1.5 block">
            <BarraProgresso fracao={(livro.progresso ?? 0) / 100} altura={6} cor="#299438" />
          </span>
        </div>
      </div>
    </CartaoHoje>
  )
}

/* ------------------------------- Acesso rápido ------------------------------ */
const ATALHOS = [
  { to: '/tarefas', icone: IconCheck, rotulo: 'Nova tarefa' },
  { to: '/agenda', icone: IconCalendario, rotulo: 'Novo evento' },
  { to: '/notas', icone: IconDocumento, rotulo: 'Nova nota' },
  { to: '/habitos', icone: IconRepetir, rotulo: 'Novo hábito' },
]
export function CardAcessoRapido({ tamanho }: PropsCard) {
  return (
    <CartaoHoje tamanho={tamanho}>
      <CabecalhoCard icone={<IconMais width={16} height={16} />} titulo="Acesso rápido" />
      <div className="grid flex-1 grid-cols-2 gap-2">
        {ATALHOS.map(({ to, icone: Icone, rotulo }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-bg py-3 text-[12px] font-medium transition-colors hover:bg-hover"
          >
            <Icone width={20} height={20} className="text-accent" />
            {rotulo}
          </Link>
        ))}
      </div>
    </CartaoHoje>
  )
}

/* -------------------------------- Amanhã ------------------------------------ */
export function CardAmanha({ dados, tamanho }: PropsCard) {
  const evs = dados.eventosAmanha
    .filter((e) => !e.diaInteiro && hhmmParaMin(e.inicio) != null)
    .slice(0, 4)
  if (evs.length === 0) return null
  return (
    <CartaoHoje tamanho={tamanho} to="/agenda">
      <CabecalhoCard icone={<IconSol width={16} height={16} />} titulo="Amanhã" />
      <ul className="flex flex-col gap-1.5">
        {evs.map((e) => (
          <li key={e.id} className="flex items-center gap-2.5 text-[13px]">
            <span className="h-6 w-1 shrink-0 rounded-full" style={{ backgroundColor: corEfetiva(e) }} />
            <span aria-hidden>{iconeEvento(e)}</span>
            <span className="min-w-0 flex-1 truncate">{e.titulo}</span>
            <span className="shrink-0 tabular-nums text-muted">{e.inicio}</span>
          </li>
        ))}
      </ul>
    </CartaoHoje>
  )
}
