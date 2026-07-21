import { useRef } from 'react'
import { IconMais } from '../../../core/components/Icons'
import { CartaoModulo, Vazio, type ControleCartao } from './CartaoModulo'
import { adicionarFoto, removerFoto } from '../db'
import { useBlobUrl, useFotos } from '../hooks'
import type { Pet } from '../types'

function Thumb({ fotoId, onRemover }: { fotoId: string; onRemover: () => void }) {
  const url = useBlobUrl(fotoId)
  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl bg-hover">
      {url && <img src={url} alt="" className="size-full object-cover" />}
      <button
        onClick={onRemover}
        className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/45 text-[13px] text-white opacity-0 transition-opacity group-hover:opacity-100"
        title="Remover"
      >
        ×
      </button>
    </div>
  )
}

export function CardFotos({ pet, controle }: { pet: Pet; controle: ControleCartao }) {
  const fotos = useFotos(pet.id)
  const ref = useRef<HTMLInputElement>(null)

  async function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    for (const f of files) await adicionarFoto(pet.id, f)
    e.target.value = ''
  }

  const ord = [...(fotos ?? [])].sort((a, b) => b.criadoEm - a.criadoEm)

  return (
    <CartaoModulo
      titulo="Fotos"
      emoji="📸"
      acao={
        <button onClick={() => ref.current?.click()} className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink" title="Adicionar fotos">
          <IconMais width={16} height={16} />
        </button>
      }
      {...controle}
    >
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={subir} />
      {ord.length === 0 ? (
        <Vazio>Nenhuma foto ainda. Toque em + para montar o álbum.</Vazio>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {ord.map((f) => (
            <Thumb key={f.id} fotoId={f.id} onRemover={() => removerFoto(f.id)} />
          ))}
        </div>
      )}
    </CartaoModulo>
  )
}
