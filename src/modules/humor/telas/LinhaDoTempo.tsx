import { useMemo } from 'react'
import { EmptyState } from '../../../core/components/EmptyState'
import { IconHumor } from '../../../core/components/Icons'
import { hojeISO, rotuloData } from '../../../core/dates'
import { CartaoRegistro } from '../components/CartaoRegistro'
import type { Fator, HumorTipo, Registro } from '../types'

export function LinhaDoTempo({
  registros,
  humorTipos,
  fatores,
  onAbrir,
}: {
  registros: Registro[]
  humorTipos: HumorTipo[]
  fatores: Map<string, Fator>
  onAbrir: (r: Registro) => void
}) {
  // agrupa por dia, dias mais recentes primeiro
  const grupos = useMemo(() => {
    const mapa = new Map<string, Registro[]>()
    for (const r of registros) {
      if (!mapa.has(r.data)) mapa.set(r.data, [])
      mapa.get(r.data)!.push(r)
    }
    return [...mapa.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([data, lista]) => [data, lista.sort((x, y) => y.criadoEm - x.criadoEm)] as const)
  }, [registros])

  if (registros.length === 0) {
    return (
      <div className="py-10">
        <EmptyState
          icone={<IconHumor />}
          titulo="Sua linha do tempo está vazia"
          descricao="Cada registro de humor aparece aqui, do mais recente ao mais antigo."
        />
      </div>
    )
  }

  const hoje = hojeISO()

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 py-2">
      {grupos.map(([data, lista]) => (
        <section key={data} className="flex flex-col gap-2">
          <h2 className="px-1 text-[13px] font-semibold text-muted">
            {data === hoje ? 'Hoje' : rotuloData(data)}
          </h2>
          {lista.map((r) => (
            <CartaoRegistro
              key={r.id}
              registro={r}
              humorTipos={humorTipos}
              fatores={fatores}
              onAbrir={onAbrir}
            />
          ))}
        </section>
      ))}
    </div>
  )
}
