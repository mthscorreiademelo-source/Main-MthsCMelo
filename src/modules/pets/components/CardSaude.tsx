import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { IconMais } from '../../../core/components/Icons'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { hojeISO } from '../../../core/dates'
import { CartaoModulo, ROTULO, type ControleCartao } from './CartaoModulo'
import { criarCondicao, criarMedicamentoPet, criarPeso, pesoAtual, removerCondicao, removerMedicamentoPet, removerPeso } from '../db'
import { useCondicoes, useMedicamentos, usePesos } from '../hooks'
import type { Pet, PetPeso, TipoCondicao } from '../types'

const CAMPO = 'w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-muted/50'
const ROT = 'text-[12px] font-medium text-muted'

/** Mini-gráfico de linha da evolução do peso. */
function GraficoPeso({ pesos }: { pesos: PetPeso[] }) {
  const ord = [...pesos].sort((a, b) => a.data.localeCompare(b.data))
  if (ord.length < 2) return <p className="text-[12px] text-muted">Registre pelo menos dois pesos para ver a evolução.</p>
  const W = 300, H = 84, P = 6
  const kgs = ord.map((p) => p.kg)
  const min = Math.min(...kgs), max = Math.max(...kgs)
  const span = max - min || 1
  const x = (i: number) => P + (i / (ord.length - 1)) * (W - 2 * P)
  const y = (kg: number) => P + (1 - (kg - min) / span) * (H - 2 * P)
  const pts = ord.map((p, i) => `${x(i)},${y(p.kg)}`).join(' ')
  const area = `${P},${H - P} ${pts} ${W - P},${H - P}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 84 }}>
      <polygon points={area} fill="var(--vida-accent)" opacity={0.1} />
      <polyline points={pts} fill="none" stroke="var(--vida-accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {ord.map((p, i) => (
        <circle key={p.id} cx={x(i)} cy={y(p.kg)} r={2.4} fill="var(--vida-accent)" />
      ))}
    </svg>
  )
}

type Sheet = null | 'peso' | 'condicao' | 'medicamento'

export function CardSaude({ pet, controle }: { pet: Pet; controle: ControleCartao }) {
  const pesos = usePesos(pet.id)
  const condicoes = useCondicoes(pet.id)
  const medicamentos = useMedicamentos(pet.id)
  const [sheet, setSheet] = useState<Sheet>(null)

  const atual = pesos ? pesoAtual(pesos) : null
  const idealTxt = pet.pesoIdealMin && pet.pesoIdealMax ? `${pet.pesoIdealMin}–${pet.pesoIdealMax} kg` : '—'

  // formulários
  const [kg, setKg] = useState('')
  const [dataPeso, setDataPeso] = useState(hojeISO())
  const [condTipo, setCondTipo] = useState<TipoCondicao>('alergia')
  const [condNome, setCondNome] = useState('')
  const [medNome, setMedNome] = useState('')
  const [medDose, setMedDose] = useState('')

  async function salvarPeso() {
    const n = Number(kg.replace(',', '.'))
    if (!n) return
    await criarPeso({ petId: pet.id, data: dataPeso, kg: n })
    setKg(''); setDataPeso(hojeISO()); setSheet(null)
  }
  async function salvarCondicao() {
    if (!condNome.trim()) return
    await criarCondicao({ petId: pet.id, tipo: condTipo, nome: condNome.trim(), ativo: true })
    setCondNome(''); setSheet(null)
  }
  async function salvarMedicamento() {
    if (!medNome.trim()) return
    await criarMedicamentoPet({ petId: pet.id, nome: medNome.trim(), dose: medDose.trim() || undefined, continuo: true })
    setMedNome(''); setMedDose(''); setSheet(null)
  }

  return (
    <CartaoModulo titulo="Saúde" emoji="📈" {...controle}>
      <div className="flex items-center justify-between">
        <div>
          <span className={ROTULO}>Evolução do peso</span>
          <div className="mt-0.5 text-[15px] font-bold">{atual ? `${atual.kg} kg` : '—'} <span className="text-[12px] font-normal text-muted">· ideal {idealTxt}</span></div>
        </div>
        <button onClick={() => setSheet('peso')} className="flex min-h-8 items-center gap-1 rounded-full border border-line px-2.5 text-[12.5px] font-medium text-muted hover:text-ink">
          <IconMais width={14} height={14} /> Peso
        </button>
      </div>
      <div className="mt-2">{pesos && <GraficoPeso pesos={pesos} />}</div>
      {pesos && pesos.length > 0 && (
        <div className="mt-1 flex justify-between text-[10px] text-muted">
          <span>{format(parseISO([...pesos].sort((a, b) => a.data.localeCompare(b.data))[0].data), 'MMM/yy')}</span>
          <span>{atual ? format(parseISO(atual.data), 'MMM/yy') : ''}</span>
        </div>
      )}

      {/* Condições / alergias */}
      <div className="mt-3 flex items-center justify-between">
        <span className={ROTULO}>Alergias e condições</span>
        <button onClick={() => setSheet('condicao')} className="text-muted hover:text-ink"><IconMais width={15} height={15} /></button>
      </div>
      {(condicoes ?? []).length === 0 ? (
        <p className="mt-1 text-[12.5px] text-muted">Nenhuma conhecida</p>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {(condicoes ?? []).map((c) => (
            <span key={c.id} className="group flex items-center gap-1 rounded-full bg-hover px-2.5 py-1 text-[12px]">
              {c.tipo === 'alergia' ? '⚠️' : c.tipo === 'cronica' ? '🔁' : '🩹'} {c.nome}
              <button onClick={() => removerCondicao(c.id)} className="text-muted opacity-0 hover:text-danger group-hover:opacity-100">×</button>
            </span>
          ))}
        </div>
      )}

      {/* Medicamentos */}
      <div className="mt-3 flex items-center justify-between">
        <span className={ROTULO}>Medicamentos contínuos</span>
        <button onClick={() => setSheet('medicamento')} className="text-muted hover:text-ink"><IconMais width={15} height={15} /></button>
      </div>
      {(medicamentos ?? []).length === 0 ? (
        <p className="mt-1 text-[12.5px] text-muted">Nenhum</p>
      ) : (
        <ul className="mt-1 divide-y divide-line">
          {(medicamentos ?? []).map((m) => (
            <li key={m.id} className="group flex items-center gap-2 py-1.5 text-[13px]">
              <span aria-hidden>💊</span>
              <span className="flex-1">{m.nome}{m.dose ? ` · ${m.dose}` : ''}</span>
              <button onClick={() => removerMedicamentoPet(m.id)} className="text-[15px] leading-none text-muted opacity-0 hover:text-danger group-hover:opacity-100">×</button>
            </li>
          ))}
        </ul>
      )}

      {/* histórico de pesos (para excluir) */}
      {sheet === null && pesos && pesos.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[12px] text-muted">Ver registros de peso ({pesos.length})</summary>
          <ul className="mt-1.5 divide-y divide-line">
            {[...pesos].sort((a, b) => b.data.localeCompare(a.data)).map((p) => (
              <li key={p.id} className="group flex items-center gap-2 py-1.5 text-[13px]">
                <span className="w-20 tabular-nums text-muted">{format(parseISO(p.data), 'dd/MM/yy')}</span>
                <span className="flex-1 font-medium">{p.kg} kg</span>
                <button onClick={() => removerPeso(p.id)} className="text-[15px] leading-none text-muted opacity-0 hover:text-danger group-hover:opacity-100">×</button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {sheet === 'peso' && (
        <FolhaInferior titulo="Registrar peso" onFechar={() => setSheet(null)}>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="block"><span className={ROT}>Peso (kg)</span><input inputMode="decimal" autoFocus className={`${CAMPO} mt-1`} value={kg} onChange={(e) => setKg(e.target.value)} placeholder="25,4" /></label>
              <label className="block"><span className={ROT}>Data</span><input type="date" className={`${CAMPO} mt-1`} value={dataPeso} onChange={(e) => setDataPeso(e.target.value)} /></label>
            </div>
            <button onClick={salvarPeso} disabled={!kg} className="min-h-11 rounded-xl bg-ink text-[14px] font-semibold text-surface disabled:opacity-40">Salvar</button>
          </div>
        </FolhaInferior>
      )}
      {sheet === 'condicao' && (
        <FolhaInferior titulo="Alergia / condição" onFechar={() => setSheet(null)}>
          <div className="flex flex-col gap-3">
            <div className="flex gap-1.5">
              {([['alergia', 'Alergia'], ['doenca', 'Doença'], ['cronica', 'Crônica']] as [TipoCondicao, string][]).map(([v, r]) => (
                <button key={v} onClick={() => setCondTipo(v)} className={`flex-1 rounded-xl border px-2 py-2 text-[13px] font-medium ${condTipo === v ? 'border-ink bg-hover text-ink' : 'border-line text-muted'}`}>{r}</button>
              ))}
            </div>
            <input autoFocus className={CAMPO} value={condNome} onChange={(e) => setCondNome(e.target.value)} placeholder="Ex.: Alergia a frango" />
            <button onClick={salvarCondicao} disabled={!condNome.trim()} className="min-h-11 rounded-xl bg-ink text-[14px] font-semibold text-surface disabled:opacity-40">Salvar</button>
          </div>
        </FolhaInferior>
      )}
      {sheet === 'medicamento' && (
        <FolhaInferior titulo="Medicamento contínuo" onFechar={() => setSheet(null)}>
          <div className="flex flex-col gap-3">
            <label className="block"><span className={ROT}>Nome</span><input autoFocus className={`${CAMPO} mt-1`} value={medNome} onChange={(e) => setMedNome(e.target.value)} placeholder="Ex.: Anti-inflamatório" /></label>
            <label className="block"><span className={ROT}>Dose / frequência</span><input className={`${CAMPO} mt-1`} value={medDose} onChange={(e) => setMedDose(e.target.value)} placeholder="Ex.: 1 comp. ao dia" /></label>
            <button onClick={salvarMedicamento} disabled={!medNome.trim()} className="min-h-11 rounded-xl bg-ink text-[14px] font-semibold text-surface disabled:opacity-40">Salvar</button>
          </div>
        </FolhaInferior>
      )}
    </CartaoModulo>
  )
}
