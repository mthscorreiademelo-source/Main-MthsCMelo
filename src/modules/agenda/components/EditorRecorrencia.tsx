import { getDay, parseISO } from 'date-fns'
import type { RecorrenciaEvento, TipoRecorrenciaEvento } from '../types'

const CAMPO = 'min-h-10 rounded-lg border border-line bg-surface px-2 text-[14px] outline-none focus:border-muted/60'
const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

type Preset = '' | 'diaria' | 'diasUteis' | 'semanal' | 'mensal' | 'anual' | 'custom'

const PRESETS: { valor: Preset; rotulo: string }[] = [
  { valor: '', rotulo: 'Não repete' },
  { valor: 'diaria', rotulo: 'Todo dia' },
  { valor: 'diasUteis', rotulo: 'Dias úteis (seg–sex)' },
  { valor: 'semanal', rotulo: 'Toda semana' },
  { valor: 'mensal', rotulo: 'Todo mês' },
  { valor: 'anual', rotulo: 'Todo ano' },
  { valor: 'custom', rotulo: 'Personalizado…' },
]

function presetDe(rec: RecorrenciaEvento | undefined, base: string): Preset {
  if (!rec) return ''
  const n = rec.intervalo ?? 1
  const simples = n === 1 && !rec.ate && !rec.ocorrencias
  if (simples && rec.tipo === 'diaria') return 'diaria'
  if (simples && rec.tipo === 'mensal') return 'mensal'
  if (simples && rec.tipo === 'anual') return 'anual'
  if (simples && rec.tipo === 'semanal') {
    const dd = [...(rec.dias ?? [])].sort((a, b) => a - b)
    if (dd.length === 5 && dd.every((d) => d >= 1 && d <= 5)) return 'diasUteis'
    if (dd.length <= 1 && (dd.length === 0 || dd[0] === getDay(parseISO(base)))) return 'semanal'
  }
  return 'custom'
}

const UNIDS: { tipo: TipoRecorrenciaEvento; rotulo: string }[] = [
  { tipo: 'diaria', rotulo: 'dias' },
  { tipo: 'semanal', rotulo: 'semanas' },
  { tipo: 'mensal', rotulo: 'meses' },
  { tipo: 'anual', rotulo: 'anos' },
]

export function EditorRecorrencia({
  recorrencia,
  dataBase,
  onChange,
}: {
  recorrencia?: RecorrenciaEvento
  dataBase: string
  onChange: (r?: RecorrenciaEvento) => void
}) {
  const rec = recorrencia
  const preset = presetDe(rec, dataBase)
  const wdBase = getDay(parseISO(dataBase))

  function aplicarPreset(p: Preset) {
    switch (p) {
      case '':
        return onChange(undefined)
      case 'diaria':
        return onChange({ tipo: 'diaria', intervalo: 1 })
      case 'diasUteis':
        return onChange({ tipo: 'semanal', intervalo: 1, dias: [1, 2, 3, 4, 5] })
      case 'semanal':
        return onChange({ tipo: 'semanal', intervalo: 1, dias: [wdBase] })
      case 'mensal':
        return onChange({ tipo: 'mensal', intervalo: 1 })
      case 'anual':
        return onChange({ tipo: 'anual', intervalo: 1 })
      case 'custom':
        return onChange(rec ?? { tipo: 'semanal', intervalo: 1, dias: [wdBase] })
    }
  }

  function mudar(m: Partial<RecorrenciaEvento>) {
    if (!rec) return
    onChange({ ...rec, ...m })
  }

  function trocarUnidade(tipo: TipoRecorrenciaEvento) {
    if (!rec) return
    if (tipo === 'semanal') onChange({ ...rec, tipo, dias: rec.dias?.length ? rec.dias : [wdBase] })
    else onChange({ ...rec, tipo, dias: undefined })
  }

  function toggleDia(d: number) {
    if (!rec) return
    const atual = rec.dias ?? []
    const novo = atual.includes(d) ? atual.filter((x) => x !== d) : [...atual, d]
    onChange({ ...rec, dias: novo.length ? novo : [wdBase] })
  }

  const termino: 'nunca' | 'data' | 'apos' = rec?.ocorrencias ? 'apos' : rec?.ate ? 'data' : 'nunca'

  return (
    <div className="flex flex-col gap-2">
      <select value={preset} onChange={(e) => aplicarPreset(e.target.value as Preset)} className="min-h-10 rounded-lg border border-line bg-surface px-3 text-[15px] outline-none focus:border-muted/60">
        {PRESETS.map((p) => (
          <option key={p.valor} value={p.valor}>
            {p.rotulo}
          </option>
        ))}
      </select>

      {rec && (
        <div className="flex flex-col gap-2.5 rounded-lg border border-line/70 bg-surface/40 p-2.5">
          <div className="flex items-center gap-2 text-[14px] text-muted">
            <span>A cada</span>
            <input
              type="number"
              min={1}
              max={99}
              value={rec.intervalo ?? 1}
              onChange={(e) => mudar({ intervalo: Math.max(1, Number(e.target.value) || 1) })}
              className={`${CAMPO} w-14 text-center`}
            />
            <select value={rec.tipo} onChange={(e) => trocarUnidade(e.target.value as TipoRecorrenciaEvento)} className={`${CAMPO} flex-1`}>
              {UNIDS.map((u) => (
                <option key={u.tipo} value={u.tipo}>
                  {u.rotulo}
                </option>
              ))}
            </select>
          </div>

          {rec.tipo === 'semanal' && (
            <div className="flex gap-1">
              {DIAS.map((d, i) => {
                const ativo = (rec.dias ?? []).includes(i)
                return (
                  <button
                    key={i}
                    onClick={() => toggleDia(i)}
                    className={`flex size-8 items-center justify-center rounded-full text-[12px] font-medium transition-colors ${ativo ? 'bg-ink text-surface' : 'bg-hover text-muted'}`}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted">Termina</span>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => mudar({ ate: undefined, ocorrencias: undefined })} className={`min-h-8 rounded-full px-3 text-[13px] font-medium ${termino === 'nunca' ? 'bg-ink text-surface' : 'bg-hover text-muted'}`}>
                Nunca
              </button>
              <button onClick={() => mudar({ ate: rec.ate ?? dataBase, ocorrencias: undefined })} className={`min-h-8 rounded-full px-3 text-[13px] font-medium ${termino === 'data' ? 'bg-ink text-surface' : 'bg-hover text-muted'}`}>
                Em uma data
              </button>
              <button onClick={() => mudar({ ocorrencias: rec.ocorrencias ?? 10, ate: undefined })} className={`min-h-8 rounded-full px-3 text-[13px] font-medium ${termino === 'apos' ? 'bg-ink text-surface' : 'bg-hover text-muted'}`}>
                Após N vezes
              </button>
            </div>
            {termino === 'data' && (
              <input type="date" min={dataBase} value={rec.ate ?? ''} onChange={(e) => mudar({ ate: e.target.value || undefined })} className={CAMPO} />
            )}
            {termino === 'apos' && (
              <label className="flex items-center gap-2 text-[14px] text-muted">
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={rec.ocorrencias ?? 10}
                  onChange={(e) => mudar({ ocorrencias: Math.max(1, Number(e.target.value) || 1) })}
                  className={`${CAMPO} w-16 text-center`}
                />
                ocorrências
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
