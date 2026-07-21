import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { hojeISO } from '../../../core/dates'
import { useRegistros } from '../../humor/hooks'
import { useHabitos, useRegistros as useRegistrosHabito } from '../../habitos/hooks'
import { somaAguaHabitos } from '../../habitos/vinculos'
import {
  energia,
  gerarInsightsSaude,
  mediaMetrica,
  recuperacao,
  rotuloNivel,
  serie,
  ultimosDias,
} from '../analise'
import {
  calcularIMC,
  classificacaoIMC,
  DEF_MEDIDA,
  formatarMedida,
  METRICAS,
  proximaDoacao,
  ultimaMedida,
} from '../db'
import {
  useAtividades,
  useConsultas,
  useDoacoes,
  useExames,
  useMedicamentos,
  useMedicamentoTomadas,
  useMedidas,
  useSaude,
  useSaudeConfig,
  useVacinas,
} from '../hooks'
import { alternarTomada } from '../db'
import { CartaoMetrica } from './CartaoMetrica'
import { BarraMeta, GraficoMultiLinha } from './GraficosSaude'
import type { AbaSaude } from '../SaudePage'
import type { StatusExame, TipoMedida } from '../types'

const ROTULO = 'text-[11px] font-semibold uppercase tracking-wide text-muted'
const CARTAO = 'rounded-2xl border border-line bg-surface/50 p-4'

const CorStatus: Record<StatusExame, string> = { normal: '#299438', atencao: '#eb8909', alterado: '#d1453b' }
const RotStatus: Record<StatusExame, string> = { normal: 'Normal', atencao: 'Atenção', alterado: 'Alterado' }

