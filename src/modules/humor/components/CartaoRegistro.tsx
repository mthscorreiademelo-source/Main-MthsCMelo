import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { humorDe, urlDoAnexo } from '../humor'
import type { Fator, HumorTipo, Registro } from '../types'
import { IconeFator } from './icones'
import { RostoHumor } from './RostoHumor'

interface Props {
  registro: Registro
  humorTipos: HumorTipo[]
  fatores: Map<string, Fator>
  onAbrir: (r: Registro) => void
}

/** Cartão de um registro na linha do tempo. */
export function CartaoRegistro({ registro, humorTipos, fatores, onAbrir }: Props) {
  const tipo = humorDe(humorTipos, registro.nivel)
  const [thumb, setThumb] = useState<string | null>(null)

  useEffect(() => {
    if (!registro.anexoId) return
    let url: string | null = null
    let vivo = true
    urlDoAnexo(registro.anexoId).then((u) => {
      if (vivo && u) {
        url = u
        setThumb(u)
      } else if (u) URL.revokeObjectURL(u)
    })
    return () => {
      vivo = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [registro.anexoId])

  const marcados = registro.fatorIds.map((id) => fatores.get(id)).filter(Boolean) as Fator[]

  return (
    <button
      onClick={() => onAbrir(registro)}
      className="flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface/40 p-3 text-left transition-colors hover:border-muted/40"
    >
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${tipo.cor}20` }}
      >
        <RostoHumor nivel={registro.nivel} width={26} height={26} style={{ color: tipo.cor }} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-[14px] font-semibold">{tipo.nome}</span>
          <span className="text-[12px] text-muted">{format(registro.criadoEm, 'HH:mm')}</span>
        </span>

        {marcados.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-1">
            {marcados.slice(0, 6).map((f) => (
              <span
                key={f.id}
                className="flex items-center gap-1 rounded-full bg-hover px-2 py-0.5 text-[11.5px] text-muted"
              >
                <IconeFator nome={f.icone} width={12} height={12} />
                {f.nome}
              </span>
            ))}
            {marcados.length > 6 && (
              <span className="rounded-full bg-hover px-2 py-0.5 text-[11.5px] text-muted">
                +{marcados.length - 6}
              </span>
            )}
          </span>
        )}

        {registro.nota && (
          <span className="mt-1 line-clamp-2 block text-[13px] leading-snug text-muted">
            {registro.nota}
          </span>
        )}
      </span>

      {thumb && (
        <img
          src={thumb}
          alt=""
          className="size-14 shrink-0 rounded-xl border border-line object-cover"
        />
      )}
    </button>
  )
}
