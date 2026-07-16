import { TileResumo } from '../../core/components/TileResumo'
import { IconCalendario } from '../../core/components/Icons'
import { hojeISO } from '../../core/dates'
import { eventosDoDia, paraMin } from './db'
import { useEventos } from './hooks'

/** Tile do cockpit: próximo evento de hoje (ou contagem). */
export function HojeResumo() {
  const eventos = useEventos()
  if (eventos === undefined) return null
  const doDia = eventosDoDia(eventos, hojeISO())
  if (doDia.length === 0) return null

  const d = new Date()
  const agora = d.getHours() * 60 + d.getMinutes()
  const proximo =
    doDia.find((e) => !e.diaInteiro && paraMin(e.fim) >= agora) ?? doDia[0]

  return (
    <TileResumo
      to="/agenda"
      cor={proximo.cor ?? '#4073ff'}
      icone={<IconCalendario width={18} height={18} />}
      valor={proximo.diaInteiro ? proximo.titulo : proximo.inicio}
      rotulo={proximo.diaInteiro ? 'Hoje' : `Próximo · ${proximo.titulo}`}
    />
  )
}
