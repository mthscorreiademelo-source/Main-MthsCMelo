import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconMais, IconPata } from '../../core/components/Icons'
import { Avatar } from './components/Avatar'
import { EditorPet } from './components/EditorPet'
import { idadeLegivel, nomeEspecie, proximaVacina, semearPetsSePreciso } from './db'
import { usePets, useVacinas } from './hooks'
import type { Pet } from './types'

function LinhaCompromisso({ petId }: { petId: string }) {
  const vacinas = useVacinas(petId)
  const pv = vacinas ? proximaVacina(vacinas) : null
  if (!pv) return <span className="text-[12px] text-muted">Sem compromissos próximos</span>
  return (
    <span className="text-[12px] font-medium text-accent">
      Próxima vacina em {pv.dias} {pv.dias === 1 ? 'dia' : 'dias'}
    </span>
  )
}

function CartaoPet({ pet }: { pet: Pet }) {
  const idade = idadeLegivel(pet.nascimento)
  return (
    <Link
      to={`/pets/${pet.id}`}
      className="lume-entrada flex items-center gap-3.5 rounded-2xl border border-line bg-surface/50 p-4 transition-colors hover:border-muted/40"
    >
      <Avatar pet={pet} size={60} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[16px] font-semibold">{pet.nome}</h3>
          {pet.status === 'memoria' && <span className="rounded-full bg-hover px-1.5 py-0.5 text-[10px] text-muted">memória</span>}
        </div>
        <span className="truncate text-[12.5px] text-muted">
          {nomeEspecie(pet.especie)}
          {pet.raca ? ` · ${pet.raca}` : ''}
          {idade ? ` · ${idade}` : ''}
        </span>
        <LinhaCompromisso petId={pet.id} />
      </div>
    </Link>
  )
}

export function PetsPage() {
  const pets = usePets()
  const [criando, setCriando] = useState(false)

  useEffect(() => {
    semearPetsSePreciso()
  }, [])

  const ativos = (pets ?? []).filter((p) => p.status !== 'arquivado')

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <IconPata width={22} height={22} className="text-accent" />
          <h1 className="text-[22px] font-bold">Pets</h1>
          {pets && <span className="rounded-full bg-hover px-2 py-0.5 text-[12px] font-medium text-muted">{ativos.length}</span>}
        </div>
        <button
          onClick={() => setCriando(true)}
          className="flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[14px] font-medium text-surface"
        >
          <IconMais width={16} height={16} /> Novo pet
        </button>
      </div>

      {!pets ? (
        <p className="py-10 text-center text-[14px] text-muted">Carregando…</p>
      ) : ativos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line py-16 text-center">
          <IconPata width={40} height={40} className="text-muted/50" />
          <p className="text-[15px] font-medium">Nenhum pet por aqui ainda</p>
          <p className="max-w-xs text-[13px] text-muted">Cada animal ganha um workspace próprio, com saúde, vacinas, alimentação, gastos e muito mais.</p>
          <button onClick={() => setCriando(true)} className="mt-1 flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[14px] font-medium text-surface">
            <IconMais width={16} height={16} /> Adicionar o primeiro
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ativos.map((p) => (
            <CartaoPet key={p.id} pet={p} />
          ))}
        </div>
      )}

      {criando && <EditorPet onFechar={() => setCriando(false)} />}
    </div>
  )
}
