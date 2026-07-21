import { useState } from 'react'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { parsearValor, valorParaTexto } from '../../financas/db'
import { atualizarAquisicao, criarAquisicao, excluirAquisicao, STATUS_AQUISICAO } from '../db'
import type { Aquisicao, Prioridade, StatusAquisicao } from '../types'

const CAMPO = 'w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-muted/50'
const ROT = 'text-[12px] font-medium text-muted'

export function EditorAquisicao({ aquisicao, onFechar, onCriado }: { aquisicao?: Aquisicao; onFechar: () => void; onCriado?: (id: string) => void }) {
  const editando = !!aquisicao
  const [nome, setNome] = useState(aquisicao?.nome ?? '')
  const [status, setStatus] = useState<StatusAquisicao>(aquisicao?.status ?? 'desejo')
  const [prioridade, setPrioridade] = useState<Prioridade>(aquisicao?.prioridade ?? 'media')
  const [esperado, setEsperado] = useState(aquisicao?.valorEsperadoCentavos ? valorParaTexto(aquisicao.valorEsperadoCentavos) : '')
  const [dataDesejada, setDataDesejada] = useState(aquisicao?.dataDesejada ?? '')
  const [necessidade, setNecessidade] = useState(aquisicao?.necessidade ?? '')
  const [descricao, setDescricao] = useState(aquisicao?.descricao ?? '')

  async function salvar() {
    if (!nome.trim()) return
    const dados = {
      nome: nome.trim(),
      status,
      prioridade,
      valorEsperadoCentavos: esperado ? parsearValor(esperado) ?? undefined : undefined,
      dataDesejada: dataDesejada || undefined,
      necessidade: necessidade.trim() || undefined,
      descricao: descricao.trim() || undefined,
    }
    if (editando && aquisicao) await atualizarAquisicao(aquisicao.id, dados)
    else { const id = await criarAquisicao(dados); onCriado?.(id) }
    onFechar()
  }
  async function apagar() {
    if (!aquisicao) return
    if (!confirm(`Excluir “${aquisicao.nome}”?`)) return
    await excluirAquisicao(aquisicao.id)
    onFechar()
  }

  return (
    <FolhaInferior titulo={editando ? 'Editar aquisição' : 'Nova aquisição planejada'} onFechar={onFechar}>
      <div className="flex flex-col gap-3">
        <label className="block"><span className={ROT}>O que é</span><input autoFocus className={`${CAMPO} mt-1`} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Notebook, impressora 3D…" /></label>
        <div>
          <span className={ROT}>Status</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {STATUS_AQUISICAO.filter((s) => s.valor !== 'cancelado').map((s) => (
              <button key={s.valor} onClick={() => setStatus(s.valor)} className={`rounded-full border px-2.5 py-1 text-[12px] font-medium ${status === s.valor ? 'border-ink text-ink' : 'border-line text-muted'}`} style={status === s.valor ? { backgroundColor: `${s.cor}22` } : undefined}>{s.nome}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block"><span className={ROT}>Valor esperado</span><input inputMode="decimal" className={`${CAMPO} mt-1`} value={esperado} onChange={(e) => setEsperado(e.target.value)} placeholder="R$ 0,00" /></label>
          <label className="block"><span className={ROT}>Data desejada</span><input type="date" className={`${CAMPO} mt-1`} value={dataDesejada} onChange={(e) => setDataDesejada(e.target.value)} /></label>
        </div>
        <div>
          <span className={ROT}>Prioridade</span>
          <div className="mt-1.5 flex gap-1.5">
            {([['alta', 'Alta'], ['media', 'Média'], ['baixa', 'Baixa']] as [Prioridade, string][]).map(([v, r]) => (
              <button key={v} onClick={() => setPrioridade(v)} className={`flex-1 rounded-xl border px-2 py-2 text-[13px] font-medium ${prioridade === v ? 'border-ink bg-hover text-ink' : 'border-line text-muted'}`}>{r}</button>
            ))}
          </div>
        </div>
        <label className="block"><span className={ROT}>Necessidade</span><input className={`${CAMPO} mt-1`} value={necessidade} onChange={(e) => setNecessidade(e.target.value)} placeholder="Por que você precisa?" /></label>
        <label className="block"><span className={ROT}>Descrição / notas</span><textarea className={`${CAMPO} mt-1 min-h-16 resize-y`} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Modelos, comparações, links…" /></label>
        <button onClick={salvar} disabled={!nome.trim()} className="mt-1 min-h-11 rounded-xl bg-ink text-[14px] font-semibold text-surface disabled:opacity-40">{editando ? 'Salvar' : 'Criar aquisição'}</button>
        {editando && <button onClick={apagar} className="min-h-10 rounded-xl text-[13px] font-medium text-danger hover:bg-danger/10">Excluir</button>}
      </div>
    </FolhaInferior>
  )
}
