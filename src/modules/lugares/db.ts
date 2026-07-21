import { nanoid } from 'nanoid'
import { db } from '../../core/db/db'
import type { Lugar, TipoLugar } from './types'

export const TIPOS_LUGAR: { valor: TipoLugar; nome: string; icone: string; listaSugerida?: string }[] = [
  { valor: 'mercado', nome: 'Mercado', icone: '🛒', listaSugerida: 'Mercado' },
  { valor: 'farmacia', nome: 'Farmácia', icone: '💊', listaSugerida: 'Farmácia' },
  { valor: 'petshop', nome: 'Pet Shop', icone: '🐾', listaSugerida: 'Pet Shop' },
  { valor: 'parque', nome: 'Parque', icone: '🌳' },
  { valor: 'clinica', nome: 'Clínica', icone: '🏥' },
  { valor: 'restaurante', nome: 'Restaurante', icone: '🍽️' },
  { valor: 'trabalho', nome: 'Trabalho', icone: '💼' },
  { valor: 'casa', nome: 'Casa', icone: '🏠' },
  { valor: 'outro', nome: 'Outro', icone: '📍' },
]

export function tipoInfo(t: TipoLugar) {
  return TIPOS_LUGAR.find((x) => x.valor === t) ?? TIPOS_LUGAR[TIPOS_LUGAR.length - 1]
}

export async function criarLugar(dados: Partial<Lugar> & { nome: string; tipo: TipoLugar }): Promise<string> {
  const id = dados.id ?? nanoid()
  const max = await db.lugares.orderBy('ordem').last()
  await db.lugares.add({
    id,
    nome: dados.nome.trim(),
    tipo: dados.tipo,
    endereco: dados.endereco,
    lat: dados.lat,
    lng: dados.lng,
    listaId: dados.listaId,
    petId: dados.petId,
    obs: dados.obs,
    favorito: dados.favorito,
    ordem: dados.ordem ?? (max ? max.ordem + 1 : 0),
    criadoEm: Date.now(),
  })
  return id
}
export const atualizarLugar = (id: string, m: Partial<Lugar>) => db.lugares.update(id, m)
export const excluirLugar = (id: string) => db.lugares.delete(id)
