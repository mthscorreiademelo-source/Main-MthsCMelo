import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/db'
import type { Movimento } from '../financas/types'
import type { Evento } from '../agenda/types'
import type {
  Pet,
  PetAlimento,
  PetCondicao,
  PetConsulta,
  PetCuidado,
  PetCuidadoRegistro,
  PetDocumento,
  PetFoto,
  PetItem,
  PetMedicamento,
  PetPeso,
  PetVacina,
} from './types'

export function usePets(): Pet[] | undefined {
  return useLiveQuery(() => db.pets.orderBy('ordem').toArray(), [])
}
export function usePet(id: string | undefined): Pet | undefined {
  return useLiveQuery(() => (id ? db.pets.get(id) : undefined), [id])
}

type TabelaPorPet = {
  where: (k: string) => { equals: (v: string) => { toArray: () => Promise<unknown[]> } }
}
function usePorPet<T>(tabela: string, petId: string | undefined): T[] | undefined {
  return useLiveQuery(
    () =>
      petId
        ? ((db as unknown as Record<string, TabelaPorPet>)[tabela].where('petId').equals(petId).toArray() as Promise<T[]>)
        : Promise.resolve([] as T[]),
    [petId],
  )
}

export const usePesos = (petId?: string) => usePorPet<PetPeso>('petPesos', petId)
export const useVacinas = (petId?: string) => usePorPet<PetVacina>('petVacinas', petId)
export const useConsultas = (petId?: string) => usePorPet<PetConsulta>('petConsultas', petId)
export const useCondicoes = (petId?: string) => usePorPet<PetCondicao>('petCondicoes', petId)
export const useMedicamentos = (petId?: string) => usePorPet<PetMedicamento>('petMedicamentos', petId)
export const useAlimentos = (petId?: string) => usePorPet<PetAlimento>('petAlimentos', petId)
export const useItens = (petId?: string) => usePorPet<PetItem>('petItens', petId)
export const useFotos = (petId?: string) => usePorPet<PetFoto>('petFotos', petId)
export const useDocumentos = (petId?: string) => usePorPet<PetDocumento>('petDocumentos', petId)

export function useCuidados(petId?: string): PetCuidado[] | undefined {
  return useLiveQuery(
    () => (petId ? db.petCuidados.where('petId').equals(petId).sortBy('ordem') : []),
    [petId],
  )
}

export function useCuidadoRegistros(petId: string | undefined, data: string): PetCuidadoRegistro[] | undefined {
  return useLiveQuery(
    () => (petId ? db.petCuidadoRegistros.where('petId').equals(petId).filter((r) => r.data === data).toArray() : []),
    [petId, data],
  )
}

/** Gastos do pet = movimentos de Finanças com petId (fonte única). */
export function useGastosPet(petId?: string): Movimento[] | undefined {
  return useLiveQuery(() => (petId ? db.movimentos.filter((m) => m.petId === petId).toArray() : []), [petId])
}

/** Eventos da Agenda vinculados ao pet (compromissos). */
export function useEventosPet(petId?: string): Evento[] | undefined {
  return useLiveQuery(() => (petId ? db.eventos.filter((e) => e.petId === petId).toArray() : []), [petId])
}

/** Object URL de um blob em petArquivos (revoga ao trocar/desmontar). */
export function useBlobUrl(id?: string): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined)
  useEffect(() => {
    if (!id) {
      setUrl(undefined)
      return
    }
    let vivo = true
    let atual: string | undefined
    db.petArquivos.get(id).then((a) => {
      if (!vivo || !a) return
      atual = URL.createObjectURL(a.blob)
      setUrl(atual)
    })
    return () => {
      vivo = false
      if (atual) URL.revokeObjectURL(atual)
    }
  }, [id])
  return url
}
