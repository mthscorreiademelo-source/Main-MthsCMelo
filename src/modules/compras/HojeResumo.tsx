import { useLiveQuery } from 'dexie-react-hooks'
import { TileResumo } from '../../core/components/TileResumo'
import { IconCarrinho } from '../../core/components/Icons'
import { db } from '../../core/db/db'
import { diasRestantes } from './db'
import type { MovDespensa } from './types'

/** Mini-tile: quantos itens provavelmente estão acabando. */
export function HojeResumo() {
  const total = useLiveQuery(async () => {
    const itens = await db.despensa.toArray()
    if (itens.length === 0) return null
    const hist = await db.despensaHistorico.toArray()
    const mapa: Record<string, MovDespensa[]> = {}
    for (const m of hist) (mapa[m.despensaId] ??= []).push(m)
    let n = 0
    for (const i of itens) {
      if (i.monitorarIA === false) continue
      const d = diasRestantes(i, mapa[i.id] ?? [])
      if ((d != null && d <= 5) || i.nivelAprox === 'pouco' || i.nivelAprox === 'quase_vazio') n++
    }
    return n
  }, [])

  if (total === undefined || total === null || total === 0) return null
  return (
    <TileResumo
      to="/compras"
      cor="#eb8909"
      icone={<IconCarrinho width={18} height={18} style={{ color: '#eb8909' }} />}
      valor={total}
      rotulo={total === 1 ? 'item acabando' : 'itens acabando'}
    />
  )
}
