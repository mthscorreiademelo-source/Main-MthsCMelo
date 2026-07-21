import { Link } from 'react-router-dom'
import { IconCheck } from '../../../core/components/Icons'
import { hojeISO } from '../../../core/dates'
import { ajustarValor, cicloSimNao } from '../../habitos/db'
import { useHabitos, useRegistros } from '../../habitos/hooks'
import { estaCompleto, metaHabito, valorDoDia } from '../../habitos/progresso'
import type { Habito, HabitoRegistro } from '../../habitos/types'
import { CartaoModulo, Vazio, type ControleCartao } from './CartaoModulo'
import type { Pet } from '../types'

/** Hábitos vinculados a este pet (ex.: passear com o cachorro) — feito hoje? */
export function CardHabitos({ pet, controle }: { pet: Pet; controle: ControleCartao }) {
  const hoje = hojeISO()
  const habitos = useHabitos()
  const registros = useRegistros()

  const doPet = (habitos ?? []).filter((h) => h.vinculoPetId === pet.id && !h.arquivado)
  const regHoje = new Map<string, HabitoRegistro>()
  for (const r of registros ?? []) if (r.data === hoje) regHoje.set(r.habitoId, r)

  const feitos = doPet.filter((h) => estaCompleto(h, regHoje.get(h.id))).length

  function medido(h: Habito): boolean {
    return h.tipo !== 'sim_nao' && h.tipo !== 'checklist'
  }

  return (
    <CartaoModulo titulo="Rotina do pet" emoji="🦮" {...controle}>
      {doPet.length === 0 ? (
        <Vazio>
          Nenhum hábito ligado a {pet.nome}. Em Hábitos, edite um hábito (ex.: “passear”) e vincule a este pet para acompanhar por aqui.
        </Vazio>
      ) : (
        <>
          <div className="mb-2 text-[12px] text-muted">{feitos} de {doPet.length} feitos hoje</div>
          <ul className="flex flex-col gap-1">
            {doPet.map((h) => {
              const reg = regHoje.get(h.id)
              const ok = estaCompleto(h, reg)
              const val = valorDoDia(h, reg)
              const meta = metaHabito(h)
              return (
                <li key={h.id} className="flex items-center gap-2.5">
                  <button
                    onClick={() => (medido(h) ? ajustarValor(h, hoje, h.passo ?? 1) : cicloSimNao(h.id, hoje))}
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      ok ? 'border-accent bg-accent text-surface' : 'border-line text-transparent hover:border-muted'
                    }`}
                    title={medido(h) ? 'Registrar' : 'Marcar feito'}
                  >
                    <IconCheck width={13} height={13} />
                  </button>
                  <span className="text-[14px]" aria-hidden>{h.icone ?? '🔁'}</span>
                  <span className={`flex-1 truncate text-[14px] ${ok ? 'text-muted line-through' : ''}`}>{h.nome}</span>
                  {medido(h) && (
                    <span className="text-[11px] tabular-nums text-muted">
                      {val}{meta ? `/${meta}` : ''} {h.unidade ?? ''}
                    </span>
                  )}
                  {h.horario && !medido(h) && <span className="text-[11px] tabular-nums text-muted">{h.horario}</span>}
                </li>
              )
            })}
          </ul>
          <Link to="/habitos" className="mt-2 inline-block text-[12px] font-medium text-accent">Abrir Hábitos →</Link>
        </>
      )}
    </CartaoModulo>
  )
}
