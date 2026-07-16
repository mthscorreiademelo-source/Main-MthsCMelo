import { useState } from 'react'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { IconLixeira } from '../../../core/components/Icons'
import { IconeFator } from '../../../core/components/icones'
import { rotuloData, hojeISO } from '../../../core/dates'
import { excluirDia, METRICAS, salvarDia } from '../db'
import type { MetricaSaude, SaudeDia } from '../types'

/** Texto inicial de um campo (sono em horas; demais crus). */
function textoInicial(chave: MetricaSaude, dia?: SaudeDia): string {
  const v = dia?.[chave]
  if (v == null) return ''
  return chave === 'sonoMin' ? String(v / 60) : String(v)
}

export function EditorDia({
  data,
  dia,
  onFechar,
}: {
  data: string
  dia?: SaudeDia
  onFechar: () => void
}) {
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(METRICAS.map((m) => [m.chave, textoInicial(m.chave, dia)])),
  )
  const [confirmando, setConfirmando] = useState(false)

  async function salvar() {
    const mudancas: Partial<SaudeDia> = {}
    for (const m of METRICAS) {
      const txt = valores[m.chave]?.trim()
      if (!txt) {
        mudancas[m.chave] = undefined
        continue
      }
      const v = m.daEntrada ? m.daEntrada(txt) : Number(txt.replace(',', '.'))
      mudancas[m.chave] = Number.isFinite(v as number) ? (v as number) : undefined
    }
    await salvarDia(data, mudancas)
    onFechar()
  }

  async function apagar() {
    if (!confirmando) {
      setConfirmando(true)
      return
    }
    await excluirDia(data)
    onFechar()
  }

  const titulo = data === hojeISO() ? 'Hoje' : rotuloData(data)

  return (
    <FolhaInferior titulo={titulo} onFechar={onFechar}>
      <div className="flex flex-col gap-3">
        {METRICAS.map((m) => (
          <label key={m.chave} className="flex items-center gap-3">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${m.cor}22` }}
            >
              <IconeFator nome={m.icone} width={18} height={18} style={{ color: m.cor }} />
            </span>
            <span className="flex-1 text-[14px]">{m.nome}</span>
            <input
              inputMode="decimal"
              value={valores[m.chave]}
              onChange={(e) => setValores((v) => ({ ...v, [m.chave]: e.target.value }))}
              placeholder="—"
              className="w-24 rounded-xl border border-line bg-surface/60 px-3 py-2 text-right text-[15px] outline-none transition-colors focus:border-muted/50 placeholder:text-muted/50"
            />
            <span className="w-9 text-[12px] text-muted">{m.unidade}</span>
          </label>
        ))}
      </div>

      <button
        onClick={salvar}
        className="mt-1 flex min-h-12 cursor-pointer items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-bg"
      >
        Salvar
      </button>

      {dia && (
        <button
          onClick={apagar}
          className={`flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full border text-[14px] font-medium transition-colors ${
            confirmando ? 'border-danger bg-danger/10 text-danger' : 'border-line text-muted'
          }`}
        >
          <IconLixeira width={16} height={16} />
          {confirmando ? 'Confirmar exclusão' : 'Excluir dia'}
        </button>
      )}
    </FolhaInferior>
  )
}
