import { useState } from 'react'
import { IconCheck, IconMais } from '../../../core/components/Icons'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { hojeISO } from '../../../core/dates'
import { CartaoModulo, Vazio, type ControleCartao } from './CartaoModulo'
import { alternarCuidado, criarCuidado, removerCuidado } from '../db'
import { useCuidadoRegistros, useCuidados } from '../hooks'
import type { Pet } from '../types'

const EMOJIS = ['🍖', '💧', '🦮', '💊', '🪥', '🧴', '🧹', '🌾', '🌿', '🐟', '🌡️', '❤️']

export function CardCuidados({ pet, controle }: { pet: Pet; controle: ControleCartao }) {
  const hoje = hojeISO()
  const diaSemana = new Date().getDay()
  const cuidados = useCuidados(pet.id)
  const registros = useCuidadoRegistros(pet.id, hoje)
  const [add, setAdd] = useState(false)
  const [nome, setNome] = useState('')
  const [icone, setIcone] = useState(EMOJIS[0])

  const feitos = new Set((registros ?? []).filter((r) => r.feito).map((r) => r.cuidadoId))
  const doDia = (cuidados ?? []).filter((c) => c.ativo && (!c.dias || c.dias.length === 0 || c.dias.includes(diaSemana)))
  const nFeitos = doDia.filter((c) => feitos.has(c.id)).length

  async function salvar() {
    if (!nome.trim()) return
    await criarCuidado({ petId: pet.id, nome: nome.trim(), icone })
    setNome('')
    setIcone(EMOJIS[0])
    setAdd(false)
  }

  return (
    <CartaoModulo
      titulo="Cuidados de hoje"
      emoji="✅"
      acao={
        <button onClick={() => setAdd(true)} className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink" title="Adicionar cuidado">
          <IconMais width={16} height={16} />
        </button>
      }
      {...controle}
    >
      {doDia.length > 0 && (
        <div className="mb-2 text-[12px] text-muted">
          {nFeitos} de {doDia.length} concluídos hoje
        </div>
      )}
      {doDia.length === 0 ? (
        <Vazio>Nenhum cuidado para hoje. Toque em + para adicionar.</Vazio>
      ) : (
        <ul className="flex flex-col gap-1">
          {doDia.map((c) => {
            const ok = feitos.has(c.id)
            return (
              <li key={c.id} className="group flex items-center gap-2.5">
                <button
                  onClick={() => alternarCuidado(pet.id, c.id, hoje)}
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    ok ? 'border-accent bg-accent text-surface' : 'border-line text-transparent hover:border-muted'
                  }`}
                >
                  <IconCheck width={13} height={13} />
                </button>
                <span className="text-[14px]" aria-hidden>{c.icone}</span>
                <span className={`flex-1 text-[14px] ${ok ? 'text-muted line-through' : ''}`}>{c.nome}</span>
                {c.horario && <span className="text-[11px] tabular-nums text-muted">{c.horario}</span>}
                <button
                  onClick={() => removerCuidado(c.id)}
                  className="text-[16px] leading-none text-muted hover:text-danger"
                  title="Remover"
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {add && (
        <FolhaInferior titulo="Novo cuidado" onFechar={() => setAdd(false)}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setIcone(e)}
                  className={`flex size-9 items-center justify-center rounded-full text-[17px] transition-colors ${icone === e ? 'bg-ink' : 'bg-hover'}`}
                >
                  {e}
                </button>
              ))}
            </div>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Escovar o pelo"
              autoFocus
              className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-muted/50"
            />
            <button onClick={salvar} disabled={!nome.trim()} className="min-h-11 rounded-xl bg-ink text-[14px] font-semibold text-surface disabled:opacity-40">
              Adicionar
            </button>
          </div>
        </FolhaInferior>
      )}
    </CartaoModulo>
  )
}
