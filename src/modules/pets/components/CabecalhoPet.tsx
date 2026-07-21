import { useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { IconLapis } from '../../../core/components/Icons'
import { RecorteImagem } from '../../../core/components/RecorteImagem'
import { Avatar } from './Avatar'
import { EditorPet } from './EditorPet'
import { atualizarPet, guardarPetArquivo, idadeLegivel, nomeEspecie, pesoAtual, proximaVacina, ultimaConsulta } from '../db'
import { useBlobUrl, useConsultas, usePesos, useVacinas } from '../hooks'
import type { Pet } from '../types'

/** Converte um dataURL em Blob sem usar fetch (evita restrições de CSP). */
function dataUrlParaBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',')
  const mime = meta.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

function Indicador({ emoji, rotulo, valor }: { emoji: string; rotulo: string; valor: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-surface/70 px-3 py-2">
      <span className="text-[15px]" aria-hidden>{emoji}</span>
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-wide text-muted">{rotulo}</span>
        <span className="text-[13px] font-semibold">{valor}</span>
      </div>
    </div>
  )
}

export function CabecalhoPet({ pet }: { pet: Pet }) {
  const pesos = usePesos(pet.id)
  const vacinas = useVacinas(pet.id)
  const consultas = useConsultas(pet.id)
  const capaUrl = useBlobUrl(pet.capaId)
  const [editando, setEditando] = useState(false)
  const fotoRef = useRef<HTMLInputElement>(null)
  const capaRef = useRef<HTMLInputElement>(null)
  const [recorte, setRecorte] = useState<{ arquivo: File; campo: 'fotoId' | 'capaId' } | null>(null)

  const idade = idadeLegivel(pet.nascimento)
  const peso = pesos ? pesoAtual(pesos) : null
  const pv = vacinas ? proximaVacina(vacinas) : null
  const uc = consultas ? ultimaConsulta(consultas) : null
  const sexoRotulo = pet.sexo === 'macho' ? 'Macho ♂' : pet.sexo === 'femea' ? 'Fêmea ♀' : null

  function escolher(e: React.ChangeEvent<HTMLInputElement>, campo: 'fotoId' | 'capaId') {
    const file = e.target.files?.[0]
    if (file) setRecorte({ arquivo: file, campo })
    e.target.value = ''
  }

  async function salvarRecorte(dataUrl: string) {
    if (!recorte) return
    const blob = dataUrlParaBlob(dataUrl)
    const id = await guardarPetArquivo(blob, `${recorte.campo}.jpg`, blob.type || 'image/jpeg')
    await atualizarPet(pet.id, { [recorte.campo]: id })
    setRecorte(null)
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface/50">
      {/* Capa */}
      <div
        className="relative h-28 bg-gradient-to-br from-accent/25 to-accent/5 sm:h-32"
        style={capaUrl ? { backgroundImage: `url(${capaUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        <button
          onClick={() => capaRef.current?.click()}
          className="absolute right-3 top-3 rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur hover:bg-black/45"
        >
          Capa
        </button>
        <input ref={capaRef} type="file" accept="image/*" className="hidden" onChange={(e) => escolher(e, 'capaId')} />
      </div>

      <div className="px-4 pb-4">
        <div className="-mt-8 flex items-end gap-3">
          <button onClick={() => fotoRef.current?.click()} className="relative rounded-full ring-4 ring-surface" title="Trocar foto">
            <Avatar pet={pet} size={72} />
            <span className="absolute bottom-0 right-0 flex size-6 items-center justify-center rounded-full border-2 border-surface bg-ink text-surface">
              <IconLapis width={11} height={11} />
            </span>
          </button>
          <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={(e) => escolher(e, 'fotoId')} />
          <div className="mb-1 flex min-w-0 flex-1 items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="truncate text-[20px] font-bold leading-tight">{pet.nome}</h1>
              <p className="truncate text-[12.5px] text-muted">
                {nomeEspecie(pet.especie)}
                {pet.raca ? ` · ${pet.raca}` : ''}
                {idade ? ` · ${idade}` : ''}
                {sexoRotulo ? ` · ${sexoRotulo}` : ''}
              </p>
            </div>
            <button
              onClick={() => setEditando(true)}
              className="flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] font-medium text-muted hover:text-ink"
            >
              <IconLapis width={14} height={14} /> Editar
            </button>
          </div>
        </div>

        {/* Indicadores rápidos */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Indicador emoji="⚖️" rotulo="Peso atual" valor={peso ? `${peso.kg} kg` : '—'} />
          <Indicador emoji="💉" rotulo="Próxima vacina" valor={pv ? `${pv.dias} ${pv.dias === 1 ? 'dia' : 'dias'}` : '—'} />
          <Indicador
            emoji="🩺"
            rotulo="Última consulta"
            valor={uc ? format(parseISO(uc.data), "d 'de' MMM", { locale: ptBR }) : '—'}
          />
        </div>
      </div>

      {editando && <EditorPet pet={pet} onFechar={() => setEditando(false)} />}
      {recorte && (
        <RecorteImagem
          arquivo={recorte.arquivo}
          aspecto={recorte.campo === 'fotoId' ? 1 : 40 / 13}
          redondo={recorte.campo === 'fotoId'}
          saidaLargura={recorte.campo === 'fotoId' ? 512 : 1200}
          onConfirmar={salvarRecorte}
          onCancelar={() => setRecorte(null)}
        />
      )}
    </section>
  )
}
