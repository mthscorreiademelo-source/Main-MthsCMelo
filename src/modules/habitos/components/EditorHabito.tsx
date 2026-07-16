import { useState } from 'react'
import { nanoid } from 'nanoid'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { IconCheck, IconFechar, IconLixeira, IconMais, IconSino } from '../../../core/components/Icons'
import { CHAVES_ICONE, IconeFator } from '../../../core/components/icones'
import {
  atualizarHabito,
  criarHabito,
  excluirHabito,
  PALETA,
  tipoInfo,
  TIPOS,
} from '../db'
import { NOMES_DIA } from '../freq'
import { FONTES, fonteDe } from '../integracoes'
import { estadoNotificacoes, pedirPermissaoNotificacoes, type EstadoNotif } from '../lembretes'
import type {
  CategoriaHabito,
  Frequencia,
  Habito,
  ItemChecklist,
  TipoFrequencia,
  TipoHabito,
} from '../types'

const CAMPO =
  'min-h-10 w-full rounded-lg border border-line bg-surface px-3 text-[15px] outline-none focus:border-muted/60'
const ROTULO = 'text-[13px] font-medium text-muted'

const FREQS: { tipo: TipoFrequencia; rotulo: string }[] = [
  { tipo: 'diario', rotulo: 'Todo dia' },
  { tipo: 'dias_semana', rotulo: 'Dias da semana' },
  { tipo: 'alternado', rotulo: 'Dias alternados' },
  { tipo: 'semanal', rotulo: 'Vezes/semana' },
  { tipo: 'mensal', rotulo: 'Dias do mês' },
]

