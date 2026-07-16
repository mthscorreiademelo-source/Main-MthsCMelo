import { TileResumo } from '../../core/components/TileResumo'
import { hojeISO } from '../../core/dates'
import { AnelProgresso } from './components/AnelProgresso'
import { useHabitos, useRegistros } from './hooks'
import { resumoDoDia } from './progresso'

/** Tile do cockpit: progresso de hábitos do dia. */
export function HojeResumo() {
  const habitos = useHabitos()
  const registros = useRegistros()
  if (!habitos || !registros) return null
  const ativos = habitos.filter((h) => !h.arquivado)
  const resumo = resumoDoDia(ativos, registros, hojeISO())
  if (resumo.total === 0) return null
  const pct = Math.round(resumo.fracao * 100)
  return (
    <TileResumo
      to="/habitos"
      icone={
        <AnelProgresso fracao={resumo.fracao} tamanho={30} espessura={4} cor="var(--vida-accent)">
          <span className="text-[9px] font-bold tabular-nums">{pct}</span>
        </AnelProgresso>
      }
      valor={`${resumo.feitos}/${resumo.total}`}
      rotulo="Hábitos hoje"
    />
  )
}
