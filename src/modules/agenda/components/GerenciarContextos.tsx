import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { IconLixeira, IconMais } from '../../../core/components/Icons'
import { CATEGORIAS_CONTEXTO, CORES_EVENTO, atualizarContexto, criarContexto, excluirContexto, paraHHMM, paraMin } from '../db'
import { useContextos } from '../hooks'
import type { Contexto } from '../types'

const CAMPO = 'min-h-10 rounded-lg border border-line bg-surface px-2.5 text-[14px] outline-none focus:border-muted/60'
const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function LinhaContexto({ c }: { c: Contexto }) {
  const dias = c.dias ?? []
  const toggleDia = (d: number) => {
    const novo = dias.includes(d) ? dias.filter((x) => x !== d) : [...dias, d].sort()
    atualizarContexto(c.id, { dias: novo.length && novo.length < 7 ? novo : undefined })
  }
  const cruzaMeia = c.fimMin <= c.inicioMin
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line p-3">
      <div className="flex items-center gap-2">
        <input defaultValue={c.icone ?? ''} onBlur={(e) => atualizarContexto(c.id, { icone: e.target.value.trim() || undefined })} className={`${CAMPO} w-12 text-center`} placeholder="🌙" />
        <input defaultValue={c.nome} onBlur={(e) => atualizarContexto(c.id, { nome: e.target.value.trim() || 'Contexto' })} className={`${CAMPO} flex-1`} />
        <input type="color" defaultValue={c.cor} onChange={(e) => atualizarContexto(c.id, { cor: e.target.value })} className="size-9 shrink-0 rounded-lg border border-line bg-surface" aria-label="Cor" />
        <button onClick={() => excluirContexto(c.id)} aria-label="Excluir" className="shrink-0 text-danger/80 hover:text-danger"><IconLixeira width={16} height={16} /></button>
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-[12px] text-muted">
          Das <input type="time" defaultValue={paraHHMM(c.inicioMin)} onBlur={(e) => e.target.value && atualizarContexto(c.id, { inicioMin: paraMin(e.target.value) })} className={CAMPO} />
        </label>
        <label className="flex items-center gap-1.5 text-[12px] text-muted">
          às <input type="time" defaultValue={paraHHMM(c.fimMin)} onBlur={(e) => e.target.value && atualizarContexto(c.id, { fimMin: paraMin(e.target.value) })} className={CAMPO} />
        </label>
        {cruzaMeia && <span className="text-[11px] text-muted/70">cruza a meia-noite</span>}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {DIAS.map((d, i) => {
            const ativo = dias.length === 0 || dias.includes(i)
            return (
              <button key={i} onClick={() => toggleDia(i)} className={`flex size-7 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${ativo ? 'bg-ink text-surface' : 'bg-hover text-muted'}`} title={dias.length === 0 ? 'Todos os dias' : ''}>{d}</button>
            )
          })}
        </div>
        <label className="flex items-center gap-1.5 text-[11px] text-muted">
          Transp.
          <input type="range" min={3} max={25} defaultValue={Math.round((c.opacidade ?? 0.08) * 100)} onChange={(e) => atualizarContexto(c.id, { opacidade: Number(e.target.value) / 100 })} className="w-20 accent-[var(--vida-accent)]" />
        </label>
      </div>

      <label className="flex items-center gap-2 text-[12px] text-muted">
        Categoria
        <input list="cats-contexto" defaultValue={c.categoria ?? ''} onBlur={(e) => atualizarContexto(c.id, { categoria: e.target.value.trim() || undefined })} className={`${CAMPO} flex-1`} placeholder="Sono, Trabalho…" />
      </label>
    </div>
  )
}

export function GerenciarContextos({ onFechar }: { onFechar: () => void }) {
  const contextos = useContextos() ?? []
  return (
    <FolhaInferior titulo="Contextos de rotina" onFechar={onFechar}>
      <p className="text-[12.5px] leading-snug text-muted">
        Faixas de fundo (Sono, Trabalho, Estudos…) que contextualizam o dia sem competir com os eventos. Ajuste horário, dias da semana, cor e transparência à sua rotina.
      </p>
      <datalist id="cats-contexto">{CATEGORIAS_CONTEXTO.map((c) => <option key={c} value={c} />)}</datalist>
      <div className="mt-1 flex flex-col gap-3">
        {contextos.map((c) => <LinhaContexto key={c.id} c={c} />)}
      </div>
      <button
        onClick={() => criarContexto({ nome: 'Novo contexto', cor: CORES_EVENTO[5], inicioMin: 9 * 60, fimMin: 12 * 60 })}
        className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-3 text-[13px] font-medium text-muted hover:text-ink"
      >
        <IconMais width={15} height={15} /> Adicionar contexto
      </button>
    </FolhaInferior>
  )
}
