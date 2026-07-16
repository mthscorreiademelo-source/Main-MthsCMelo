import { useEffect, useState } from 'react'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { IconCheck, IconLixeira } from '../../../core/components/Icons'
import { atualizarEvento, CORES_EVENTO, excluirEvento } from '../db'
import type { Cronograma, Evento, Presenca, TipoRecorrenciaEvento } from '../types'

const PRESENCAS: { valor: Presenca | undefined; rotulo: string }[] = [
  { valor: 'confirmado', rotulo: 'Vou' },
  { valor: undefined, rotulo: 'Talvez' },
  { valor: 'recusado', rotulo: 'Não vou' },
]

const RECS: { valor: TipoRecorrenciaEvento | ''; rotulo: string }[] = [
  { valor: '', rotulo: 'Não repete' },
  { valor: 'diaria', rotulo: 'Todo dia' },
  { valor: 'semanal', rotulo: 'Toda semana' },
  { valor: 'mensal', rotulo: 'Todo mês' },
  { valor: 'anual', rotulo: 'Todo ano' },
]

const CAMPO =
  'min-h-10 rounded-lg border border-line bg-surface px-3 text-[15px] outline-none focus:border-muted/60'
const ROTULO = 'text-[13px] font-medium text-muted'

export function EditorEvento({
  evento,
  cronogramas,
  onFechar,
}: {
  evento: Evento
  cronogramas: Cronograma[]
  onFechar: () => void
}) {
  const [titulo, setTitulo] = useState(evento.titulo)
  const [data, setData] = useState(evento.data)
  const [dataFim, setDataFim] = useState(evento.dataFim ?? '')
  const [inicio, setInicio] = useState(evento.inicio)
  const [fim, setFim] = useState(evento.fim)
  const [diaInteiro, setDiaInteiro] = useState(!!evento.diaInteiro)
  const [cor, setCor] = useState(evento.cor ?? CORES_EVENTO[0])
  const [local, setLocal] = useState(evento.local ?? '')
  const [descricao, setDescricao] = useState(evento.descricao ?? '')
  const [presenca, setPresenca] = useState<Presenca | undefined>(evento.presenca)
  const [recorre, setRecorre] = useState<TipoRecorrenciaEvento | ''>(evento.recorrencia?.tipo ?? '')

  useEffect(() => {
    setTitulo(evento.titulo)
    setData(evento.data)
    setDataFim(evento.dataFim ?? '')
    setInicio(evento.inicio)
    setFim(evento.fim)
    setDiaInteiro(!!evento.diaInteiro)
    setCor(evento.cor ?? CORES_EVENTO[0])
    setLocal(evento.local ?? '')
    setDescricao(evento.descricao ?? '')
    setPresenca(evento.presenca)
    setRecorre(evento.recorrencia?.tipo ?? '')
  }, [evento.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const salvar = (m: Partial<Evento>) => atualizarEvento(evento.id, m)

  async function excluir() {
    if (!confirm('Excluir este evento?')) return
    await excluirEvento(evento.id)
    onFechar()
  }

  return (
    <FolhaInferior titulo="Evento" onFechar={onFechar}>
      <input
        autoFocus
        value={titulo}
        onChange={(e) => {
          setTitulo(e.target.value)
          salvar({ titulo: e.target.value.trim() || 'Novo evento' })
        }}
        placeholder="Título do evento"
        className="w-full bg-transparent text-lg font-semibold outline-none placeholder:text-muted/60"
      />

      <label className="flex items-center justify-between">
        <span className={ROTULO}>Dia inteiro</span>
        <button
          onClick={() => {
            const v = !diaInteiro
            setDiaInteiro(v)
            salvar({ diaInteiro: v })
          }}
          className={`relative h-6 w-11 rounded-full transition-colors ${diaInteiro ? 'bg-accent' : 'bg-line'}`}
          role="switch"
          aria-checked={diaInteiro}
        >
          <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${diaInteiro ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className={ROTULO}>Data</span>
          <input
            type="date"
            value={data}
            onChange={(e) => {
              setData(e.target.value)
              if (e.target.value) salvar({ data: e.target.value })
            }}
            className={CAMPO}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className={ROTULO}>Termina em (opcional)</span>
          <input
            type="date"
            value={dataFim}
            min={data}
            onChange={(e) => {
              const v = e.target.value && e.target.value > data ? e.target.value : ''
              setDataFim(v)
              salvar({ dataFim: v || undefined })
            }}
            className={CAMPO}
          />
        </label>
      </div>

      {!diaInteiro && (
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1">
            <span className={ROTULO}>Início</span>
            <input
              type="time"
              value={inicio}
              onChange={(e) => {
                setInicio(e.target.value)
                if (e.target.value) salvar({ inicio: e.target.value })
              }}
              className={CAMPO}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className={ROTULO}>Fim</span>
            <input
              type="time"
              value={fim}
              onChange={(e) => {
                setFim(e.target.value)
                if (e.target.value) salvar({ fim: e.target.value })
              }}
              className={CAMPO}
            />
          </label>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className={ROTULO}>Cor</span>
        <div className="flex flex-wrap gap-2">
          {CORES_EVENTO.map((c) => (
            <button
              key={c}
              onClick={() => {
                setCor(c)
                salvar({ cor: c })
              }}
              aria-label={`Cor ${c}`}
              className={`size-7 rounded-full transition-transform ${cor === c ? 'scale-110 ring-2 ring-ink ring-offset-2 ring-offset-bg' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Presença */}
      <div className="flex flex-col gap-1.5">
        <span className={ROTULO}>Presença</span>
        <div className="flex gap-1.5">
          {PRESENCAS.map((p) => {
            const ativo = presenca === p.valor
            return (
              <button
                key={p.rotulo}
                onClick={() => {
                  setPresenca(p.valor)
                  salvar({ presenca: p.valor })
                }}
                className={`min-h-9 flex-1 rounded-lg border text-[13px] font-medium transition-colors ${
                  ativo ? 'border-ink bg-ink text-surface' : 'border-line text-muted'
                }`}
              >
                {p.rotulo}
              </button>
            )
          })}
        </div>
      </div>

      {/* Repetir */}
      <label className="flex flex-col gap-1">
        <span className={ROTULO}>Repetir</span>
        <select
          value={recorre}
          onChange={(e) => {
            const v = e.target.value as TipoRecorrenciaEvento | ''
            setRecorre(v)
            salvar({ recorrencia: v ? { tipo: v, intervalo: 1 } : undefined })
          }}
          className={CAMPO}
        >
          {RECS.map((r) => (
            <option key={r.valor} value={r.valor}>
              {r.rotulo}
            </option>
          ))}
        </select>
      </label>

      {cronogramas.length > 0 && (
        <label className="flex flex-col gap-1">
          <span className={ROTULO}>Cronograma</span>
          <select
            value={evento.cronogramaId ?? ''}
            onChange={(e) => salvar({ cronogramaId: e.target.value || undefined })}
            className={CAMPO}
          >
            <option value="">Nenhum</option>
            {cronogramas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className={ROTULO}>Local (opcional)</span>
        <input
          value={local}
          onChange={(e) => {
            setLocal(e.target.value)
            salvar({ local: e.target.value.trim() || undefined })
          }}
          placeholder="ex.: Sala 3, online…"
          className={CAMPO}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className={ROTULO}>Descrição (opcional)</span>
        <textarea
          value={descricao}
          onChange={(e) => {
            setDescricao(e.target.value)
            salvar({ descricao: e.target.value.trim() || undefined })
          }}
          rows={3}
          className="w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-[15px] outline-none focus:border-muted/60"
        />
      </label>

      <button
        onClick={onFechar}
        className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-ink text-[15px] font-medium text-surface"
      >
        <IconCheck width={17} height={17} /> Concluir
      </button>
      <button onClick={excluir} className="flex items-center justify-center gap-1.5 self-center text-[13px] text-red-500">
        <IconLixeira width={15} height={15} /> Excluir evento
      </button>
    </FolhaInferior>
  )
}