export function EditorHabito({
  habito,
  categorias,
  categoriaInicial,
  onFechar,
}: {
  habito: Habito | null
  categorias: CategoriaHabito[]
  categoriaInicial?: string
  onFechar: () => void
}) {
  const editando = !!habito
  const [nome, setNome] = useState(habito?.nome ?? '')
  const [descricao, setDescricao] = useState(habito?.descricao ?? '')
  const [tipo, setTipo] = useState<TipoHabito>(habito?.tipo ?? 'sim_nao')
  const [unidade, setUnidade] = useState(habito?.unidade ?? '')
  const [meta, setMeta] = useState(habito?.meta != null ? String(habito.meta) : '')
  const [passo, setPasso] = useState(habito?.passo != null ? String(habito.passo) : '')
  const [itens, setItens] = useState<ItemChecklist[]>(habito?.itens ?? [])
  const [categoriaId, setCategoriaId] = useState(habito?.categoriaId ?? categoriaInicial ?? '')
  const [cor, setCor] = useState(habito?.cor ?? PALETA[3])
  const [icone, setIcone] = useState(habito?.icone ?? 'folha')
  const horario = habito?.horario ?? ''
  const [prioridade, setPrioridade] = useState<number | undefined>(habito?.prioridade)
  const [fonteId, setFonteId] = useState(habito?.fonteId ?? '')
  const [lembretes, setLembretes] = useState<string[]>(
    habito?.lembretes ?? (habito?.horario ? [habito.horario] : []),
  )
  const [novoLembrete, setNovoLembrete] = useState('08:00')
  const [permNotif, setPermNotif] = useState<EstadoNotif>(estadoNotificacoes())
  const [erro, setErro] = useState<string | null>(null)

  const fonte = fonteDe(fonteId)

  const f0 = habito?.frequencia ?? { tipo: 'diario' as TipoFrequencia }
  const [freqTipo, setFreqTipo] = useState<TipoFrequencia>(f0.tipo)
  const [freqDias, setFreqDias] = useState<number[]>(f0.tipo === 'dias_semana' ? (f0.dias ?? []) : [])
  const [freqDiasMes, setFreqDiasMes] = useState<number[]>(f0.tipo === 'mensal' ? (f0.dias ?? []) : [])
  const [freqIntervalo, setFreqIntervalo] = useState(String(f0.intervalo ?? 2))
  const [freqVezes, setFreqVezes] = useState(String(f0.vezes ?? 3))

  const info = tipoInfo(tipo)
  const medido = info.medido

  function trocarTipo(t: TipoHabito) {
    setTipo(t)
    const nova = tipoInfo(t)
    if (nova.medido && !unidade) setUnidade(nova.unidade)
  }

  function trocarFonte(id: string) {
    setFonteId(id)
    const f = fonteDe(id)
    if (f) {
      setTipo(f.tipoSugerido)
      setUnidade(f.unidade)
      if (!habito) {
        setIcone(f.icone)
        setCor(f.cor)
      }
    }
  }

  function adicionarLembrete() {
    if (!/^\d{1,2}:\d{2}$/.test(novoLembrete)) return
    setLembretes((s) => (s.includes(novoLembrete) ? s : [...s, novoLembrete].sort()))
  }

  async function ativarNotificacoes() {
    setPermNotif(await pedirPermissaoNotificacoes())
  }

  function toggleDia(d: number) {
    setFreqDias((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]))
  }
  function toggleDiaMes(d: number) {
    setFreqDiasMes((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]))
  }

  function montarFrequencia(): Frequencia {
    switch (freqTipo) {
      case 'dias_semana':
        return { tipo: 'dias_semana', dias: freqDias.length ? freqDias : [1, 2, 3, 4, 5] }
      case 'alternado':
        return { tipo: 'alternado', intervalo: Math.max(1, Number(freqIntervalo) || 2) }
      case 'semanal':
        return { tipo: 'semanal', vezes: Math.max(1, Number(freqVezes) || 3) }
      case 'mensal':
        return { tipo: 'mensal', dias: freqDiasMes.length ? freqDiasMes : [1] }
      default:
        return { tipo: 'diario' }
    }
  }

  async function salvar() {
    if (!nome.trim()) {
      setErro('Dê um nome ao hábito.')
      return
    }
    const dados: Partial<Habito> & { nome: string } = {
      nome: nome.trim(),
      descricao: descricao.trim() || undefined,
      tipo,
      cor,
      icone,
      categoriaId: categoriaId || undefined,
      frequencia: montarFrequencia(),
      horario: lembretes[0] ?? (horario || undefined),
      lembretes: lembretes.length ? lembretes : undefined,
      fonteId: fonteId || undefined,
      prioridade,
      unidade: medido ? unidade.trim() || undefined : undefined,
      meta: medido ? Math.max(1, Number(meta) || 1) : undefined,
      passo: medido ? Math.max(1, Number(passo) || 1) : undefined,
      itens: tipo === 'checklist' && !fonteId ? itens.filter((i) => i.texto.trim()) : undefined,
    }
    if (editando && habito) await atualizarHabito(habito.id, dados)
    else await criarHabito(dados)
    onFechar()
  }

  async function excluir() {
    if (!habito) return
    if (!confirm('Excluir este hábito e todo o seu histórico?')) return
    await excluirHabito(habito.id)
    onFechar()
  }

  return (
    <FolhaInferior titulo={editando ? 'Editar hábito' : 'Novo hábito'} onFechar={onFechar}>
      <label className="flex flex-col gap-1">
        <span className={ROTULO}>Nome</span>
        <input className={CAMPO} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex.: Beber água" autoFocus />
      </label>

      <label className="flex flex-col gap-1">
        <span className={ROTULO}>Descrição (opcional)</span>
        <input className={CAMPO} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </label>

      {/* Cor + ícone */}
      <div className="flex flex-col gap-2">
        <span className={ROTULO}>Cor e ícone</span>
        <div className="flex flex-wrap gap-2">
          {PALETA.map((c) => (
            <button
              key={c}
              onClick={() => setCor(c)}
              aria-label={`Cor ${c}`}
              className={`size-7 cursor-pointer rounded-full transition-transform ${cor === c ? 'scale-110 ring-2 ring-ink ring-offset-2 ring-offset-bg' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {CHAVES_ICONE.map((chave) => {
            const ativo = icone === chave
            return (
              <button
                key={chave}
                onClick={() => setIcone(chave)}
                className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border transition-colors"
                style={{
                  borderColor: ativo ? cor : 'var(--vida-line)',
                  backgroundColor: ativo ? `${cor}18` : 'transparent',
                  color: ativo ? cor : 'var(--vida-muted)',
                }}
              >
                <IconeFator nome={chave} width={17} height={17} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Integração automática (preenche o valor a partir de outro módulo) */}
      <div className="flex flex-col gap-2">
        <span className={ROTULO}>Preenchimento automático</span>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => trocarFonte('')}
            className={`min-h-8 cursor-pointer rounded-full px-3 text-[13px] font-medium transition-colors ${!fonteId ? 'bg-ink text-surface' : 'bg-hover text-muted hover:text-ink'}`}
          >
            Manual
          </button>
          {FONTES.map((f) => (
            <button
              key={f.id}
              onClick={() => trocarFonte(f.id)}
              className="flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors"
              style={
                fonteId === f.id
                  ? { backgroundColor: f.cor, color: '#fff' }
                  : { backgroundColor: 'var(--vida-hover)', color: 'var(--vida-muted)' }
              }
            >
              <IconeFator nome={f.icone} width={14} height={14} />
              {f.rotulo}
            </button>
          ))}
        </div>
        {fonte && (
          <p className="text-[12px] text-muted">
            O valor do dia vem de <strong>{fonte.modulo}</strong> ({fonte.rotulo}). Defina só a meta
            diária abaixo — o progresso é preenchido sozinho.
          </p>
        )}
      </div>

      {/* Tipo de medição (oculto quando há integração — a fonte define o tipo) */}
      {!fonte && (
        <div className="flex flex-col gap-2">
          <span className={ROTULO}>Tipo</span>
          <div className="flex flex-wrap gap-1.5">
            {TIPOS.map((t) => (
              <button
                key={t.tipo}
                onClick={() => trocarTipo(t.tipo)}
                className={`min-h-8 cursor-pointer rounded-full px-3 text-[13px] font-medium transition-colors ${tipo === t.tipo ? 'bg-ink text-surface' : 'bg-hover text-muted hover:text-ink'}`}
              >
                {t.rotulo}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Campos do tipo medido */}
      {medido && (
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1">
            <span className={ROTULO}>Meta diária</span>
            <input className={CAMPO} type="number" min={1} value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="ex.: 8" />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className={ROTULO}>Unidade</span>
            <input className={CAMPO} value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="ex.: copos" />
          </label>
          <label className="flex w-20 flex-col gap-1">
            <span className={ROTULO}>Passo</span>
            <input className={CAMPO} type="number" min={1} value={passo} onChange={(e) => setPasso(e.target.value)} placeholder="1" />
          </label>
        </div>
      )}

      {/* Itens do checklist */}
      {tipo === 'checklist' && !fonte && (
        <div className="flex flex-col gap-2">
          <span className={ROTULO}>Itens</span>
          {itens.map((it, i) => (
            <div key={it.id} className="flex items-center gap-2">
              <input
                className={CAMPO}
                value={it.texto}
                onChange={(e) =>
                  setItens((s) => s.map((x) => (x.id === it.id ? { ...x, texto: e.target.value } : x)))
                }
                placeholder={`Item ${i + 1}`}
              />
              <button
                onClick={() => setItens((s) => s.filter((x) => x.id !== it.id))}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line text-muted hover:text-ink"
                aria-label="Remover item"
              >
                <IconLixeira width={15} height={15} />
              </button>
            </div>
          ))}
          <button
            onClick={() => setItens((s) => [...s, { id: nanoid(), texto: '' }])}
            className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-dashed border-line text-[13px] text-muted hover:text-ink"
          >
            <IconMais width={15} height={15} /> Adicionar item
          </button>
        </div>
      )}

      {/* Categoria */}
      <label className="flex flex-col gap-1">
        <span className={ROTULO}>Categoria</span>
        <select className={CAMPO} value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
          <option value="">Sem categoria</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </label>

      {/* Frequência */}
      <div className="flex flex-col gap-2">
        <span className={ROTULO}>Frequência</span>
        <div className="flex flex-wrap gap-1.5">
          {FREQS.map((fr) => (
            <button
              key={fr.tipo}
              onClick={() => setFreqTipo(fr.tipo)}
              className={`min-h-8 cursor-pointer rounded-full px-3 text-[13px] font-medium transition-colors ${freqTipo === fr.tipo ? 'bg-ink text-surface' : 'bg-hover text-muted hover:text-ink'}`}
            >
              {fr.rotulo}
            </button>
          ))}
        </div>
        {freqTipo === 'dias_semana' && (
          <div className="flex gap-1.5">
            {NOMES_DIA.map((d, i) => (
              <button
                key={i}
                onClick={() => toggleDia(i)}
                className={`flex size-9 cursor-pointer items-center justify-center rounded-full text-[12px] font-medium capitalize transition-colors ${freqDias.includes(i) ? 'bg-ink text-surface' : 'bg-hover text-muted'}`}
              >
                {d[0]}
              </button>
            ))}
          </div>
        )}
        {freqTipo === 'alternado' && (
          <label className="flex items-center gap-2 text-[14px] text-muted">
            A cada
            <input className={`${CAMPO} w-16`} type="number" min={1} value={freqIntervalo} onChange={(e) => setFreqIntervalo(e.target.value)} />
            dias
          </label>
        )}
        {freqTipo === 'semanal' && (
          <label className="flex items-center gap-2 text-[14px] text-muted">
            <input className={`${CAMPO} w-16`} type="number" min={1} max={7} value={freqVezes} onChange={(e) => setFreqVezes(e.target.value)} />
            vezes por semana
          </label>
        )}
        {freqTipo === 'mensal' && (
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <button
                key={d}
                onClick={() => toggleDiaMes(d)}
                className={`flex size-8 cursor-pointer items-center justify-center rounded-md text-[12px] transition-colors ${freqDiasMes.includes(d) ? 'bg-ink text-surface' : 'bg-hover text-muted'}`}
              >
                {d}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Prioridade */}
      <div className="flex flex-col gap-1">
        <span className={ROTULO}>Prioridade</span>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((p) => (
            <button
              key={p}
              onClick={() => setPrioridade((v) => (v === p ? undefined : p))}
              className={`min-h-10 flex-1 cursor-pointer rounded-lg border text-[13px] font-semibold transition-colors ${prioridade === p ? 'border-ink bg-ink text-surface' : 'border-line text-muted'}`}
            >
              P{p}
            </button>
          ))}
        </div>
      </div>

      {/* Lembretes */}
      <div className="flex flex-col gap-2">
        <span className={ROTULO}>Lembretes</span>
        {lembretes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {lembretes.map((hh) => (
              <span
                key={hh}
                className="flex items-center gap-1.5 rounded-full bg-hover px-3 py-1 text-[13px] font-medium text-ink"
              >
                <IconSino width={13} height={13} className="text-muted" />
                {hh}
                <button
                  onClick={() => setLembretes((s) => s.filter((x) => x !== hh))}
                  className="text-muted hover:text-ink"
                  aria-label={`Remover lembrete ${hh}`}
                >
                  <IconFechar width={13} height={13} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            className={`${CAMPO} w-32`}
            type="time"
            value={novoLembrete}
            onChange={(e) => setNovoLembrete(e.target.value)}
          />
          <button
            onClick={adicionarLembrete}
            className="flex min-h-10 items-center gap-1 rounded-lg border border-line px-3 text-[13px] font-medium text-muted transition-colors hover:text-ink"
          >
            <IconMais width={15} height={15} /> Adicionar
          </button>
        </div>
        {lembretes.length > 0 && permNotif !== 'granted' && (
          <div className="flex flex-col gap-1 rounded-lg bg-hover/60 px-3 py-2 text-[12px] text-muted">
            {permNotif === 'indisponivel' ? (
              <span>Este dispositivo não suporta notificações.</span>
            ) : permNotif === 'denied' ? (
              <span>Notificações bloqueadas — libere nas configurações do navegador.</span>
            ) : (
              <button
                onClick={ativarNotificacoes}
                className="self-start rounded-md bg-ink px-3 py-1.5 text-[12px] font-medium text-surface"
              >
                Ativar notificações
              </button>
            )}
            <span>Os avisos chegam enquanto o app está aberto (PWA local, sem servidor).</span>
          </div>
        )}
      </div>

      {erro && <p className="text-[13px] text-red-500">{erro}</p>}

      <button
        onClick={salvar}
        className="flex min-h-12 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-ink text-[15px] font-medium text-surface transition-opacity hover:opacity-90"
      >
        <IconCheck width={18} height={18} />
        {editando ? 'Salvar' : 'Criar hábito'}
      </button>

      {editando && (
        <button onClick={excluir} className="flex items-center justify-center gap-1.5 self-center text-[13px] text-red-500 hover:text-red-600">
          <IconLixeira width={15} height={15} /> Excluir hábito
        </button>
      )}
    </FolhaInferior>
  )
}
