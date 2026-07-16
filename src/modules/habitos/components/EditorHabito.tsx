import { useState } from 'react'
import { nanoid } from 'nanoid'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { IconCheck, IconLixeira, IconMais } from '../../../core/components/Icons'
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
  const [horario, setHorario] = useState(habito?.horario ?? '')
  const [prioridade, setPrioridade] = useState<number | undefined>(habito?.prioridade)
  const [erro, setErro] = useState<string | null>(null)

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
      horario: horario || undefined,
      prioridade,
      unidade: medido ? unidade.trim() || undefined : undefined,
      meta: medido ? Math.max(1, Number(meta) || 1) : undefined,
      passo: medido ? Math.max(1, Number(passo) || 1) : undefined,
      itens: tipo === 'checklist' ? itens.filter((i) => i.texto.trim()) : undefined,
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

      {/* Tipo de medição */}
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
      {tipo === 'checklist' && (
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

      {/* Horário + prioridade */}
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className={ROTULO}>Horário (opcional)</span>
          <input className={CAMPO} type="time" value={horario} onChange={(e) => setHorario(e.target.value)} />
        </label>
        <div className="flex flex-1 flex-col gap-1">
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
