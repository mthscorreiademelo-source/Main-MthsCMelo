import { nanoid } from 'nanoid'
import { useEffect, useState } from 'react'
import { db } from '../../core/db/db'

/** Salva um arquivo (foto/PDF) na tabela `arquivos` e devolve o id. */
export async function salvarAnexo(file: File): Promise<string> {
  const id = nanoid()
  await db.arquivos.add({ id, blob: file, nome: file.name, tipo: file.type, tamanho: file.size, criadoEm: Date.now() })
  return id
}

export async function excluirAnexo(id: string) {
  await db.arquivos.delete(id)
}

/** URL de objeto reativa para um anexo (revoga ao desmontar/trocar). */
export function useAnexoUrl(id: string | undefined): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    let ativo = true
    let objeto: string | undefined
    if (!id) {
      setUrl(undefined)
      return
    }
    db.arquivos.get(id).then((a) => {
      if (!ativo || !a) return
      objeto = URL.createObjectURL(a.blob)
      setUrl(objeto)
    })
    return () => {
      ativo = false
      if (objeto) URL.revokeObjectURL(objeto)
    }
  }, [id])
  return url
}
