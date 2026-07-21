import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { SecaoDashboard } from '../../core/components/SecaoDashboard'
import { db } from '../../core/db/db'
import { hojeISO } from '../../core/dates'
import { emojiEspecie } from './db'

interface LinhaPet {
  id: string
  nome: string
  emoji: string
  pendentes: number
  total: number
}

/** Cuidados de hoje pendentes, por pet. */
export function SecaoHoje() {
  const linhas = useLiveQuery(async () => {
    const hoje = hojeISO()
    const dia = new Date().getDay()
    const pets = await db.pets.filter((p) => p.status !== 'arquivado').toArray()
    const out: LinhaPet[] = []
    for (const p of pets) {
      const cuidados = await db.petCuidados.where('petId').equals(p.id).toArray()
      const doDia = cuidados.filter((c) => c.ativo && (!c.dias || c.dias.length === 0 || c.dias.includes(dia)))
      if (doDia.length === 0) continue
      const regs = await db.petCuidadoRegistros.where('petId').equals(p.id).filter((r) => r.data === hoje && r.feito).toArray()
      const feitos = new Set(regs.map((r) => r.cuidadoId))
      const pendentes = doDia.filter((c) => !feitos.has(c.id)).length
      out.push({ id: p.id, nome: p.nome, emoji: p.emoji ?? emojiEspecie(p.especie), pendentes, total: doDia.length })
    }
    return out
  }, [])

  if (linhas === undefined) return null
  const comPendencia = linhas.filter((l) => l.pendentes > 0)
  if (comPendencia.length === 0) return null

  return (
    <SecaoDashboard titulo="Cuidados dos pets" contagem={comPendencia.reduce((s, l) => s + l.pendentes, 0)} verTodos="/pets">
      <div className="flex flex-col overflow-hidden rounded-2xl border border-line">
        {comPendencia.map((l, i) => (
          <Link
            key={l.id}
            to={`/pets/${l.id}`}
            className={`flex items-center gap-2.5 p-2.5 transition-colors hover:bg-hover/50 ${i > 0 ? 'border-t border-line' : ''}`}
          >
            <span className="text-[16px]" aria-hidden>{l.emoji}</span>
            <span className="flex-1 truncate text-[14px] font-medium">{l.nome}</span>
            <span className="text-[12px] text-muted">
              {l.total - l.pendentes}/{l.total} · <span className="font-medium text-accent">{l.pendentes} pendente{l.pendentes > 1 ? 's' : ''}</span>
            </span>
          </Link>
        ))}
      </div>
    </SecaoDashboard>
  )
}
