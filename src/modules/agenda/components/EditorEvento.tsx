import { useEffect, useState } from 'react'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { IconCheck, IconLixeira } from '../../../core/components/Icons'
import { atualizarEvento, CORES_EVENTO, excluirEvento } from '../db'
import type { Evento } from '../types'

const CAMPO =
  'min-h-10 rounded-lg border border-line bg-surface px-3 text-[15px] outline-none focus:border-muted/60'
const ROTULO = 'text-[13px] font-medium text-muted'

export function EditorEvento({ evento, onFechar }: { evento: Evento; onFechar: () => void }) {
  const [titulo, setTitulo] = useState(evento.titulo)
  const [data, setData] = useState(evento.data)
  const [inicio, setInicio] = useState(evento.inicio)
  const [fim, setFim] = useState(evento.fim)
  const [diaInteiro, setDiaInteiro] = useState(!!evento.diaInteiro)
  const [cor, setCor] = useState(evento.cor ?? CORES_EVENTO[0])
  const [local, setLocal] = useState(evento.local ?? '')
  const [descricao, setDescricao] = useState(evento.descricao ?? '')

  useEffect(() => {
    setTitulo(evento.titulo)
    setData(evento.data)
    setInicio(evento.inicio)
    setFim(evento.fim)
    setDiaInteiro(!!evento.diaInteiro)
    setCor(evento.cor ?? CORES_EVENTO[0])
    setLocal(evento.local ?? '')
    setDescricao(evento.descricao ?? '')
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

      <label className="flex flex-col gap-1">
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
