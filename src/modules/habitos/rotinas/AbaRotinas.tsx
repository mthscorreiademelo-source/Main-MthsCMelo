import { useState } from 'react'
import { EmptyState } from '../../../core/components/EmptyState'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { IconMais } from '../../../core/components/Icons'
import { db } from '../../../core/db/db'
import { mostrarToast } from '../../../core/captura/store'
import { useHabitos } from '../hooks'
import { agendarRotina, arquivarRotina, criarRotinaDeTemplate, excluirRotina, TEMPLATES_ROTINA, useRotinas } from './db'
import { EditorRotina } from './EditorRotina'
import { ExecucaoGuiada } from './ExecucaoGuiada'
import { ROTULO_PERIODO, type Rotina } from './types'

function CartaoRotina({ rotina, onIniciar, onEditar }: { rotina: Rotina; onIniciar: () => void; onEditar: () => void }) {
  const [menu, setMenu] = useState(false)
  const nEtapas = rotina.etapas.length
  const tempo = rotina.etapas.reduce((s, e) => s + (e.duracaoMin ?? 0), 0)
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface/50 p-3.5">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-[22px]" style={{ backgroundColor: `color-mix(in srgb, ${rotina.cor} 16%, var(--vida-surface))` }}>{rotina.icone}</span>
        <button onClick={onEditar} className="min-w-0 flex-1 text-left">
          <span className="block truncate text-[15px] font-semibold">{rotina.nome}</span>
          <span className="block text-[12px] text-muted">
            {nEtapas} etapa{nEtapas === 1 ? '' : 's'}
            {tempo > 0 ? ` · ~${tempo} min` : ''}
            {rotina.periodo && rotina.periodo !== 'qualquer' ? ` · ${ROTULO_PERIODO[rotina.periodo]}` : ''}
          </span>
        </button>
        <div className="relative shrink-0">
          <button onClick={() => setMenu((v) => !v)} aria-label="Mais" className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-hover">⋯</button>
          {menu && (
            <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-xl border border-line bg-surface p-1 shadow-xl">
              <button onClick={() => { onEditar(); setMenu(false) }} className="block w-full rounded-lg px-3 py-1.5 text-left text-[13px] hover:bg-hover">Editar</button>
              <button onClick={async () => { await agendarRotina(rotina); setMenu(false); mostrarToast('Rotina reservada na Agenda de hoje') }} className="block w-full rounded-lg px-3 py-1.5 text-left text-[13px] hover:bg-hover">Agendar na Agenda</button>
              <button onClick={() => { arquivarRotina(rotina.id); setMenu(false) }} className="block w-full rounded-lg px-3 py-1.5 text-left text-[13px] hover:bg-hover">Arquivar</button>
              <button onClick={() => { if (confirm('Excluir esta rotina?')) excluirRotina(rotina.id); setMenu(false) }} className="block w-full rounded-lg px-3 py-1.5 text-left text-[13px] text-danger hover:bg-hover">Excluir</button>
            </div>
          )}
        </div>
      </div>
      <button onClick={onIniciar} disabled={nEtapas === 0} className="min-h-9 rounded-full bg-ink text-[13px] font-semibold text-surface disabled:opacity-40">
        ▶ Iniciar rotina
      </button>
    </div>
  )
}

export function AbaRotinas() {
  const rotinas = useRotinas()
  const habitos = useHabitos()
  const [editando, setEditando] = useState<Rotina | null>(null)
  const [executando, setExecutando] = useState<Rotina | null>(null)
  const [criando, setCriando] = useState(false)

  const ativas = (rotinas ?? []).filter((r) => !r.arquivada)

  async function novaDeTemplate(id: string) {
    const rid = await criarRotinaDeTemplate(id)
    setCriando(false)
    const r = await db.rotinas.get(rid)
    if (r) setEditando(r)
  }

  return (
    <div className="flex flex-col gap-3">
      {rotinas === undefined ? (
        <p className="py-8 text-center text-[13px] text-muted">Carregando…</p>
      ) : ativas.length === 0 ? (
        <EmptyState
          icone={<span className="text-2xl">🔁</span>}
          titulo="Nenhuma rotina ainda"
          descricao="Agrupe ações recorrentes para executá-las em sequência — como uma rotina matinal ou noturna."
        />
      ) : (
        ativas.map((r) => (
          <CartaoRotina key={r.id} rotina={r} onIniciar={() => setExecutando(r)} onEditar={() => setEditando(r)} />
        ))
      )}

      <button onClick={() => setCriando(true)} className="flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line text-[14px] font-medium text-muted hover:text-ink">
        <IconMais width={16} height={16} /> Nova rotina
      </button>

      {criando && (
        <FolhaInferior titulo="Começar rotina com…" onFechar={() => setCriando(false)}>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES_ROTINA.map((t) => (
              <button key={t.id} onClick={() => novaDeTemplate(t.id)} className="flex flex-col items-center gap-1.5 rounded-2xl border border-line p-3 text-center hover:bg-hover/50">
                <span className="flex size-11 items-center justify-center rounded-2xl text-[22px]" style={{ backgroundColor: `color-mix(in srgb, ${t.cor} 16%, var(--vida-surface))` }}>{t.icone}</span>
                <span className="text-[13px] font-medium">{t.id === 'vazia' ? 'Em branco' : t.nome}</span>
                {t.etapas.length > 0 && <span className="text-[11px] text-muted">{t.etapas.length} etapas</span>}
              </button>
            ))}
          </div>
        </FolhaInferior>
      )}

      {editando && <EditorRotina rotina={ativas.find((r) => r.id === editando.id) ?? editando} habitos={habitos ?? []} onFechar={() => setEditando(null)} />}
      {executando && <ExecucaoGuiada rotina={ativas.find((r) => r.id === executando.id) ?? executando} onFechar={() => setExecutando(null)} />}
    </div>
  )
}
