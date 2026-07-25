import {
  IconCheckCircle,
  IconEstrela,
  IconHumor,
  IconMusica,
  IconSol,
} from '../../../core/components/Icons'
import { IconeFator } from '../../../core/components/icones'
import { AnelProgresso } from '../../habitos/components/AnelProgresso'
import { Checkbox } from '../../../core/components/Checkbox'
import { DiscoHumor } from '../../humor/components/RostoHumor'
import { criarRegistro, humorDe } from '../../humor/humor'
import type { NivelHumor } from '../../humor/types'
import { CartaoHoje } from '../CartaoHoje'
import { useLocal } from '../local'
import { hhmmParaMin } from '../agora'
import { escolhaDoDia, SUGESTOES_RELAXAR } from '../frases'
import { CabecalhoCard, Rotulo } from '../ui'
import { CampoDiario } from './CampoDiario'
import type { PropsCard } from './tipos'

const COR_NOITE = '#884dff'
const COR_OK = '#299438'
const COR_AMBAR = '#e0a800'

/* --------------------- Momento de desacelerar (+ gratidão) ------------------ */
export function CardDesacelerar({ dados, tamanho }: PropsCard) {
  const fim = dados.faixa === 'fimdenoite'
  return (
    <CartaoHoje
      tamanho={tamanho}
      destaque
      style={{
        backgroundColor: `color-mix(in srgb, ${COR_NOITE} 8%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${COR_NOITE} 20%, transparent)`,
      }}
    >
      <div className="mb-1 flex items-center gap-2" style={{ color: COR_NOITE }}>
        <IconeFator nome="lua" width={20} height={20} />
        <Rotulo cor={COR_NOITE}>{fim ? 'Fim do dia' : 'Noite'}</Rotulo>
      </div>
      <h2 className="text-2xl font-bold leading-tight">Momento de desacelerar</h2>
      <p className="mt-2 text-[14px] text-muted">
        Você fez o seu melhor hoje. Descanse para recarregar e estar pronto para um novo amanhecer.
      </p>
      <div className="mt-4 rounded-xl border border-line bg-bg/60 p-3">
        <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold" style={{ color: COR_NOITE }}>
          <IconeFator nome="coracao" width={15} height={15} /> Gratidão de hoje
        </div>
        <CampoDiario tipo="gratidao" hoje={dados.hoje} placeholder="Sou grato por…" cor={COR_NOITE} />
      </div>
    </CartaoHoje>
  )
}

/* ---------------------------- Resumo do seu dia ----------------------------- */
function LinhaResumo({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <li className="flex items-center gap-2 text-[13px]">
      <span
        className="flex size-5 shrink-0 items-center justify-center rounded-full"
        style={ok ? { backgroundColor: COR_OK, color: '#fff' } : { border: '2px solid var(--vida-line)' }}
      >
        {ok ? '✓' : ''}
      </span>
      {texto}
    </li>
  )
}

export function CardResumoNoite({ dados, tamanho }: PropsCard) {
  const hab = dados.resumoHabitos
  const tar = dados.indicadores
  const eventosFeitos = dados.cronologicos.filter((e) => (hhmmParaMin(e.fim) ?? 0) <= dados.agoraMin).length
  const somaFeitos = hab.feitos + tar.feitas
  const somaTotal = hab.total + tar.total
  const frac = somaTotal > 0 ? somaFeitos / somaTotal : 0
  const otimo = frac >= 0.7

  return (
    <CartaoHoje tamanho={tamanho}>
      <CabecalhoCard icone={<IconCheckCircle width={16} height={16} />} titulo="Resumo do seu dia" cor={COR_AMBAR} />
      <div className="flex flex-1 items-center gap-4">
        <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
          <LinhaResumo ok={hab.total > 0 && hab.feitos === hab.total} texto={`${hab.feitos} / ${hab.total} hábitos`} />
          <LinhaResumo ok={tar.total > 0 && tar.feitas === tar.total} texto={`${tar.feitas} / ${tar.total} tarefas`} />
          <LinhaResumo ok={eventosFeitos > 0} texto={`${eventosFeitos} evento${eventosFeitos === 1 ? '' : 's'} realizado${eventosFeitos === 1 ? '' : 's'}`} />
        </ul>
        <AnelProgresso fracao={frac} tamanho={72} espessura={6} cor={COR_AMBAR}>
          {otimo ? (
            <span className="text-center text-[11px] font-bold leading-tight">
              Muito
              <br />
              bem!
            </span>
          ) : (
            <span className="text-[13px] font-bold tabular-nums">{Math.round(frac * 100)}%</span>
          )}
        </AnelProgresso>
      </div>
    </CartaoHoje>
  )
}

