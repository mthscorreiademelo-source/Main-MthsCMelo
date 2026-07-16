import { TileResumo } from '../../core/components/TileResumo'
import { hojeISO } from '../../core/dates'
import { RostoHumor } from './components/RostoHumor'
import { humorDe, mediaNivel, registrosDoDia } from './humor'
import { useHumorTipos, useRegistros } from './hooks'
import type { HumorTipo } from './types'

/** Tile do cockpit: humor de hoje (se já registrado). */
export function HojeResumo() {
  const registros = useRegistros()
  const tipos = useHumorTipos()
  if (registros === undefined) return null
  const doDia = registrosDoDia(registros, hojeISO())
  if (doDia.length === 0) return null
  const tipo = humorDe(tipos, Math.round(mediaNivel(doDia)) as HumorTipo['nivel'])
  if (!tipo) return null
  return (
    <TileResumo
      to="/humor"
      cor={tipo.cor}
      icone={<RostoHumor nivel={tipo.nivel} width={20} height={20} style={{ color: tipo.cor }} />}
      valor={tipo.nome}
      rotulo="Humor de hoje"
    />
  )
}