export function VisaoGeralSaude({ onIrAba, onEditarDia }: { onIrAba: (a: AbaSaude) => void; onEditarDia: () => void }) {
  const hoje = hojeISO()
  const diasBrutos = useSaude() ?? []
  const medidas = useMedidas() ?? []
  const consultas = useConsultas() ?? []
  const medicamentos = useMedicamentos() ?? []
  const tomadas = useMedicamentoTomadas() ?? []
  const exames = useExames() ?? []
  const vacinas = useVacinas() ?? []
  const doacoes = useDoacoes() ?? []
  const atividades = useAtividades() ?? []
  const config = useSaudeConfig()
  const registrosHumor = useRegistros() ?? []

  // Água registrada por hábitos ("tomar água") soma na hidratação da Saúde.
  const habitos = useHabitos() ?? []
  const registrosHabito = useRegistrosHabito() ?? []
  const aguaHabitosMl = useMemo(
    () => somaAguaHabitos(habitos, registrosHabito, hoje),
    [habitos, registrosHabito, hoje],
  )
  // dias "efetivos": o dia de hoje ganha a água dos hábitos somada à manual.
  const dias = useMemo(() => {
    if (!aguaHabitosMl) return diasBrutos
    const achou = diasBrutos.some((d) => d.data === hoje)
    const ajustado = diasBrutos.map((d) =>
      d.data === hoje ? { ...d, aguaMl: (d.aguaMl ?? 0) + aguaHabitosMl } : d,
    )
    return achou ? ajustado : [...ajustado, { data: hoje, aguaMl: aguaHabitosMl } as (typeof diasBrutos)[number]]
  }, [diasBrutos, aguaHabitosMl, hoje])

  const diaHoje = dias.find((d) => d.data === hoje)
  const mediaFc = useMemo(() => mediaMetrica(dias, 'fcRepouso'), [dias])
  const rec = recuperacao(diaHoje, mediaFc)
  const ener = energia(diaHoje, config?.metaAguaMl ?? 2000)

  const datas7 = useMemo(() => ultimosDias(hoje, 7), [hoje])
  const rotulos7 = datas7.map((d) => format(parseISO(d), 'EEE', { locale: ptBR }))
  const seriesSemana = useMemo(
    () => [
      { nome: 'Passos', cor: '#8cae7b', pontos: serie(dias, 'passos', datas7) },
      { nome: 'Sono', cor: '#6d8bc4', pontos: serie(dias, 'sonoMin', datas7) },
      { nome: 'Freq. Cardíaca', cor: '#c46a5e', pontos: serie(dias, 'fcRepouso', datas7) },
    ],
    [dias, datas7],
  )

  const insights = useMemo(
    () => gerarInsightsSaude({ hoje, dias, registrosHumor, exames }),
    [hoje, dias, registrosHumor, exames],
  )

  const proximas = consultas
    .filter((c) => c.status === 'agendada' && c.data >= hoje)
    .sort((a, b) => (a.data < b.data ? -1 : 1))
    .slice(0, 3)

  const medsHoje = medicamentos.filter((m) => m.ativo !== false && (m.horarios?.length ?? 0) > 0)
  const tomouSet = new Set(tomadas.filter((t) => t.data === hoje).map((t) => `${t.medicamentoId}:${t.hora}`))

  const examesRecentes = [...exames].sort((a, b) => (a.data < b.data ? 1 : -1)).slice(0, 4)
  const ultimaDoacao = [...doacoes].sort((a, b) => (a.data < b.data ? 1 : -1))[0]
  const proximaVacina = vacinas
    .filter((v) => v.proximaDose && v.proximaDose >= hoje)
    .sort((a, b) => (a.proximaDose! < b.proximaDose! ? -1 : 1))[0]

  const peso = ultimaMedida(medidas, 'peso')
  const imc = calcularIMC(peso?.valor, config?.alturaCm ?? ultimaMedida(medidas, 'altura')?.valor)

  const metaAgua = config?.metaAguaMl ?? 2000
  const rostoRec = rec >= 65 ? '🙂' : rec >= 45 ? '😐' : '😴'

  const medidasChave: TipoMedida[] = ['peso', 'gordura', 'cintura', 'quadril', 'braco', 'peitoral']

  function diasAte(iso: string): number {
    return Math.round((parseISO(iso).getTime() - parseISO(hoje).getTime()) / 86400000)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Indicadores principais */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {(['passos', 'sonoMin', 'fcRepouso', 'aguaMl'] as const).map((chave) => {
          const def = METRICAS.find((m) => m.chave === chave)!
          return <CartaoMetrica key={chave} def={def} dias={dias} onAbrir={() => onIrAba('metricas')} />
        })}
        {/* Peso (das medidas) */}
        <button onClick={() => onIrAba('medidas')} className="flex flex-col gap-2 rounded-2xl border border-line p-3 text-left transition-colors hover:border-muted/40">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px]">⚖️</span>
            <span className="text-[12px] text-muted">Peso</span>
          </div>
          <span className="text-[17px] font-bold">{peso ? formatarMedida('peso', peso.valor) : '—'}</span>
          <span className="text-[11px] text-muted">{config?.metaPesoKg ? `meta ${config.metaPesoKg} kg` : 'sem meta'}</span>
        </button>
      </div>

      {/* Resumo da semana + Como está seu dia */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className={CARTAO}>
          <div className="mb-1 flex items-center justify-between">
            <span className={ROTULO}>Resumo da semana</span>
            <div className="flex gap-2 text-[10px]">
              {seriesSemana.map((s) => (
                <span key={s.nome} className="flex items-center gap-1 text-muted">
                  <span className="inline-block size-2 rounded-full" style={{ backgroundColor: s.cor }} /> {s.nome}
                </span>
              ))}
            </div>
          </div>
          <GraficoMultiLinha series={seriesSemana} rotulos={rotulos7} />
          <button onClick={() => onIrAba('metricas')} className="mt-1 flex w-full items-center justify-between rounded-xl bg-hover px-3 py-2 text-[13px] font-medium text-muted hover:text-ink">
            Ver todas as métricas <span>→</span>
          </button>
        </div>

        <div className={CARTAO}>
          <span className={ROTULO}>Como está seu dia?</span>
          <div className="mt-2 flex items-center gap-3">
            <span className="flex size-14 items-center justify-center rounded-full bg-accent/10 text-[28px]">{rostoRec}</span>
            <div>
              <div className="text-[15px] font-bold">{rec >= 65 ? 'Você está bem!' : rec >= 45 ? 'Dia moderado' : 'Priorize o descanso'}</div>
              <p className="text-[12px] leading-snug text-muted">
                {diaHoje?.sonoMin && diaHoje.sonoMin >= mediaMetrica(dias, 'sonoMin')
                  ? 'Você dormiu bem e seus hábitos estão consistentes.'
                  : 'Sua recuperação está adequada; hidrate-se e mantenha o ritmo.'}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-[12px]"><span>Recuperação do corpo</span><span className="font-semibold">{rec}%</span></div>
              <BarraMeta frac={rec / 100} cor="#299438" />
              <div className="mt-0.5 text-right text-[10px] text-muted">{rotuloNivel(rec)}</div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[12px]"><span>Nível de energia</span><span className="font-semibold">{ener}%</span></div>
              <BarraMeta frac={ener / 100} cor="#eb8909" />
              <div className="mt-0.5 text-right text-[10px] text-muted">{rotuloNivel(ener)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Atividades · Compromissos · Medicamentos */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <CartaoLista titulo="Atividades de hoje" onVer={() => onIrAba('treinos')}>
          {atividades.filter((a) => a.data === hoje).length === 0 && <Vazio texto="Nenhuma atividade hoje." />}
          {atividades.filter((a) => a.data === hoje).slice(0, 4).map((a) => (
            <button key={a.id} onClick={() => onIrAba('treinos')} className="flex w-full items-center gap-3 py-1.5 text-left">
              <span className="text-[15px]">🏃</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium">{a.tipo}</span>
                <span className="block text-[11px] text-muted">{a.hora ? `${a.hora} · ` : ''}{a.duracaoMin ? `${a.duracaoMin} min` : ''}{a.distanciaKm ? ` · ${a.distanciaKm} km` : ''}</span>
              </span>
              {a.calorias != null && <span className="shrink-0 text-[12px] font-semibold text-muted">{a.calorias} kcal</span>}
            </button>
          ))}
        </CartaoLista>

        <CartaoLista titulo="Próximos compromissos" onVer={() => onIrAba('consultas')}>
          {proximas.length === 0 && <Vazio texto="Nenhuma consulta agendada." />}
          {proximas.map((c) => (
            <button key={c.id} onClick={() => onIrAba('consultas')} className="flex w-full items-start gap-3 py-1.5 text-left">
              <span className="mt-0.5 text-[15px]">🩺</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium">{c.titulo ?? c.especialidade}</span>
                <span className="block text-[11px] text-muted">{format(parseISO(c.data), "EEE, d MMM", { locale: ptBR })}{c.hora ? ` · ${c.hora}` : ''}{c.local ? ` · ${c.local}` : ''}</span>
              </span>
            </button>
          ))}
        </CartaoLista>

        <CartaoLista titulo="Medicamentos de hoje" onVer={() => onIrAba('medicamentos')}>
          {medsHoje.length === 0 && <Vazio texto="Nenhum medicamento ativo." />}
          {medsHoje.slice(0, 4).map((m) => {
            const hora = m.horarios![0]
            const tomado = tomouSet.has(`${m.id}:${hora}`)
            return (
              <div key={m.id} className="flex items-center gap-3 py-1.5">
                <span className="flex size-8 items-center justify-center rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${m.cor ?? '#6a86b8'} 16%, transparent)` }}>💊</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{m.nome}</span>
                  <span className="block text-[11px] text-muted">{m.dosagem}</span>
                </span>
                <button
                  onClick={() => alternarTomada(m.id, hoje, hora)}
                  className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium transition-colors ${tomado ? 'bg-green-500/15 text-green-600' : 'bg-hover text-muted hover:text-ink'}`}
                >
                  {tomado ? '✓' : '🕐'} {hora}
                </button>
              </div>
            )
          })}
        </CartaoLista>
      </div>

      {/* Exames · Doação · Vacinas */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <CartaoLista titulo="Exames e avaliações" onVer={() => onIrAba('exames')}>
          {examesRecentes.length === 0 && <Vazio texto="Nenhum exame registrado." />}
          {examesRecentes.map((e) => (
            <button key={e.id} onClick={() => onIrAba('exames')} className="flex w-full items-center gap-3 py-1.5 text-left">
              <span className="text-[15px]">🧪</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{e.nome}</span>
                <span className="block text-[11px] text-muted">{format(parseISO(e.data), 'dd/MM/yyyy')}</span>
              </span>
              {e.status && <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `color-mix(in srgb, ${CorStatus[e.status]} 16%, transparent)`, color: CorStatus[e.status] }}>{RotStatus[e.status]}</span>}
            </button>
          ))}
        </CartaoLista>

        <CartaoLista titulo="Doação de sangue" icone="🩸" onVer={() => onIrAba('doacao')}>
          {ultimaDoacao ? (
            <div className="py-1">
              <div className="text-[11px] text-muted">Última doação</div>
              <div className="text-[16px] font-bold">{format(parseISO(ultimaDoacao.data), 'dd/MM/yyyy')}</div>
              <div className="mt-2 text-[11px] text-muted">Próxima possível</div>
              <div className="text-[15px] font-bold text-accent">{format(parseISO(proximaDoacao(ultimaDoacao.data)), 'dd/MM/yyyy')}</div>
              {config?.tipoSanguineo && <div className="mt-2 text-[12px] text-muted">Tipo sanguíneo: <b className="text-ink">{config.tipoSanguineo}</b></div>}
            </div>
          ) : <Vazio texto="Nenhuma doação registrada." />}
        </CartaoLista>

        <CartaoLista titulo="Vacinas" icone="💉" onVer={() => onIrAba('vacinas')}>
          {proximaVacina ? (
            <div className="py-1">
              <div className="text-[11px] text-muted">Próxima vacina</div>
              <div className="text-[16px] font-bold">{proximaVacina.nome}</div>
              <div className="mt-2 text-[15px] font-bold">{format(parseISO(proximaVacina.proximaDose!), 'dd/MM/yyyy')}</div>
              <div className="text-[11px] text-muted">Em {diasAte(proximaVacina.proximaDose!)} dias</div>
            </div>
          ) : <Vazio texto="Nenhuma dose pendente." />}
        </CartaoLista>
      </div>

      {/* Insights + Medidas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-accent/[0.06] p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className={ROTULO}>✦ Insights da saúde</span>
            <button onClick={() => onIrAba('linha')} className="text-[12px] font-medium text-muted hover:text-ink">Linha do tempo</button>
          </div>
          <ul className="flex flex-col gap-3">
            {insights.length === 0 && <li className="text-[13px] text-muted">Registre mais dias para o Lume observar padrões.</li>}
            {insights.map((ins) => (
              <li key={ins.id} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface text-[13px]">{ins.icone}</span>
                <span>
                  <span className="block text-[13px] leading-snug">{ins.texto}</span>
                  {ins.meta && <span className="text-[10.5px] text-muted">{ins.meta}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className={CARTAO}>
          <div className="mb-3 flex items-center justify-between">
            <span className={ROTULO}>Medidas corporais</span>
            <button onClick={() => onIrAba('medidas')} className="text-[12px] font-medium text-muted hover:text-ink">Ver todas</button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {medidasChave.map((tipo) => {
              const m = ultimaMedida(medidas, tipo)
              const def = DEF_MEDIDA.get(tipo)!
              return (
                <div key={tipo} className="rounded-xl border border-line p-2.5">
                  <div className="text-[11px] text-muted">{def.nome}</div>
                  <div className="text-[16px] font-bold leading-tight">{m ? formatarMedida(tipo, m.valor) : '—'}</div>
                  {tipo === 'peso' && imc != null && <div className="text-[10px]" style={{ color: CorStatus[imc >= 25 ? 'atencao' : 'normal'] }}>IMC {imc.toFixed(1)} · {classificacaoIMC(imc)}</div>}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Dica do dia */}
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface/40 p-4">
        <span className="text-[22px]">🌿</span>
        <div>
          <div className="text-[13px] font-semibold">Dica do dia</div>
          <p className="text-[12.5px] text-muted">
            {(diaHoje?.aguaMl ?? 0) < metaAgua
              ? `Hidrate-se! Você ainda pode beber mais ${((metaAgua - (diaHoje?.aguaMl ?? 0)) / 1000).toFixed(1)} L de água hoje para atingir sua meta.`
              : 'Meta de hidratação atingida hoje. Continue cuidando do sono e do movimento.'}
          </p>
        </div>
        <button onClick={onEditarDia} className="ml-auto shrink-0 rounded-full bg-ink px-3 py-1.5 text-[12px] font-medium text-surface">Registrar dia</button>
      </div>
    </div>
  )
}

/* ------------------------------- auxiliares ------------------------------- */

function CartaoLista({ titulo, icone, onVer, children }: { titulo: string; icone?: string; onVer: () => void; children: React.ReactNode }) {
  return (
    <div className={CARTAO}>
      <div className="mb-2 flex items-center justify-between">
        <span className={ROTULO}>{icone ? `${icone} ` : ''}{titulo}</span>
        <button onClick={onVer} className="text-[12px] font-medium text-muted hover:text-ink">Ver todas</button>
      </div>
      <div className="flex flex-col divide-y divide-line/60">{children}</div>
    </div>
  )
}
function Vazio({ texto }: { texto: string }) {
  return <div className="py-2 text-[12.5px] text-muted">{texto}</div>
}
