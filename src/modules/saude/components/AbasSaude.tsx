import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { IconLapis, IconLixeira, IconMais } from '../../../core/components/Icons'
import { hojeISO, rotuloData } from '../../../core/dates'
import { criarEvento } from '../../agenda/db'
import { CartaoMetrica } from './CartaoMetrica'
import { BarraMeta, GraficoLinha } from './GraficosSaude'
import { salvarAnexo, useAnexoUrl } from '../anexo'
import { nutricaoDoDia, ultimosDias } from '../analise'
import {
  DEF_MEDIDA,
  MEDIDAS,
  METRICAS,
  alternarTomada,
  atualizarConsulta,
  calcularIMC,
  classificacaoIMC,
  criarAtividade,
  criarConsulta,
  criarDoacao,
  criarExame,
  criarMedicamento,
  criarProfissional,
  criarRefeicao,
  criarVacina,
  atualizarProfissional,
  excluirAtividade,
  excluirConsulta,
  excluirDoacao,
  excluirExame,
  excluirMedicamento,
  excluirMedida,
  excluirProfissional,
  excluirRefeicao,
  excluirVacina,
  formatarMedida,
  proximaDoacao,
  salvarMedida,
  salvarSaudeConfig,
  statusPorReferencia,
  ultimaMedida,
} from '../db'
import { linhaDoTempo } from '../analise'
import {
  useAtividades,
  useConsultas,
  useDoacoes,
  useExames,
  useMedicamentos,
  useMedicamentoTomadas,
  useMedidas,
  useProfissionais,
  useRefeicoes,
  useSaude,
  useSaudeConfig,
  useVacinas,
} from '../hooks'
import type { MetricaSaude, StatusExame, TipoMedida, TipoRefeicao } from '../types'

const CARTAO = 'rounded-2xl border border-line bg-surface/50 p-4'
const ROTULO = 'text-[11px] font-semibold uppercase tracking-wide text-muted'
const CAMPO = 'min-h-10 w-full rounded-lg border border-line bg-surface px-3 text-[15px] outline-none focus:border-muted/60'
const ROTCAMPO = 'text-[12px] font-medium text-muted'
const BTNADD = 'flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-3 text-[13px] font-medium text-muted hover:text-ink'
const BTNSALVAR = 'mt-1 flex min-h-11 items-center justify-center rounded-xl bg-ink text-[15px] font-medium text-surface'

const CorStatus: Record<StatusExame, string> = { normal: '#299438', atencao: '#eb8909', alterado: '#d1453b' }
const RotStatus: Record<StatusExame, string> = { normal: 'Normal', atencao: 'Atenção', alterado: 'Alterado' }

function num(t: string): number | undefined {
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}
function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className={ROTCAMPO}>{rotulo}</span>
      {children}
    </label>
  )
}
function BotaoExcluir({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} aria-label="Excluir" className="shrink-0 text-danger/80 hover:text-danger"><IconLixeira width={16} height={16} /></button>
}

/* ================================ MÉTRICAS ================================ */

