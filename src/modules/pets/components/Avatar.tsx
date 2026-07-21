import { useBlobUrl } from '../hooks'
import { emojiEspecie } from '../db'
import type { Pet } from '../types'

/** Foto do pet (blob) com fallback para o emoji da espécie. */
export function Avatar({ pet, size = 56, className = '' }: { pet: Pet; size?: number; className?: string }) {
  const url = useBlobUrl(pet.fotoId)
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-hover ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {url ? (
        <img src={url} alt={pet.nome} className="size-full object-cover" />
      ) : (
        <span aria-hidden>{pet.emoji ?? emojiEspecie(pet.especie)}</span>
      )}
    </div>
  )
}
