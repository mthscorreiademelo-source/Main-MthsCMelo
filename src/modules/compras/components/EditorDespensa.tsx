import { useState } from 'react'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { hojeISO } from '../../../core/dates'
import { atualizarDespensa, CATEGORIAS, criarDespensa, excluirDespensa, LOCAIS_PADRAO, NIVEIS } from '../db'
import type { ItemDespensa, NivelAprox } from '../types'

const CAMPO = 'w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-muted/50'
const ROT = 'text-[12px] font-medium text-muted'

type Modo = 'exata' | 'nivel' | 'possui'

export function EditorDespensa({ item, onFechar, onCriado }: { item?: ItemDespensa; onFechar: () => void; onCriado?: (id: string) => void }) {
  const editando = !!item
  const [nome, setNome] = useState(item?.nome ?? '')
  const [marca, setMarca] = useState(item?.marca ?? '')
  const [categoria, setCategoria] = useState(item?.categoria ?? 'outros')
  const [local, setLocal] = useState(item?.local ?? '')
  const [unidade, setUnidade] = useState(item?.unidade ?? 'un')
  const [modo, setModo] = useState<Modo>(item?.possuiApenas ? 'possui' : item?.nivelAprox ? 'nivel' : 'exata')
  const [fechados, setFechados] = useState(item?.quantidadeFechados?.toString() ?? '1')
  const [tamanho, setTamanho] = useState(item?.tamanhoEmbalagem?.toString() ?? '')
  const [nivel, setNivel] = useState<NivelAprox>(item?.nivelAprox ?? 'metade')
  const [validade, setValidade] = useState(item?.validade ?? '')
  const [monitorar, setMonitorar] = useState(item?.monitorarIA ?? true)

  async function salvar() {
    if (!nome.trim()) return
    const base = {
      nome: nome.trim(),
      marca: marca.trim() || undefined,
      categoria,
      local: local.trim() || undefined,
      unidade,
      validade: validade || undefined,
      monitorarIA: monitorar,
      quantidadeFechados: undefined as number | undefined,
      tamanhoEmbalagem: undefined as number | undefined,
      nivelAprox: undefined as NivelAprox | undefined,
      possuiApenas: undefined as boolean | undefined,
    }
    if (modo === 'exata') {
      base.quantidadeFechados = fechados ? Number(fechados.replace(',', '.')) : 0
      base.tamanhoEmbalagem = tamanho ? Number(tamanho.replace(',', '.')) : undefined
    } else if (modo === 'nivel') {
      base.nivelAprox = nivel
    } else {
      base.possuiApenas = true
    }
    if (editando && item) {
      await atualizarDespensa(item.id, base)
    } else {
      const id = await criarDespensa(base)
      onCriado?.(id)
    }
    onFechar()
  }

  async function apagar() {
    if (!item) return
    if (!confirm(`Remover ${item.nome} da despensa?`)) return
    await excluirDespensa(item.id)
    onFechar()
  }

  return (
    <FolhaInferior titulo={editando ? 'Editar item' : 'Novo item da despensa'} onFechar={onFechar}>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="block"><span className={ROT}>Nome</span><input autoFocus className={`${CAMPO} mt-1`} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Arroz" /></label>
          <label className="block"><span className={ROT}>Marca</span><input className={`${CAMPO} mt-1`} value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Opcional" /></label>
        </div>

        <div>
          <span className={ROT}>Categoria</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {CATEGORIAS.map((c) => (
              <button key={c.valor} onClick={() => setCategoria(c.valor)} className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium ${categoria === c.valor ? 'border-ink bg-ink text-surface' : 'border-line text-muted'}`}>
                <span aria-hidden>{c.icone}</span> {c.nome}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="block"><span className={ROT}>Local</span>
            <input className={`${CAMPO} mt-1`} value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Despensa" list="locais-despensa" />
            <datalist id="locais-despensa">{LOCAIS_PADRAO.map((l) => <option key={l} value={l} />)}</datalist>
          </label>
          <label className="block"><span className={ROT}>Unidade</span><input className={`${CAMPO} mt-1`} value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="un, kg, ml…" /></label>
        </div>

        {/* Três formas de informar a quantidade */}
        <div>
          <span className={ROT}>Quanto você tem?</span>
          <div className="mt-1.5 flex gap-1.5">
            {([['exata', 'Quantidade'], ['nivel', 'Nível aprox.'], ['possui', 'Só tenho']] as [Modo, string][]).map(([v, r]) => (
              <button key={v} onClick={() => setModo(v)} className={`flex-1 rounded-xl border px-2 py-2 text-[12.5px] font-medium ${modo === v ? 'border-ink bg-hover text-ink' : 'border-line text-muted'}`}>{r}</button>
            ))}
          </div>
          {modo === 'exata' && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="block"><span className={ROT}>Unidades</span><input inputMode="decimal" className={`${CAMPO} mt-1`} value={fechados} onChange={(e) => setFechados(e.target.value)} placeholder="3" /></label>
              <label className="block"><span className={ROT}>Tamanho ({unidade})</span><input inputMode="decimal" className={`${CAMPO} mt-1`} value={tamanho} onChange={(e) => setTamanho(e.target.value)} placeholder="opcional" /></label>
            </div>
          )}
          {modo === 'nivel' && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {NIVEIS.map((n) => (
                <button key={n.valor} onClick={() => setNivel(n.valor)} className={`rounded-full border px-2.5 py-1.5 text-[12.5px] font-medium ${nivel === n.valor ? 'border-ink bg-ink text-surface' : 'border-line text-muted'}`}>{n.nome}</button>
              ))}
            </div>
          )}
          {modo === 'possui' && <p className="mt-2 text-[12px] text-muted">O Lume registra que você tem, sem quantidade. A estimativa melhora conforme você compra e ajusta.</p>}
        </div>

        <label className="block"><span className={ROT}>Validade (opcional)</span><input type="date" className={`${CAMPO} mt-1`} value={validade} onChange={(e) => setValidade(e.target.value)} /></label>

        <label className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5">
          <span className="text-[13.5px] font-medium">Monitorar reposição (sugestões da IA)</span>
          <input type="checkbox" checked={monitorar} onChange={(e) => setMonitorar(e.target.checked)} className="size-4 accent-[var(--vida-accent)]" />
        </label>

        <button onClick={salvar} disabled={!nome.trim()} className="mt-1 min-h-11 rounded-xl bg-ink text-[14px] font-semibold text-surface disabled:opacity-40">{editando ? 'Salvar' : 'Adicionar à despensa'}</button>
        {editando && <button onClick={apagar} className="min-h-10 rounded-xl text-[13px] font-medium text-danger hover:bg-danger/10">Remover item</button>}
        {!editando && <p className="text-center text-[11px] text-muted">Hoje é {hojeISO().split('-').reverse().join('/')} — o cadastro não precisa ser preciso.</p>}
      </div>
    </FolhaInferior>
  )
}
