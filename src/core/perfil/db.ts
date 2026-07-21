import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { obterCliente } from '../nuvem/cliente'
import type { Perfil } from './types'

const ID = 'default'

/** Perfil do usuário (undefined enquanto carrega; null-ish se ainda não criado). */
export function usePerfil(): Perfil | undefined {
  return useLiveQuery(() => db.perfil.get(ID))
}

/** Salva/mescla o perfil local e espelha o nome no metadata da conta (Supabase). */
export async function salvarPerfil(mudancas: Partial<Perfil>) {
  const atual = (await db.perfil.get(ID)) ?? { id: ID }
  const novo: Perfil = { ...atual, ...mudancas, id: ID }
  await db.perfil.put(novo)

  // Espelha nome/apelido no metadata da conta (string curta — cabe no JWT).
  // A foto NÃO vai para o metadata (ficaria grande demais); mora só no perfil.
  if ('nome' in mudancas || 'apelido' in mudancas) {
    try {
      const cliente = await obterCliente()
      await cliente?.auth.updateUser({
        data: { full_name: novo.nome ?? '', apelido: novo.apelido ?? '' },
      })
    } catch {
      /* offline ou sem nuvem: tudo bem, fica só local e sincroniza depois */
    }
  }
}

const LADO = 256

/** Lê uma imagem, recorta quadrado ao centro e reduz para ~256px (dataURL). */
export async function processarFotoPerfil(arquivo: File): Promise<string> {
  const url = URL.createObjectURL(arquivo)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Imagem inválida'))
      el.src = url
    })
    const lado = Math.min(img.width, img.height)
    const sx = Math.round((img.width - lado) / 2)
    const sy = Math.round((img.height - lado) / 2)
    const canvas = document.createElement('canvas')
    canvas.width = LADO
    canvas.height = LADO
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, sx, sy, lado, lado, 0, 0, LADO, LADO)
    // PNG preserva transparência; se for foto comum, JPEG é bem menor.
    const png = /image\/(png|webp|gif)/i.test(arquivo.type)
    return png ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.82)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Idade em anos a partir da data de nascimento ISO (ou null). */
export function idadeDe(nascimentoISO?: string): number | null {
  if (!nascimentoISO) return null
  const n = new Date(nascimentoISO + 'T00:00:00')
  if (Number.isNaN(n.getTime())) return null
  const hoje = new Date()
  let idade = hoje.getFullYear() - n.getFullYear()
  const m = hoje.getMonth() - n.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < n.getDate())) idade--
  return idade
}