export function AbaMetricas({ emApp, onEditarDia }: { emApp: boolean; onEditarDia: (d: string) => void }) {
  void emApp
  const dias = useSaude() ?? []
  const [metrica, setMetrica] = useState<MetricaSaude>('passos')
  const [periodo, setPeriodo] = useState(14)
  const datas = useMemo(() => ultimosDias(hojeISO(), periodo), [periodo])
  const def = METRICAS.find((m) => m.chave === metrica)!
  const mapa = new Map(dias.map((d) => [d.data, d[metrica]]))
  const pontos = datas.map((d) => { const v = mapa.get(d); return typeof v === 'number' ? v : null })
  const rotulos = datas.map((d) => format(parseISO(d), periodo > 20 ? 'd/M' : 'EEE', { locale: ptBR }))
  const ordenados = [...dias].sort((a, b) => (a.data < b.data ? 1 : -1)).slice(0, 30)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {METRICAS.map((m) => <CartaoMetrica key={m.chave} def={m} dias={dias} onAbrir={() => setMetrica(m.chave)} />)}
      </div>
      <div className={CARTAO}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {METRICAS.map((m) => (
              <button key={m.chave} onClick={() => setMetrica(m.chave)} className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${metrica === m.chave ? 'bg-ink text-surface' : 'bg-hover text-muted hover:text-ink'}`}>{m.nome}</button>
            ))}
          </div>
          <div className="flex gap-1">
            {[7, 14, 30, 90].map((p) => (
              <button key={p} onClick={() => setPeriodo(p)} className={`rounded-full px-2 py-1 text-[11px] font-medium ${periodo === p ? 'bg-ink text-surface' : 'bg-hover text-muted'}`}>{p === 7 ? 'Sem' : p === 14 ? '2sem' : p === 30 ? 'Mês' : '3m'}</button>
            ))}
          </div>
        </div>
        <GraficoLinha pontos={pontos} rotulos={rotulos} cor={def.cor} formatar={(v) => def.formatar(Math.round(v))} />
      </div>
      <div className={CARTAO}>
        <span className={ROTULO}>Histórico</span>
        <ul className="mt-2 flex flex-col divide-y divide-line/60">
          {ordenados.map((d) => (
            <li key={d.id}>
              <button onClick={() => onEditarDia(d.data)} className="flex w-full items-center gap-3 py-2 text-left">
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-medium">{d.data === hojeISO() ? 'Hoje' : rotuloData(d.data)}</span>
                  <span className="block truncate text-[12px] text-muted">{METRICAS.map((m) => d[m.chave] != null ? def.formatar && m.formatar(d[m.chave]!) : null).filter(Boolean).join(' · ') || '—'}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ================================ TREINOS ================================ */

export function AbaTreinos() {
  const atividades = useAtividades() ?? []
  const [novo, setNovo] = useState(false)
  const ordenadas = [...atividades].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : (b.hora ?? '').localeCompare(a.hora ?? '')))
  return (
    <div className="flex flex-col gap-3">
      {ordenadas.length === 0 && <p className="text-[13px] text-muted">Nenhuma atividade registrada.</p>}
      {ordenadas.map((a) => (
        <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-hover text-[18px]">🏃</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-semibold">{a.tipo}</div>
            <div className="text-[12px] text-muted">{a.data === hojeISO() ? 'Hoje' : format(parseISO(a.data), 'dd/MM')}{a.hora ? ` · ${a.hora}` : ''}{a.duracaoMin ? ` · ${a.duracaoMin} min` : ''}{a.distanciaKm ? ` · ${a.distanciaKm} km` : ''}{a.ritmo ? ` · ${a.ritmo}` : ''}</div>
          </div>
          {a.calorias != null && <span className="text-[13px] font-semibold text-muted">{a.calorias} kcal</span>}
          <BotaoExcluir onClick={() => excluirAtividade(a.id)} />
        </div>
      ))}
      <button onClick={() => setNovo(true)} className={BTNADD}><IconMais width={15} height={15} /> Registrar atividade</button>
      {novo && <EditorAtividade onFechar={() => setNovo(false)} />}
    </div>
  )
}

function EditorAtividade({ onFechar }: { onFechar: () => void }) {
  const [tipo, setTipo] = useState('Caminhada')
  const [data, setData] = useState(hojeISO())
  const [hora, setHora] = useState('')
  const [dur, setDur] = useState('')
  const [cal, setCal] = useState('')
  const [dist, setDist] = useState('')
  async function salvar() {
    await criarAtividade({ tipo, data, hora: hora || undefined, duracaoMin: num(dur), calorias: num(cal), distanciaKm: num(dist) })
    onFechar()
  }
  return (
    <FolhaInferior titulo="Nova atividade" onFechar={onFechar}>
      <Campo rotulo="Tipo"><input value={tipo} onChange={(e) => setTipo(e.target.value)} className={CAMPO} placeholder="Caminhada, Corrida, Força…" /></Campo>
      <div className="flex gap-3">
        <Campo rotulo="Data"><input type="date" value={data} onChange={(e) => setData(e.target.value)} className={CAMPO} /></Campo>
        <Campo rotulo="Hora"><input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={CAMPO} /></Campo>
      </div>
      <div className="flex gap-3">
        <Campo rotulo="Duração (min)"><input inputMode="decimal" value={dur} onChange={(e) => setDur(e.target.value)} className={CAMPO} /></Campo>
        <Campo rotulo="Calorias"><input inputMode="decimal" value={cal} onChange={(e) => setCal(e.target.value)} className={CAMPO} /></Campo>
        <Campo rotulo="Distância (km)"><input inputMode="decimal" value={dist} onChange={(e) => setDist(e.target.value)} className={CAMPO} /></Campo>
      </div>
      <button onClick={salvar} className={BTNSALVAR}>Salvar</button>
    </FolhaInferior>
  )
}

/* ============================== ALIMENTAÇÃO ============================== */

const TIPOS_REF: { v: TipoRefeicao; r: string; icone: string }[] = [
  { v: 'cafe', r: 'Café da manhã', icone: '☕' },
  { v: 'almoco', r: 'Almoço', icone: '🍽️' },
  { v: 'jantar', r: 'Jantar', icone: '🌙' },
  { v: 'lanche', r: 'Lanche', icone: '🥪' },
]

export function AbaAlimentacao() {
  const refeicoes = useRefeicoes() ?? []
  const [novo, setNovo] = useState(false)
  const hoje = hojeISO()
  const nut = nutricaoDoDia(refeicoes, hoje)
  const doDia = refeicoes.filter((r) => r.data === hoje).sort((a, b) => (a.hora ?? '').localeCompare(b.hora ?? ''))
  const outras = refeicoes.filter((r) => r.data !== hoje).sort((a, b) => (a.data < b.data ? 1 : -1)).slice(0, 12)
  return (
    <div className="flex flex-col gap-4">
      <div className={CARTAO}>
        <span className={ROTULO}>Hoje</span>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {[['Calorias', `${nut.calorias}`], ['Proteína', `${nut.proteinaG} g`], ['Carbo', `${nut.carboidratoG} g`], ['Gordura', `${nut.gorduraG} g`]].map(([r, v]) => (
            <div key={r} className="rounded-xl border border-line p-2 text-center">
              <div className="text-[16px] font-bold">{v}</div>
              <div className="text-[10.5px] text-muted">{r}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-col divide-y divide-line/60">
          {doDia.length === 0 && <p className="py-1 text-[13px] text-muted">Nenhuma refeição registrada hoje.</p>}
          {doDia.map((r) => <ItemRefeicao key={r.id} r={r} />)}
        </div>
      </div>
      <button onClick={() => setNovo(true)} className={BTNADD}><IconMais width={15} height={15} /> Registrar refeição</button>
      {outras.length > 0 && (
        <div className={CARTAO}>
          <span className={ROTULO}>Anteriores</span>
          <div className="mt-2 flex flex-col divide-y divide-line/60">
            {outras.map((r) => <ItemRefeicao key={r.id} r={r} mostrarData />)}
          </div>
        </div>
      )}
      {novo && <EditorRefeicao onFechar={() => setNovo(false)} />}
    </div>
  )
}

function ItemRefeicao({ r, mostrarData }: { r: import('../types').Refeicao; mostrarData?: boolean }) {
  const url = useAnexoUrl(r.fotoId)
  const t = TIPOS_REF.find((x) => x.v === r.tipo)
  return (
    <div className="flex items-center gap-3 py-2">
      {url ? <img src={url} alt="" className="size-10 shrink-0 rounded-lg object-cover" /> : <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-hover text-[17px]">{t?.icone}</span>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-medium">{r.descricao || t?.r}</div>
        <div className="text-[11px] text-muted">{mostrarData ? `${format(parseISO(r.data), 'dd/MM')} · ` : ''}{r.hora ? `${r.hora} · ` : ''}{t?.r}{r.calorias != null ? ` · ${r.calorias} kcal` : ''}</div>
      </div>
      <BotaoExcluir onClick={() => excluirRefeicao(r.id)} />
    </div>
  )
}

function EditorRefeicao({ onFechar }: { onFechar: () => void }) {
  const [tipo, setTipo] = useState<TipoRefeicao>('almoco')
  const [descricao, setDescricao] = useState('')
  const [data, setData] = useState(hojeISO())
  const [hora, setHora] = useState('')
  const [cal, setCal] = useState('')
  const [prot, setProt] = useState('')
  const [carb, setCarb] = useState('')
  const [gord, setGord] = useState('')
  const [fotoId, setFotoId] = useState<string>()
  const url = useAnexoUrl(fotoId)
  async function anexar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setFotoId(await salvarAnexo(f))
  }
  async function salvar() {
    await criarRefeicao({ tipo, descricao, data, hora: hora || undefined, fotoId, calorias: num(cal), proteinaG: num(prot), carboidratoG: num(carb), gorduraG: num(gord) })
    onFechar()
  }
  return (
    <FolhaInferior titulo="Nova refeição" onFechar={onFechar}>
      <div className="flex flex-wrap gap-1.5">
        {TIPOS_REF.map((t) => (
          <button key={t.v} onClick={() => setTipo(t.v)} className={`rounded-full border px-2.5 py-1 text-[13px] ${tipo === t.v ? 'border-ink bg-ink text-surface' : 'border-line text-muted'}`}>{t.icone} {t.r}</button>
        ))}
      </div>
      <Campo rotulo="Descrição"><input value={descricao} onChange={(e) => setDescricao(e.target.value)} className={CAMPO} placeholder="Ex.: Frango, arroz e salada" /></Campo>
      <div className="flex gap-3">
        <Campo rotulo="Data"><input type="date" value={data} onChange={(e) => setData(e.target.value)} className={CAMPO} /></Campo>
        <Campo rotulo="Hora"><input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={CAMPO} /></Campo>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Campo rotulo="kcal"><input inputMode="decimal" value={cal} onChange={(e) => setCal(e.target.value)} className={CAMPO} /></Campo>
        <Campo rotulo="Prot (g)"><input inputMode="decimal" value={prot} onChange={(e) => setProt(e.target.value)} className={CAMPO} /></Campo>
        <Campo rotulo="Carb (g)"><input inputMode="decimal" value={carb} onChange={(e) => setCarb(e.target.value)} className={CAMPO} /></Campo>
        <Campo rotulo="Gord (g)"><input inputMode="decimal" value={gord} onChange={(e) => setGord(e.target.value)} className={CAMPO} /></Campo>
      </div>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line p-3 text-[13px] text-muted">
        {url ? <img src={url} alt="" className="size-14 rounded-lg object-cover" /> : <span className="text-[20px]">📷</span>}
        <span>{fotoId ? 'Trocar foto do prato' : 'Anexar foto do prato'}</span>
        <input type="file" accept="image/*" onChange={anexar} className="hidden" />
      </label>
      <p className="text-[11px] leading-snug text-muted">Reconhecimento automático de alimentos por foto (IA) chega numa próxima versão — veja SAUDE-INTEGRACOES.md.</p>
      <button onClick={salvar} className={BTNSALVAR}>Salvar</button>
    </FolhaInferior>
  )
}

/* ================================ EXAMES ================================= */

export function AbaExames() {
  const exames = useExames() ?? []
  const [novo, setNovo] = useState(false)
  const [marcadorAberto, setMarcadorAberto] = useState<string | null>(null)
  const porMarcador = useMemo(() => {
    const map = new Map<string, typeof exames>()
    for (const e of exames) {
      const k = e.marcador ?? e.nome
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(e)
    }
    return [...map.entries()].map(([k, lista]) => ({ marcador: k, lista: [...lista].sort((a, b) => (a.data < b.data ? 1 : -1)) }))
      .sort((a, b) => (a.lista[0].data < b.lista[0].data ? 1 : -1))
  }, [exames])

  return (
    <div className="flex flex-col gap-3">
      {porMarcador.length === 0 && <p className="text-[13px] text-muted">Nenhum exame registrado.</p>}
      {porMarcador.map(({ marcador, lista }) => {
        const ult = lista[0]
        const aberto = marcadorAberto === marcador
        const serie = [...lista].reverse()
        return (
          <div key={marcador} className="rounded-2xl border border-line">
            <button onClick={() => setMarcadorAberto(aberto ? null : marcador)} className="flex w-full items-center gap-3 p-3 text-left">
              <span className="text-[17px]">🧪</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold">{marcador}</div>
                <div className="text-[12px] text-muted">{format(parseISO(ult.data), 'dd/MM/yyyy')}{ult.valorNum != null ? ` · ${ult.valorNum} ${ult.unidade ?? ''}` : ult.valorTexto ? ` · ${ult.valorTexto}` : ''}</div>
              </div>
              {ult.status && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `color-mix(in srgb, ${CorStatus[ult.status]} 16%, transparent)`, color: CorStatus[ult.status] }}>{RotStatus[ult.status]}</span>}
              <span className="text-muted">{aberto ? '▾' : '▸'}</span>
            </button>
            {aberto && (
              <div className="border-t border-line p-3">
                {serie.filter((e) => e.valorNum != null).length >= 2 && (
                  <GraficoLinha
                    pontos={serie.map((e) => e.valorNum ?? null)}
                    rotulos={serie.map((e) => format(parseISO(e.data), 'MMM/yy', { locale: ptBR }))}
                    faixa={ult.refMin != null && ult.refMax != null ? [ult.refMin, ult.refMax] : undefined}
                    cor="#4d9bd6"
                  />
                )}
                <ul className="mt-2 flex flex-col divide-y divide-line/60">
                  {lista.map((e) => (
                    <li key={e.id} className="flex items-center gap-2 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium">{e.valorNum != null ? `${e.valorNum} ${e.unidade ?? ''}` : e.valorTexto ?? '—'}</div>
                        <div className="text-[11px] text-muted">{format(parseISO(e.data), 'dd/MM/yyyy')}{e.refMin != null || e.refMax != null ? ` · ref ${e.refMin ?? ''}–${e.refMax ?? ''}` : ''}</div>
                      </div>
                      {e.arquivoId && <LinkAnexo id={e.arquivoId} />}
                      <BotaoExcluir onClick={() => excluirExame(e.id)} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )
      })}
      <button onClick={() => setNovo(true)} className={BTNADD}><IconMais width={15} height={15} /> Registrar exame</button>
      {novo && <EditorExame onFechar={() => setNovo(false)} />}
    </div>
  )
}

function LinkAnexo({ id }: { id: string }) {
  const url = useAnexoUrl(id)
  if (!url) return null
  return <a href={url} target="_blank" rel="noreferrer" className="shrink-0 text-[12px] font-medium text-accent">📎 arquivo</a>
}

function EditorExame({ onFechar }: { onFechar: () => void }) {
  const [nome, setNome] = useState('')
  const [data, setData] = useState(hojeISO())
  const [valor, setValor] = useState('')
  const [unidade, setUnidade] = useState('')
  const [refMin, setRefMin] = useState('')
  const [refMax, setRefMax] = useState('')
  const [arquivoId, setArquivoId] = useState<string>()
  async function anexar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setArquivoId(await salvarAnexo(f))
  }
  async function salvar() {
    const v = num(valor)
    await criarExame({ nome, marcador: nome.trim(), data, valorNum: v, valorTexto: v == null && valor.trim() ? valor.trim() : undefined, unidade: unidade || undefined, refMin: num(refMin), refMax: num(refMax), arquivoId, status: statusPorReferencia(v, num(refMin), num(refMax)) })
    onFechar()
  }
  return (
    <FolhaInferior titulo="Novo exame" onFechar={onFechar}>
      <Campo rotulo="Exame / marcador"><input value={nome} onChange={(e) => setNome(e.target.value)} className={CAMPO} placeholder="Ex.: Colesterol total, Vitamina D" /></Campo>
      <div className="flex gap-3">
        <Campo rotulo="Data"><input type="date" value={data} onChange={(e) => setData(e.target.value)} className={CAMPO} /></Campo>
        <Campo rotulo="Valor"><input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} className={CAMPO} /></Campo>
        <Campo rotulo="Unidade"><input value={unidade} onChange={(e) => setUnidade(e.target.value)} className={CAMPO} placeholder="mg/dL" /></Campo>
      </div>
      <div className="flex gap-3">
        <Campo rotulo="Ref. mín"><input inputMode="decimal" value={refMin} onChange={(e) => setRefMin(e.target.value)} className={CAMPO} /></Campo>
        <Campo rotulo="Ref. máx"><input inputMode="decimal" value={refMax} onChange={(e) => setRefMax(e.target.value)} className={CAMPO} /></Campo>
      </div>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line p-3 text-[13px] text-muted">
        <span className="text-[18px]">📎</span>
        <span>{arquivoId ? 'Arquivo anexado ✓' : 'Anexar PDF / imagem do exame'}</span>
        <input type="file" accept="application/pdf,image/*" onChange={anexar} className="hidden" />
      </label>
      <p className="text-[11px] leading-snug text-muted">Leitura automática do PDF (OCR) chega numa próxima versão — veja SAUDE-INTEGRACOES.md.</p>
      <button onClick={salvar} className={BTNSALVAR}>Salvar</button>
    </FolhaInferior>
  )
}

/* =============================== CONSULTAS =============================== */

export function AbaConsultas() {
  const consultas = useConsultas() ?? []
  const profissionais = useProfissionais() ?? []
  const [novaConsulta, setNovaConsulta] = useState(false)
  const [novoProf, setNovoProf] = useState(false)
  const [editarProf, setEditarProf] = useState<import('../types').Profissional | null>(null)
  const hoje = hojeISO()
  const agendadas = consultas.filter((c) => c.status === 'agendada').sort((a, b) => (a.data < b.data ? -1 : 1))
  const passadas = consultas.filter((c) => c.status !== 'agendada').sort((a, b) => (a.data < b.data ? 1 : -1))
  const nomeProf = (id?: string) => profissionais.find((p) => p.id === id)?.nome

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className={ROTULO}>Próximas</span>
        {agendadas.length === 0 && <p className="text-[13px] text-muted">Nenhuma consulta agendada.</p>}
        {agendadas.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-hover text-[17px]">🩺</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-semibold">{c.titulo ?? c.especialidade ?? 'Consulta'}</div>
              <div className="text-[12px] text-muted">{format(parseISO(c.data), "EEE, d MMM", { locale: ptBR })}{c.hora ? ` · ${c.hora}` : ''}{nomeProf(c.profissionalId) ? ` · ${nomeProf(c.profissionalId)}` : ''}{c.local ? ` · ${c.local}` : ''}</div>
            </div>
            {c.data >= hoje && <button onClick={() => atualizarConsulta(c.id, { status: 'realizada' })} className="rounded-full bg-hover px-2 py-1 text-[11px] font-medium text-muted hover:text-ink">Concluir</button>}
            <BotaoExcluir onClick={() => excluirConsulta(c.id)} />
          </div>
        ))}
        <button onClick={() => setNovaConsulta(true)} className={BTNADD}><IconMais width={15} height={15} /> Agendar consulta</button>
      </div>

      {passadas.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className={ROTULO}>Histórico</span>
          {passadas.map((c) => (
            <div key={c.id} className="rounded-2xl border border-line p-3">
              <div className="flex items-center gap-2">
                <span className="text-[15px]">🩺</span>
                <span className="flex-1 text-[13.5px] font-medium">{c.titulo ?? c.especialidade}</span>
                <span className="text-[11px] text-muted">{format(parseISO(c.data), 'dd/MM/yyyy')}</span>
                <BotaoExcluir onClick={() => excluirConsulta(c.id)} />
              </div>
              {c.recomendacoes && <p className="mt-1 pl-6 text-[12px] text-muted">{c.recomendacoes}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className={ROTULO}>Profissionais</span>
        {profissionais.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-hover text-[15px]">👩‍⚕️</span>
            <button onClick={() => setEditarProf(p)} className="min-w-0 flex-1 text-left">
              <div className="truncate text-[13.5px] font-medium">{p.nome}</div>
              <div className="text-[11px] text-muted">{[p.especialidade, p.clinica, p.telefone].filter(Boolean).join(' · ')}</div>
            </button>
            <button onClick={() => setEditarProf(p)} aria-label="Editar" className="shrink-0 text-muted hover:text-ink"><IconLapis width={15} height={15} /></button>
            <BotaoExcluir onClick={() => { if (confirm(`Excluir ${p.nome}?`)) excluirProfissional(p.id) }} />
          </div>
        ))}
        <button onClick={() => setNovoProf(true)} className={BTNADD}><IconMais width={15} height={15} /> Adicionar profissional</button>
      </div>

      {novaConsulta && <EditorConsulta profissionais={profissionais} onFechar={() => setNovaConsulta(false)} />}
      {novoProf && <EditorProfissional onFechar={() => setNovoProf(false)} />}
      {editarProf && <EditorProfissional prof={editarProf} onFechar={() => setEditarProf(null)} />}
    </div>
  )
}

function EditorProfissional({ prof, onFechar }: { prof?: import('../types').Profissional; onFechar: () => void }) {
  const editando = !!prof
  const [nome, setNome] = useState(prof?.nome ?? '')
  const [esp, setEsp] = useState(prof?.especialidade ?? '')
  const [clinica, setClinica] = useState(prof?.clinica ?? '')
  const [tel, setTel] = useState(prof?.telefone ?? '')
  async function salvar() {
    if (!nome.trim()) return
    const dados = { nome: nome.trim(), especialidade: esp || undefined, clinica: clinica || undefined, telefone: tel || undefined }
    if (editando && prof) await atualizarProfissional(prof.id, dados)
    else await criarProfissional(dados)
    onFechar()
  }
  async function apagar() {
    if (!prof) return
    if (!confirm(`Excluir ${prof.nome}?`)) return
    await excluirProfissional(prof.id)
    onFechar()
  }
  return (
    <FolhaInferior titulo={editando ? 'Editar profissional' : 'Novo profissional'} onFechar={onFechar}>
      <Campo rotulo="Nome"><input value={nome} onChange={(e) => setNome(e.target.value)} className={CAMPO} /></Campo>
      <Campo rotulo="Especialidade"><input value={esp} onChange={(e) => setEsp(e.target.value)} className={CAMPO} placeholder="Cardiologista…" /></Campo>
      <div className="flex gap-3">
        <Campo rotulo="Clínica"><input value={clinica} onChange={(e) => setClinica(e.target.value)} className={CAMPO} /></Campo>
        <Campo rotulo="Telefone"><input value={tel} onChange={(e) => setTel(e.target.value)} className={CAMPO} /></Campo>
      </div>
      <button onClick={salvar} className={BTNSALVAR}>Salvar</button>
      {editando && <button onClick={apagar} className="min-h-10 rounded-xl text-[13px] font-medium text-danger hover:bg-danger/10">Excluir profissional</button>}
    </FolhaInferior>
  )
}

function EditorConsulta({ profissionais, onFechar }: { profissionais: import('../types').Profissional[]; onFechar: () => void }) {
  const [titulo, setTitulo] = useState('')
  const [profId, setProfId] = useState('')
  const [data, setData] = useState(hojeISO())
  const [hora, setHora] = useState('09:00')
  const [local, setLocal] = useState('')
  const [custo, setCusto] = useState('')
  const [naAgenda, setNaAgenda] = useState(true)
  async function salvar() {
    const custoCentavos = custo.trim() ? Math.round((num(custo) ?? 0) * 100) : undefined
    const prof = profissionais.find((p) => p.id === profId)
    let eventoId: string | undefined
    if (naAgenda) {
      const [h, m] = hora.split(':').map(Number)
      const fim = `${String(Math.min(23, h + 1)).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`
      eventoId = await criarEvento({ titulo: titulo || prof?.especialidade || 'Consulta', data, inicio: hora, fim, categoria: 'saude', cor: '#eb8909', local: local || undefined, custoCentavos })
    }
    const id = await criarConsulta({ titulo: titulo || undefined, profissionalId: profId || undefined, especialidade: prof?.especialidade, data, hora, local: local || undefined, status: 'agendada', custoCentavos })
    if (eventoId) await atualizarConsulta(id, { eventoId })
    onFechar()
  }
  return (
    <FolhaInferior titulo="Agendar consulta" onFechar={onFechar}>
      <Campo rotulo="Motivo / título"><input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={CAMPO} placeholder="Ex.: Avaliação física" /></Campo>
      <Campo rotulo="Profissional">
        <select value={profId} onChange={(e) => setProfId(e.target.value)} className={CAMPO}>
          <option value="">—</option>
          {profissionais.map((p) => <option key={p.id} value={p.id}>{p.nome}{p.especialidade ? ` (${p.especialidade})` : ''}</option>)}
        </select>
      </Campo>
      <div className="flex gap-3">
        <Campo rotulo="Data"><input type="date" value={data} onChange={(e) => setData(e.target.value)} className={CAMPO} /></Campo>
        <Campo rotulo="Hora"><input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={CAMPO} /></Campo>
      </div>
      <div className="flex gap-3">
        <Campo rotulo="Local"><input value={local} onChange={(e) => setLocal(e.target.value)} className={CAMPO} /></Campo>
        <Campo rotulo="Custo (R$)"><input inputMode="decimal" value={custo} onChange={(e) => setCusto(e.target.value)} className={CAMPO} /></Campo>
      </div>
      <label className="flex items-center gap-2 text-[13px] text-muted">
        <input type="checkbox" checked={naAgenda} onChange={(e) => setNaAgenda(e.target.checked)} /> Adicionar à Agenda (e reservar o custo no orçamento)
      </label>
      <button onClick={salvar} className={BTNSALVAR}>Salvar</button>
    </FolhaInferior>
  )
}

/* ============================= MEDICAMENTOS ============================= */

export function AbaMedicamentos() {
  const meds = useMedicamentos() ?? []
  const tomadas = useMedicamentoTomadas() ?? []
  const [novo, setNovo] = useState(false)
  const hoje = hojeISO()
  const tomouSet = new Set(tomadas.filter((t) => t.data === hoje).map((t) => `${t.medicamentoId}:${t.hora}`))
  return (
    <div className="flex flex-col gap-3">
      {meds.length === 0 && <p className="text-[13px] text-muted">Nenhum medicamento cadastrado.</p>}
      {meds.map((m) => {
        const baixo = m.estoque != null && m.estoqueAlerta != null && m.estoque <= m.estoqueAlerta
        return (
          <div key={m.id} className="rounded-2xl border border-line p-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full text-[18px]" style={{ backgroundColor: `color-mix(in srgb, ${m.cor ?? '#6a86b8'} 16%, transparent)` }}>💊</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold">{m.nome}</div>
                <div className="text-[12px] text-muted">{[m.dosagem, m.frequencia].filter(Boolean).join(' · ')}{m.estoque != null ? ` · estoque ${m.estoque}` : ''}</div>
              </div>
              <BotaoExcluir onClick={() => excluirMedicamento(m.id)} />
            </div>
            {baixo && <div className="mt-2 rounded-lg bg-danger/10 px-2 py-1 text-[11px] font-medium text-danger">⚠️ Estoque baixo — hora de repor.</div>}
            {(m.horarios?.length ?? 0) > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {m.horarios!.map((h) => {
                  const tomado = tomouSet.has(`${m.id}:${h}`)
                  return (
                    <button key={h} onClick={() => alternarTomada(m.id, hoje, h)} className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors ${tomado ? 'bg-green-500/15 text-green-600' : 'bg-hover text-muted hover:text-ink'}`}>{tomado ? '✓' : '🕐'} {h}</button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
      <button onClick={() => setNovo(true)} className={BTNADD}><IconMais width={15} height={15} /> Adicionar medicamento</button>
      {novo && <EditorMedicamento onFechar={() => setNovo(false)} />}
    </div>
  )
}

function EditorMedicamento({ onFechar }: { onFechar: () => void }) {
  const [nome, setNome] = useState('')
  const [dosagem, setDosagem] = useState('')
  const [horarios, setHorarios] = useState('08:00')
  const [freq, setFreq] = useState('Diário')
  const [estoque, setEstoque] = useState('')
  async function salvar() {
    await criarMedicamento({ nome, dosagem: dosagem || undefined, horarios: horarios.split(',').map((h) => h.trim()).filter(Boolean), frequencia: freq || undefined, estoque: num(estoque), estoqueAlerta: 7 })
    onFechar()
  }
  return (
    <FolhaInferior titulo="Novo medicamento" onFechar={onFechar}>
      <Campo rotulo="Nome"><input value={nome} onChange={(e) => setNome(e.target.value)} className={CAMPO} /></Campo>
      <div className="flex gap-3">
        <Campo rotulo="Dosagem"><input value={dosagem} onChange={(e) => setDosagem(e.target.value)} className={CAMPO} placeholder="1 cápsula, 200 mg…" /></Campo>
        <Campo rotulo="Frequência"><input value={freq} onChange={(e) => setFreq(e.target.value)} className={CAMPO} /></Campo>
      </div>
      <div className="flex gap-3">
        <Campo rotulo="Horários (HH:mm, vírgula)"><input value={horarios} onChange={(e) => setHorarios(e.target.value)} className={CAMPO} placeholder="08:00, 20:00" /></Campo>
        <Campo rotulo="Estoque"><input inputMode="decimal" value={estoque} onChange={(e) => setEstoque(e.target.value)} className={CAMPO} /></Campo>
      </div>
      <button onClick={salvar} className={BTNSALVAR}>Salvar</button>
    </FolhaInferior>
  )
}

/* ================================ VACINAS ================================ */

export function AbaVacinas() {
  const vacinas = useVacinas() ?? []
  const [novo, setNovo] = useState(false)
  const ordenadas = [...vacinas].sort((a, b) => ((a.data ?? a.proximaDose ?? '') < (b.data ?? b.proximaDose ?? '') ? 1 : -1))
  return (
    <div className="flex flex-col gap-3">
      {ordenadas.length === 0 && <p className="text-[13px] text-muted">Nenhuma vacina registrada.</p>}
      {ordenadas.map((v) => (
        <div key={v.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-hover text-[17px]">💉</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-semibold">{v.nome}</div>
            <div className="text-[12px] text-muted">{v.data ? `Aplicada em ${format(parseISO(v.data), 'dd/MM/yyyy')}` : ''}{v.dose ? ` · ${v.dose}` : ''}{v.proximaDose ? ` · próxima ${format(parseISO(v.proximaDose), 'dd/MM/yyyy')}` : ''}{v.lote ? ` · lote ${v.lote}` : ''}</div>
          </div>
          <BotaoExcluir onClick={() => excluirVacina(v.id)} />
        </div>
      ))}
      <button onClick={() => setNovo(true)} className={BTNADD}><IconMais width={15} height={15} /> Adicionar vacina</button>
      {novo && <EditorVacina onFechar={() => setNovo(false)} />}
    </div>
  )
}

function EditorVacina({ onFechar }: { onFechar: () => void }) {
  const [nome, setNome] = useState('')
  const [data, setData] = useState('')
  const [dose, setDose] = useState('')
  const [prox, setProx] = useState('')
  const [lote, setLote] = useState('')
  async function salvar() { await criarVacina({ nome, data: data || undefined, dose: dose || undefined, proximaDose: prox || undefined, lote: lote || undefined }); onFechar() }
  return (
    <FolhaInferior titulo="Nova vacina" onFechar={onFechar}>
      <Campo rotulo="Nome"><input value={nome} onChange={(e) => setNome(e.target.value)} className={CAMPO} placeholder="Influenza, Hepatite B…" /></Campo>
      <div className="flex gap-3">
        <Campo rotulo="Aplicada em"><input type="date" value={data} onChange={(e) => setData(e.target.value)} className={CAMPO} /></Campo>
        <Campo rotulo="Dose"><input value={dose} onChange={(e) => setDose(e.target.value)} className={CAMPO} placeholder="1ª, 2ª, Anual…" /></Campo>
      </div>
      <div className="flex gap-3">
        <Campo rotulo="Próxima dose"><input type="date" value={prox} onChange={(e) => setProx(e.target.value)} className={CAMPO} /></Campo>
        <Campo rotulo="Lote"><input value={lote} onChange={(e) => setLote(e.target.value)} className={CAMPO} /></Campo>
      </div>
      <button onClick={salvar} className={BTNSALVAR}>Salvar</button>
    </FolhaInferior>
  )
}

/* ================================ DOAÇÃO ================================= */

export function AbaDoacao() {
  const doacoes = useDoacoes() ?? []
  const config = useSaudeConfig()
  const [novo, setNovo] = useState(false)
  const ordenadas = [...doacoes].sort((a, b) => (a.data < b.data ? 1 : -1))
  const ultima = ordenadas[0]
  return (
    <div className="flex flex-col gap-3">
      <div className={CARTAO}>
        <div className="flex items-center gap-3">
          <span className="text-[22px]">🩸</span>
          <div className="flex-1">
            <div className="text-[13px] text-muted">Tipo sanguíneo</div>
            <div className="text-[18px] font-bold">{config?.tipoSanguineo ?? '—'}</div>
          </div>
          {ultima && (
            <div className="text-right">
              <div className="text-[11px] text-muted">Próxima possível</div>
              <div className="text-[15px] font-bold text-accent">{format(parseISO(proximaDoacao(ultima.data)), 'dd/MM/yyyy')}</div>
            </div>
          )}
        </div>
      </div>
      {ordenadas.length === 0 && <p className="text-[13px] text-muted">Nenhuma doação registrada.</p>}
      {ordenadas.map((d) => (
        <div key={d.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-hover text-[15px]">🩸</span>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-medium">{format(parseISO(d.data), 'dd/MM/yyyy')}</div>
            <div className="text-[11px] text-muted">{d.local}</div>
          </div>
          <BotaoExcluir onClick={() => excluirDoacao(d.id)} />
        </div>
      ))}
      <button onClick={() => setNovo(true)} className={BTNADD}><IconMais width={15} height={15} /> Registrar doação</button>
      {novo && <EditorDoacao onFechar={() => setNovo(false)} />}
    </div>
  )
}

function EditorDoacao({ onFechar }: { onFechar: () => void }) {
  const [data, setData] = useState(hojeISO())
  const [local, setLocal] = useState('')
  async function salvar() { await criarDoacao({ data, local: local || undefined }); onFechar() }
  return (
    <FolhaInferior titulo="Nova doação" onFechar={onFechar}>
      <div className="flex gap-3">
        <Campo rotulo="Data"><input type="date" value={data} onChange={(e) => setData(e.target.value)} className={CAMPO} /></Campo>
        <Campo rotulo="Local"><input value={local} onChange={(e) => setLocal(e.target.value)} className={CAMPO} placeholder="Hemocentro…" /></Campo>
      </div>
      <button onClick={salvar} className={BTNSALVAR}>Salvar</button>
    </FolhaInferior>
  )
}

/* ================================ MEDIDAS ================================ */

export function AbaMedidas() {
  const medidas = useMedidas() ?? []
  const config = useSaudeConfig()
  const [novo, setNovo] = useState<TipoMedida | null>(null)
  const peso = ultimaMedida(medidas, 'peso')
  const imc = calcularIMC(peso?.valor, config?.alturaCm ?? ultimaMedida(medidas, 'altura')?.valor)
  return (
    <div className="flex flex-col gap-3">
      {imc != null && (
        <div className={CARTAO}>
          <div className="flex items-center gap-3">
            <span className="text-[22px]">⚖️</span>
            <div className="flex-1"><div className="text-[13px] text-muted">IMC atual</div><div className="text-[20px] font-bold">{imc.toFixed(1)}</div></div>
            <span className="rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ backgroundColor: `color-mix(in srgb, ${imc >= 25 ? '#eb8909' : '#299438'} 16%, transparent)`, color: imc >= 25 ? '#eb8909' : '#299438' }}>{classificacaoIMC(imc)}</span>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MEDIDAS.map((def) => {
          const serie = medidas.filter((m) => m.tipo === def.tipo).sort((a, b) => (a.data < b.data ? -1 : 1))
          const ult = serie[serie.length - 1]
          const ant = serie[serie.length - 2]
          const delta = ult && ant ? ult.valor - ant.valor : undefined
          return (
            <button key={def.tipo} onClick={() => setNovo(def.tipo)} className="rounded-2xl border border-line p-3 text-left hover:border-muted/40">
              <div className="text-[11px] text-muted">{def.icone} {def.nome}</div>
              <div className="text-[17px] font-bold">{ult ? formatarMedida(def.tipo, ult.valor) : '—'}</div>
              {delta != null && delta !== 0 && <div className={`text-[11px] font-medium ${delta < 0 ? 'text-accent' : 'text-muted'}`}>{delta > 0 ? '+' : ''}{delta.toFixed(1)}</div>}
            </button>
          )
        })}
      </div>
      {novo && <EditorMedida tipo={novo} onFechar={() => setNovo(null)} />}
    </div>
  )
}

function EditorMedida({ tipo, onFechar }: { tipo: TipoMedida; onFechar: () => void }) {
  const def = DEF_MEDIDA.get(tipo)!
  const [data, setData] = useState(hojeISO())
  const [valor, setValor] = useState('')
  const medidas = useMedidas() ?? []
  const serie = medidas.filter((m) => m.tipo === tipo).sort((a, b) => (a.data < b.data ? 1 : -1))
  async function salvar() { const v = num(valor); if (v != null) { await salvarMedida(tipo, data, v); setValor('') } }
  return (
    <FolhaInferior titulo={`${def.icone} ${def.nome}`} onFechar={onFechar}>
      <div className="flex gap-3">
        <Campo rotulo="Data"><input type="date" value={data} onChange={(e) => setData(e.target.value)} className={CAMPO} /></Campo>
        <Campo rotulo={`Valor (${def.unidade})`}><input autoFocus inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} className={CAMPO} /></Campo>
      </div>
      <button onClick={salvar} className={BTNSALVAR}>Salvar</button>
      {serie.length > 0 && (
        <div className="mt-1">
          <span className={ROTULO}>Registros ({serie.length})</span>
          <ul className="mt-1.5 divide-y divide-line">
            {serie.map((m) => (
              <li key={m.id} className="flex items-center gap-2 py-1.5 text-[13px]">
                <span className="w-20 tabular-nums text-muted">{format(parseISO(m.data), 'dd/MM/yy')}</span>
                <span className="flex-1 font-medium">{formatarMedida(tipo, m.valor)}</span>
                <BotaoExcluir onClick={() => excluirMedida(m.id)} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </FolhaInferior>
  )
}

/* ============================= LINHA DO TEMPO ============================ */

export function AbaLinhaTempo() {
  const consultas = useConsultas() ?? []
  const exames = useExames() ?? []
  const vacinas = useVacinas() ?? []
  const doacoes = useDoacoes() ?? []
  const atividades = useAtividades() ?? []
  const medidas = useMedidas() ?? []
  const eventos = useMemo(() => linhaDoTempo({ consultas, exames, vacinas, doacoes, atividades, medidas }), [consultas, exames, vacinas, doacoes, atividades, medidas])
  return (
    <div className="flex flex-col gap-1">
      {eventos.length === 0 && <p className="text-[13px] text-muted">Seu prontuário aparecerá aqui conforme você registra consultas, exames, vacinas e doações.</p>}
      {eventos.map((e) => (
        <div key={e.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-[14px]">{e.icone}</span>
            <span className="w-px flex-1 bg-line" />
          </div>
          <div className="pb-4">
            <div className="text-[11px] text-muted">{format(parseISO(e.data), "d 'de' MMM 'de' yyyy", { locale: ptBR })}</div>
            <div className="text-[14px] font-medium">{e.titulo}</div>
            {e.detalhe && <div className="text-[12px] text-muted">{e.detalhe}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ================================ AJUSTES ================================ */

export function AjustesSaude({ onFechar }: { onFechar: () => void }) {
  const config = useSaudeConfig()
  return (
    <FolhaInferior titulo="Ajustes de Saúde" onFechar={onFechar}>
      <Campo rotulo="Tipo sanguíneo">
        <select value={config?.tipoSanguineo ?? ''} onChange={(e) => salvarSaudeConfig({ tipoSanguineo: e.target.value || undefined })} className={CAMPO}>
          <option value="">—</option>
          {['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Campo>
      <div className="flex gap-3">
        <Campo rotulo="Altura (cm)"><input inputMode="decimal" defaultValue={config?.alturaCm ?? ''} onBlur={(e) => salvarSaudeConfig({ alturaCm: num(e.target.value) })} className={CAMPO} /></Campo>
        <Campo rotulo="Meta de peso (kg)"><input inputMode="decimal" defaultValue={config?.metaPesoKg ?? ''} onBlur={(e) => salvarSaudeConfig({ metaPesoKg: num(e.target.value) })} className={CAMPO} /></Campo>
      </div>
      <div className="flex gap-3">
        <Campo rotulo="Meta de passos"><input inputMode="decimal" defaultValue={config?.metaPassos ?? ''} onBlur={(e) => salvarSaudeConfig({ metaPassos: num(e.target.value) })} className={CAMPO} /></Campo>
        <Campo rotulo="Meta de sono (h)"><input inputMode="decimal" defaultValue={config?.metaSonoMin ? config.metaSonoMin / 60 : ''} onBlur={(e) => { const v = num(e.target.value); salvarSaudeConfig({ metaSonoMin: v != null ? Math.round(v * 60) : undefined }) }} className={CAMPO} /></Campo>
        <Campo rotulo="Meta de água (L)"><input inputMode="decimal" defaultValue={config?.metaAguaMl ? config.metaAguaMl / 1000 : ''} onBlur={(e) => { const v = num(e.target.value); salvarSaudeConfig({ metaAguaMl: v != null ? Math.round(v * 1000) : undefined }) }} className={CAMPO} /></Campo>
      </div>
      <BarraMeta frac={0} cor="transparent" />
      <button onClick={onFechar} className={BTNSALVAR}>Concluir</button>
    </FolhaInferior>
  )
}
