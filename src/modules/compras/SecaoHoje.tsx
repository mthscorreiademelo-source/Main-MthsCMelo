import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { SecaoDashboard } from '../../core/components/SecaoDashboard'
import { db } from '../../core/db/db'
import { catInfo, diasRestantes, statusValidade } from './db'
import type { ItemDespensa, MovDespensa } from './types'

interface Alerta {
  id: string
  nome: string
  icone: string
  motivo: string
}

/** No Hoje: só o que é pertinente — itens acabando ou vencendo. */
export function SecaoHoje() {
  const alertas = useLiveQuery(async () => {
    const itens = await db.despensa.toArray()
    if (itens.length === 0) return null
    const hist = await db.despensaHistorico.toArray()
    const mapa: Record<string, MovDespensa[]> = {}
    for (const m of hist) (mapa[m.despensaId] ??= []).push(m)
    const out: Alerta[] = []
    for (const i of itens as ItemDespensa[]) {
      const dias = i.monitorarIA === false ? null : diasRestantes(i, mapa[i.id] ?? [])
      const val = statusValidade(i)
      if (dias != null && dias <= 3) out.push({ id: i.id, nome: i.nome, icone: catInfo(i.categoria).icone, motivo: `~${dias} ${dias === 1 ? 'dia' : 'dias'}` })
      else if (i.nivelAprox === 'quase_vazio' && i.monitorarIA !== false) out.push({ id: i.id, nome: i.nome, icone: catInfo(i.categoria).icone, motivo: 'quase acabando' })
      else if (['vencido', 'hoje'].includes(val)) out.push({ id: i.id, nome: i.nome, icone: catInfo(i.categoria).icone, motivo: val === 'vencido' ? 'vencido' : 'vence hoje' })
    }
    return out.slice(0, 5)
  }, [])

  if (alertas === undefined || alertas === null || alertas.length === 0) return null

  return (
    <SecaoDashboard titulo="Provavelmente acabando" contagem={alertas.length} verTodos="/compras">
      <div className="flex flex-col overflow-hidden rounded-2xl border border-line">
        {alertas.map((a, i) => (
          <Link key={a.id} to={`/compras/despensa/${a.id}`} className={`flex items-center gap-2.5 p-2.5 transition-colors hover:bg-hover/50 ${i > 0 ? 'border-t border-line' : ''}`}>
            <span className="text-[15px]" aria-hidden>{a.icone}</span>
            <span className="flex-1 truncate text-[14px] font-medium">{a.nome}</span>
            <span className="text-[12px] text-muted">{a.motivo}</span>
          </Link>
        ))}
      </div>
    </SecaoDashboard>
  )
}
