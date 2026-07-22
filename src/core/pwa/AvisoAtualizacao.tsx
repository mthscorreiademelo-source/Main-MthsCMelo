import { useState } from 'react'
import { aplicarAtualizacao, usePrecisaAtualizar } from './atualizacao'

/** Aviso discreto de "nova versão disponível" — o usuário escolhe quando aplicar. */
export function AvisoAtualizacao() {
  const precisa = usePrecisaAtualizar()
  const [dispensado, setDispensado] = useState(false)
  if (!precisa || dispensado) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-2xl">
        <span className="text-[18px]">✨</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-ink">Nova versão disponível</p>
          <p className="text-[12px] text-muted">Atualize quando quiser — seu trabalho não se perde.</p>
        </div>
        <button
          onClick={() => setDispensado(true)}
          className="shrink-0 rounded-full px-2.5 py-1.5 text-[12.5px] text-muted hover:text-ink"
        >
          Depois
        </button>
        <button
          onClick={aplicarAtualizacao}
          className="shrink-0 rounded-full bg-ink px-3.5 py-1.5 text-[12.5px] font-semibold text-surface hover:opacity-90"
        >
          Atualizar
        </button>
      </div>
    </div>
  )
}
