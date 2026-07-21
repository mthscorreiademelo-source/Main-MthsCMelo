import { useMemo } from 'react'
import { IconeFator } from '../../core/components/icones'
import { hojeISO } from '../../core/dates'
import { mostrarToast } from '../../core/captura/store'
import { definirEstadoSimNao, definirValor } from './db'
import { devidoNoDia } from './freq'
import { useHabitos, useRegistros } from './hooks'
import { estadoDia, registrosDoDia } from './progresso'
import type { Habito } from './types'

/** Completador rápido de hábitos — usado na Captura Rápida (Quick Actions). */
export function CompletarRapido({ aoConcluir }: { aoConcluir: () => void }) {
  const habitos = useHabitos()
  const registros = useRegistros()
  const hoje = hojeISO()

  const regsDia = useMemo(() => registrosDoDia(registros ?? [], hoje), [registros, hoje])
  const pendentes = useMemo(
    () => (habitos ?? [])
      .filter((h) => !h.arquivado && h.tipo !== 'checklist' && devidoNoDia(h, hoje) && estadoDia(h, regsDia.get(h.id)) !== 'feito')
      .slice(0, 12),
    [habitos, regsDia, hoje],
  )

  async function concluir(h: Habito) {
    if (h.tipo === 'sim_nao') await definirEstadoSimNao(h.id, hoje, 'feito')
    else await definirValor(h, hoje, h.meta ?? 1)
    mostrarToast(`${h.nome} concluído`)
    aoConcluir()
  }

  if (pendentes.length === 0) {
    return <p className="py-8 text-center text-[13px] text-muted">Tudo em dia por aqui. 🌿</p>
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {pendentes.map((h) => (
        <li key={h.id}>
          <button onClick={() => concluir(h)} className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left hover:bg-hover/50">
            <span className="flex size-8 items-center justify-center rounded-lg" style={{ color: h.cor ?? 'var(--vida-ink)' }}><IconeFator nome={h.icone} width={16} height={16} /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium">{h.nome}</span>
              {h.horario && <span className="block text-[11.5px] text-muted">{h.horario}</span>}
            </span>
            <span className="shrink-0 text-[13px] text-accent">Concluir</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
