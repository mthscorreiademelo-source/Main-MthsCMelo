import { useState } from 'react'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { IconMais } from '../../../core/components/Icons'
import {
  adicionarEtapa,
  atualizarEtapa,
  atualizarRotina,
  CORES_ROTINA,
  ICONES_ROTINA,
  moverEtapa,
  removerEtapa,
} from './db'
import { IconeFator } from '../../../core/components/icones'
import { NOMES_DIA } from '../freq'
import type { Habito } from '../types'
import { EMOJI_TIPO_ETAPA, ROTULO_PERIODO, type PeriodoDia, type Rotina, type TipoEtapa } from './types'

const TIPOS: { id: TipoEtapa; nome: string }[] = [
  { id: 'checklist', nome: 'Checklist' },
  { id: 'timer', nome: 'Temporizador' },
  { id: 'nota', nome: 'Nota' },
  { id: 'acao', nome: 'Ação' },
]

const PERIODOS: PeriodoDia[] = ['manha', 'tarde', 'noite', 'qualquer']

export function EditorRotina({ rotina, habitos = [], onFechar }: { rotina: Rotina; habitos?: Habito[]; onFechar: () => void }) {
  const [nova, setNova] = useState('')
  const [addHabito, setAddHabito] = useState(false)
  const idsVinculados = new Set(rotina.etapas.map((e) => e.habitoId).filter(Boolean))
  const disponiveis = habitos.filter((h) => !h.arquivado && !idsVinculados.has(h.id))

  return (
    <FolhaInferior titulo="Editar rotina" onFechar={onFechar}>
      <div className="flex flex-col gap-4">
        {/* Identidade */}
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-[24px]" style={{ backgroundColor: `color-mix(in srgb, ${rotina.cor} 16%, var(--vida-surface))` }}>{rotina.icone}</span>
          <input
            value={rotina.nome}
            onChange={(e) => atualizarRotina(rotina.id, { nome: e.target.value })}
            placeholder="Nome da rotina"
            className="min-h-11 flex-1 rounded-xl border border-line bg-transparent px-3 text-[16px] font-semibold outline-none focus:border-muted/50"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {ICONES_ROTINA.map((e) => (
            <button key={e} onClick={() => atualizarRotina(rotina.id, { icone: e })} className={`flex size-9 items-center justify-center rounded-lg text-[18px] ${rotina.icone === e ? 'bg-ink' : 'bg-hover hover:bg-hover/70'}`}>{e}</button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted">Cor</span>
          <div className="flex gap-1.5">
            {CORES_ROTINA.map((c) => (
              <button key={c} onClick={() => atualizarRotina(rotina.id, { cor: c })} className={`size-7 rounded-full ${rotina.cor === c ? 'ring-2 ring-offset-2 ring-offset-surface' : ''}`} style={{ backgroundColor: c }} aria-label="cor" />
            ))}
          </div>
        </div>

        {/* Sugestão de período + horário */}
        <div>
          <span className="text-[13px] font-medium text-muted">Quando (sugestão)</span>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {PERIODOS.map((p) => (
              <button key={p} onClick={() => atualizarRotina(rotina.id, { periodo: p })} className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${rotina.periodo === p ? 'bg-hover text-ink' : 'border border-line text-muted hover:text-ink'}`}>{ROTULO_PERIODO[p]}</button>
            ))}
            <input type="time" value={rotina.horario ?? ''} onChange={(e) => atualizarRotina(rotina.id, { horario: e.target.value || undefined })} className="min-h-8 rounded-lg border border-line bg-transparent px-2 text-[12.5px] outline-none" title="Horário" />
          </div>
        </div>

        {/* Gatilho por dia da semana */}
        <div>
          <span className="text-[13px] font-medium text-muted">Dias <span className="font-normal text-muted/60">(vazio = qualquer dia)</span></span>
          <div className="mt-1.5 flex gap-1">
            {NOMES_DIA.map((nome, dow) => {
              const ativo = (rotina.dias ?? []).includes(dow)
              return (
                <button
                  key={dow}
                  onClick={() => {
                    const atual = rotina.dias ?? []
                    const novos = ativo ? atual.filter((d) => d !== dow) : [...atual, dow].sort((a, b) => a - b)
                    atualizarRotina(rotina.id, { dias: novos.length ? novos : undefined })
                  }}
                  className={`flex size-9 items-center justify-center rounded-full text-[11.5px] font-medium capitalize transition-colors ${ativo ? 'bg-ink text-surface' : 'border border-line text-muted hover:bg-hover'}`}
                >
                  {nome.charAt(0)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Etapas */}
        <div>
          <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">Etapas</span>
          <ul className="mt-2 flex flex-col gap-1.5">
            {rotina.etapas.map((et, idx) => (
              <li key={et.id} className="flex items-center gap-2 rounded-xl border border-line px-2.5 py-2">
                <span className="text-[15px]">{EMOJI_TIPO_ETAPA[et.tipo]}</span>
                <input
                  value={et.titulo}
                  onChange={(e) => atualizarEtapa(rotina, et.id, { titulo: e.target.value })}
                  className="min-w-0 flex-1 bg-transparent text-[14px] outline-none"
                />
                {et.tipo === 'timer' && (
                  <input
                    type="number"
                    value={et.duracaoMin ?? ''}
                    onChange={(e) => atualizarEtapa(rotina, et.id, { duracaoMin: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-12 rounded-md border border-line bg-transparent px-1 py-0.5 text-center text-[12px] outline-none"
                    title="minutos"
                  />
                )}
                <button onClick={() => moverEtapa(rotina, et.id, -1)} disabled={idx === 0} className="flex size-6 items-center justify-center rounded text-muted hover:bg-hover disabled:opacity-30">↑</button>
                <button onClick={() => moverEtapa(rotina, et.id, 1)} disabled={idx === rotina.etapas.length - 1} className="flex size-6 items-center justify-center rounded text-muted hover:bg-hover disabled:opacity-30">↓</button>
                <button onClick={() => removerEtapa(rotina, et.id)} className="flex size-6 items-center justify-center rounded text-muted hover:bg-hover hover:text-danger">×</button>
              </li>
            ))}
          </ul>

          {/* Adicionar etapa */}
          <form
            onSubmit={(e) => { e.preventDefault(); if (nova.trim()) { adicionarEtapa(rotina, { tipo: 'checklist', titulo: nova.trim() }); setNova('') } }}
            className="mt-2 flex items-center gap-1.5 rounded-xl border border-dashed border-line px-2.5 py-1.5"
          >
            <IconMais width={15} height={15} />
            <input value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Adicionar etapa…" className="min-w-0 flex-1 bg-transparent py-1.5 text-[14px] outline-none placeholder:text-muted/60" />
          </form>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {TIPOS.filter((x) => x.id !== 'checklist').map((tp) => (
              <button key={tp.id} onClick={() => adicionarEtapa(rotina, { tipo: tp.id, titulo: tp.nome, duracaoMin: tp.id === 'timer' ? 5 : undefined })} className="rounded-full border border-line px-2.5 py-1 text-[11.5px] text-muted hover:text-ink">
                + {EMOJI_TIPO_ETAPA[tp.id]} {tp.nome}
              </button>
            ))}
            {disponiveis.length > 0 && (
              <button onClick={() => setAddHabito((v) => !v)} className="rounded-full border border-line px-2.5 py-1 text-[11.5px] text-muted hover:text-ink">
                + 🔁 Hábito
              </button>
            )}
          </div>

          {/* Vincular hábito existente (completar a etapa registra o hábito) */}
          {addHabito && disponiveis.length > 0 && (
            <div className="mt-2 rounded-xl border border-line p-2">
              <p className="mb-1.5 px-1 text-[11px] text-muted">Concluir a etapa registra o hábito — sem duplicar.</p>
              <div className="flex flex-wrap gap-1.5">
                {disponiveis.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => { adicionarEtapa(rotina, { tipo: 'habito', titulo: h.nome, habitoId: h.id }); setAddHabito(false) }}
                    className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[12px] hover:bg-hover/60"
                  >
                    <span style={{ color: h.cor }}><IconeFator nome={h.icone} width={13} height={13} /></span>
                    {h.nome}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </FolhaInferior>
  )
}