/* ------------------------------- Humor de hoje ------------------------------ */
export function CardHumor({ dados, tamanho }: PropsCard) {
  const registrado = dados.humorHoje[0]?.nivel
  return (
    <CartaoHoje tamanho={tamanho}>
      <CabecalhoCard icone={<IconHumor width={16} height={16} />} titulo="Como você se sentiu hoje?" cor="#c46a5e" />
      <div className="flex flex-1 items-center justify-between gap-1">
        {dados.humorTipos.map((t) => (
          <DiscoHumor
            key={t.nivel}
            nivel={t.nivel}
            cor={t.cor}
            ativo={registrado === t.nivel}
            tamanho={tamanho === 'hero' ? 52 : 44}
            rotulo={t.nome}
            onClick={() => {
              void criarRegistro({ data: dados.hoje, nivel: t.nivel as NivelHumor })
            }}
          />
        ))}
      </div>
      {registrado && (
        <p className="mt-2 text-center text-[12px] text-muted">
          Registrado: {humorDe(dados.humorTipos, registrado).nome}
        </p>
      )}
    </CartaoHoje>
  )
}

/* ------------------------------ Atividade física ---------------------------- */
export function CardAtividade({ dados, tamanho }: PropsCard) {
  const a = dados.atividadesHoje[0]
  if (!a) return null
  const detalhes = [
    a.duracaoMin ? `${a.duracaoMin} min` : null,
    a.distanciaKm ? `${a.distanciaKm} km` : null,
    a.calorias ? `${a.calorias} kcal` : null,
  ].filter(Boolean)
  return (
    <CartaoHoje tamanho={tamanho} to="/saude">
      <CabecalhoCard icone={<IconeFator nome="corrida" width={16} height={16} />} titulo="Atividade física" cor={COR_OK} />
      <div className="flex flex-1 flex-col justify-center">
        <span className="text-[12px] text-muted">Treino de hoje</span>
        <span className="text-[17px] font-bold leading-tight">{a.tipo}</span>
        {detalhes.length > 0 && <span className="mt-1 text-[13px] text-muted">{detalhes.join(' · ')}</span>}
        {dados.atividadesHoje.length > 1 && (
          <span className="mt-1 text-[12px] text-muted">+{dados.atividadesHoje.length - 1} outro treino hoje</span>
        )}
      </div>
    </CartaoHoje>
  )
}

/* ----------------------------- Propósito de amanhã -------------------------- */
export function CardPropositoAmanha({ dados, tamanho }: PropsCard) {
  return (
    <CartaoHoje tamanho={tamanho}>
      <CabecalhoCard icone={<IconEstrela width={16} height={16} />} titulo="Propósito de amanhã" cor={COR_NOITE} />
      <CampoDiario tipo="proposito" hoje={dados.hoje} placeholder="Defina uma intenção para o seu dia…" cor={COR_NOITE} />
    </CartaoHoje>
  )
}

/* ----------------------------- Preparado para dormir ------------------------ */
const ITENS_DORMIR = ['Luzes baixas', 'Tela longe', 'Relaxar', 'Respirar fundo']
export function CardPrepararDormir({ dados, tamanho }: PropsCard) {
  const [marcados, setMarcados] = useLocal<string[]>(`dormir:${dados.hoje}`, [])
  function alternar(item: string) {
    setMarcados((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]))
  }
  return (
    <CartaoHoje tamanho={tamanho}>
      <CabecalhoCard icone={<IconeFator nome="lua" width={16} height={16} />} titulo="Preparado para dormir?" cor={COR_NOITE} />
      <div className="flex flex-col gap-0.5">
        {ITENS_DORMIR.map((item) => (
          <Checkbox key={item} marcado={marcados.includes(item)} onChange={() => alternar(item)} rotulo={item} />
        ))}
      </div>
    </CartaoHoje>
  )
}

/* ----------------------------- Sugestão para relaxar ------------------------ */
export function CardSugestaoRelaxar({ dados, tamanho }: PropsCard) {
  const s = escolhaDoDia(SUGESTOES_RELAXAR, dados.hoje)
  return (
    <CartaoHoje tamanho={tamanho}>
      <CabecalhoCard icone={<IconMusica width={16} height={16} />} titulo="Sugestão para relaxar" cor={COR_NOITE} />
      <div className="flex flex-1 flex-col justify-center">
        <span className="text-[15px] font-semibold">{s.titulo}</span>
        <span className="mt-1 text-[13px] text-muted">{s.detalhe}</span>
      </div>
    </CartaoHoje>
  )
}

/* ------------------------------ Amanhã te espera ---------------------------- */
export function CardAmanhaEspera({ tamanho }: PropsCard) {
  return (
    <CartaoHoje
      tamanho={tamanho}
      style={{ backgroundColor: `color-mix(in srgb, ${COR_AMBAR} 8%, transparent)` }}
    >
      <div className="mb-1 flex items-center gap-2" style={{ color: COR_AMBAR }}>
        <IconSol width={20} height={20} />
        <Rotulo cor={COR_AMBAR}>Amanhã te espera</Rotulo>
      </div>
      <p className="flex flex-1 items-center text-[15px] font-medium leading-relaxed">
        Você já é melhor do que ontem. Continue assim!
      </p>
    </CartaoHoje>
  )
}
