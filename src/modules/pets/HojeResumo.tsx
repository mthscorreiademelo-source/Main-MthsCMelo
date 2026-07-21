import { useLiveQuery } from 'dexie-react-hooks'
import { TileResumo } from '../../core/components/TileResumo'
import { IconPata } from '../../core/components/Icons'
import { db } from '../../core/db/db'
import { hojeISO } from '../../core/dates'

/** Mini-tile: total de cuidados pendentes hoje entre todos os pets. */
export function HojeResumo() {
  const pendentes = useLiveQuery(async () => {
    const hoje = hojeISO()
    const dia = new Date().getDay()
    const pets = await db.pets.filter((p) => p.status !== 'arquivado').toArray()
    if (pets.length === 0) return null
    let total = 0
    for (const p of pets) {
      const cuidados = await db.petCuidados.where('petId').equals(p.id).toArray()
      const doDia = cuidados.filter((c) => c.ativo && (!c.dias || c.dias.length === 0 || c.dias.includes(dia)))
      if (doDia.length === 0) continue
      const regs = await db.petCuidadoRegistros.where('petId').equals(p.id).filter((r) => r.data === hoje && r.feito).toArray()
      const feitos = new Set(regs.map((r) => r.cuidadoId))
      total += doDia.filter((c) => !feitos.has(c.id)).length
    }
    return total
  }, [])

  if (pendentes === undefined || pendentes === null || pendentes === 0) return null

  return (
    <TileResumo
      to="/pets"
      cor="#4073ff"
      icone={<IconPata width={18} height={18} style={{ color: '#4073ff' }} />}
      valor={pendentes}
      rotulo={pendentes === 1 ? 'cuidado pet' : 'cuidados pets'}
    />
  )
}
