import { IconChevron } from '../../../core/components/Icons'
import { IconeFator } from '../../../core/components/icones'
import { devidoNoDia } from '../freq'
import { estaCompleto } from '../progresso'
import type { Habito, HabitoRegistro } from '../types'
import { CartaoHabito } from './CartaoHabito'

export function CategoriaSecao({
  nome,
  cor,
  icone,
  recolhida,
  habitos,
  registros,
  data,
  onToggle,
  onEditar,
}: {
  nome: string
  cor?: string
  icone?: string
  recolhida: boolean
  habitos: Habito[]
  registros: Map<string, HabitoRegistro>
  data: string
  onToggle: () => void
  onEditar: (h: Habito) => void
}) {
  if (habitos.length === 0) return null
  const c = cor ?? 'var(--vida-muted)'
  const devidos = habitos.filter((h) => devidoNoDia(h, data))
  const feitos = devidos.filter((h) => estaCompleto(h, registros.get(h.id))).length

  return (
    <section className="flex flex-col gap-2">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-hover"
      >
        <IconChevron
          width={16}
          height={16}
          className="text-muted transition-transform"
          style={{ transform: recolhida ? 'rotate(-90deg)' : 'none' }}
        />
        <span
          className="flex size-6 items-center justify-center rounded-md"
          style={{ backgroundColor: `${c}1f`, color: c }}
        >
          <IconeFator nome={icone} width={14} height={14} />
        </span>
        <span className="text-[14px] font-semibold">{nome}</span>
        <span className="text-[12px] text-muted">
          {devidos.length > 0 ? `${feitos}/${devidos.length}` : habitos.length}
        </span>
      </button>

      {!recolhida && (
        <div className="flex flex-col gap-2 pl-1">
          {habitos.map((h) => (
            <CartaoHabito
              key={h.id}
              habito={h}
              registro={registros.get(h.id)}
              data={data}
              onEditar={onEditar}
            />
          ))}
        </div>
      )}
    </section>
  )
}
