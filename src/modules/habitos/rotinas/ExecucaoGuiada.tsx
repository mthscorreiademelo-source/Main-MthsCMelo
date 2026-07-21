import { useEffect, useMemo, useRef, useState } from 'react'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { AnelProgresso } from '../components/AnelProgresso'
import { hojeISO } from '../../../core/dates'
import { definirEstadoSimNao, definirValor, ehMedido } from '../db'
import { useHabitos } from '../hooks'
import { EMOJI_TIPO_ETAPA, etapasDaVersao, ROTULO_VERSAO, temVersoes, type EtapaRotina, type Rotina, type VersaoRotina } from './types'
import { encerrarExecucao, iniciarExecucao, marcarEtapa, pularEtapa, useExecucaoHoje } from './db'

const VERSOES: VersaoRotina[] = ['minima', 'rapida', 'completa']

/** Registra o hábito vinculado a uma etapa concluída — sem duplicar dados. */
async function registrarHabitoDaEtapa(habitoId: string, habitos: ReturnType<typeof useHabitos>) {
  const h = (habitos ?? []).find((x) => x.id === habitoId)
  if (!h) return
  const hoje = hojeISO()
  if (h.tipo === 'sim_nao') await definirEstadoSimNao(h.id, hoje, 'feito')
  else if (ehMedido(h.tipo)) await definirValor(h, hoje, h.meta ?? 1)
}

function Cronometro({ minutos, onFim }: { minutos: number; onFim: () => void }) {
  const [restante, setRestante] = useState(minutos * 60)
  const [rodando, setRodando] = useState(false)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (!rodando) return
    ref.current = setInterval(() => setRestante((r) => Math.max(0, r - 1)), 1000)
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [rodando])
  useEffect(() => { if (restante === 0 && rodando) { setRodando(false); onFim() } }, [restante, rodando, onFim])
  const mm = String(Math.floor(restante / 60)).padStart(2, '0')
  const ss = String(restante % 60).padStart(2, '0')
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-4xl font-bold tabular-nums">{mm}:{ss}</span>
      <button onClick={() => setRodando((v) => !v)} className="rounded-full border border-line px-4 py-1.5 text-[13px] font-medium text-muted hover:text-ink">
        {rodando ? 'Pausar' : restante === minutos * 60 ? 'Iniciar' : 'Continuar'}
      </button>
    </div>
  )
}

export function ExecucaoGuiada({ rotina, onFechar }: { rotina: Rotina; onFechar: () => void }) {
  const habitos = useHabitos()
  const [execId, setExecId] = useState<string | null>(null)
  const [versao, setVersao] = useState<VersaoRotina>('completa')
  const exec = useExecucaoHoje(rotina.id)

  useEffect(() => { iniciarExecucao(rotina.id).then(setExecId) }, [rotina.id])

  const adaptativa = temVersoes(rotina.etapas)
  const etapas = useMemo(() => (adaptativa ? etapasDaVersao(rotina.etapas, versao) : rotina.etapas), [rotina.etapas, versao, adaptativa])
  const feitas = useMemo(() => new Set(exec?.feitas ?? []), [exec])
  const puladas = useMemo(() => new Set(exec?.puladas ?? []), [exec])
  const pendentes = etapas.filter((e) => !feitas.has(e.id) && !puladas.has(e.id))
  const atual: EtapaRotina | undefined = pendentes[0]
  const total = etapas.length
  const concluidas = etapas.filter((e) => feitas.has(e.id) || puladas.has(e.id)).length
  const frac = total ? concluidas / total : 1

  async function concluir(et: EtapaRotina) {
    if (!execId) return
    if (et.habitoId) await registrarHabitoDaEtapa(et.habitoId, habitos)
    await marcarEtapa(execId, et.id, true)
  }

  async function encerrar() {
    if (execId) await encerrarExecucao(execId)
    onFechar()
  }

  const fim = !atual
  const proxima = pendentes[1]

  return (
    <FolhaInferior titulo={rotina.nome} onFechar={onFechar}>
      <div className="flex flex-col gap-4">
        {/* Versão adaptativa */}
        {adaptativa && (
          <div className="flex items-center gap-1 rounded-full border border-line p-0.5 text-[12.5px]">
            {VERSOES.map((v) => (
              <button key={v} onClick={() => setVersao(v)} className={`flex-1 rounded-full py-1.5 font-medium transition-colors ${versao === v ? 'bg-ink text-surface' : 'text-muted hover:bg-hover'}`}>
                {ROTULO_VERSAO[v]}
              </button>
            ))}
          </div>
        )}

        {/* Progresso */}
        <div className="flex items-center gap-3">
          <AnelProgresso fracao={frac} tamanho={44} espessura={4} cor={rotina.cor ?? 'var(--vida-accent)'}>
            <span className="text-[11px] font-bold tabular-nums">{Math.round(frac * 100)}%</span>
          </AnelProgresso>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold">{concluidas} de {total} etapas</div>
            <div className="text-[12px] text-muted">{fim ? 'Rotina concluída 🎉' : proxima ? `Depois: ${proxima.titulo}` : 'Última etapa'}</div>
          </div>
        </div>

        {/* Etapa atual */}
        {atual ? (
          <div className="rounded-2xl border border-line bg-surface/50 p-4 text-center">
            <span className="text-[26px]">{EMOJI_TIPO_ETAPA[atual.tipo]}</span>
            <h3 className="mt-1 text-[18px] font-bold leading-tight">{atual.titulo}</h3>
            {atual.instrucao && <p className="mt-1 text-[13px] text-muted">{atual.instrucao}</p>}
            {atual.tipo === 'timer' && atual.duracaoMin ? (
              <div className="mt-3"><Cronometro minutos={atual.duracaoMin} onFim={() => concluir(atual)} /></div>
            ) : null}
            <div className="mt-4 flex items-center justify-center gap-2">
              <button onClick={() => concluir(atual)} className="min-h-11 flex-1 rounded-full bg-ink text-[14px] font-semibold text-surface">Concluir</button>
              {atual.opcional !== false && (
                <button onClick={() => execId && pularEtapa(execId, atual.id)} className="min-h-11 rounded-full border border-line px-4 text-[13px] font-medium text-muted hover:text-ink">Pular</button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-line bg-accent/[0.06] p-5 text-center">
            <span className="text-3xl">🎉</span>
            <p className="mt-1 text-[15px] font-semibold">Rotina concluída</p>
            <p className="text-[12.5px] text-muted">Bom trabalho — tudo o que dava para hoje.</p>
          </div>
        )}

        {/* Lista de etapas */}
        <ul className="flex flex-col gap-1">
          {etapas.map((e) => {
            const done = feitas.has(e.id)
            const skip = puladas.has(e.id)
            return (
              <li key={e.id} className="flex items-center gap-2.5 rounded-lg px-1 py-1 text-[13.5px]">
                <span className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] ${done ? 'bg-accent text-white' : skip ? 'bg-hover text-muted' : 'border border-line'}`}>{done ? '✓' : skip ? '–' : ''}</span>
                <span className={done || skip ? 'text-muted line-through' : ''}>{e.titulo}</span>
                <span className="ml-auto text-[11px] text-muted/60">{EMOJI_TIPO_ETAPA[e.tipo]}</span>
              </li>
            )
          })}
        </ul>

        <button onClick={encerrar} className="self-center text-[13px] font-medium text-muted hover:text-ink">
          {fim ? 'Encerrar' : 'Encerrar rotina'}
        </button>
      </div>
    </FolhaInferior>
  )
}
