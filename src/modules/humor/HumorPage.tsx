import { useEffect, useMemo, useState } from 'react'
import { hojeISO } from '../../core/dates'
import { BarraInferior, type Aba } from './components/BarraInferior'
import { DetalheRegistro } from './components/DetalheRegistro'
import { NovoRegistro } from './components/NovoRegistro'
import { garantirSeedsHumor, mapaFatores } from './humor'
import { useCategorias, useFatores, useHumorTipos, useRegistros } from './hooks'
import { Calendario } from './telas/Calendario'
import { Estatisticas } from './telas/Estatisticas'
import { Hoje } from './telas/Hoje'
import { Insights } from './telas/Insights'
import { LinhaDoTempo } from './telas/LinhaDoTempo'
import type { Registro } from './types'

export function HumorPage() {
  const registros = useRegistros()
  const humorTipos = useHumorTipos()
  const categorias = useCategorias()
  const fatores = useFatores()

  const [aba, setAba] = useState<Aba>('hoje')
  const [capturando, setCapturando] = useState<{ registro?: Registro; data?: string } | null>(null)
  const [detalhe, setDetalhe] = useState<Registro | null>(null)

  useEffect(() => {
    garantirSeedsHumor()
  }, [])

  const fatoresMapa = useMemo(() => mapaFatores(fatores ?? []), [fatores])
  // mantém o detalhe sincronizado após edição
  const detalheAtual = useMemo(
    () => (detalhe ? (registros?.find((r) => r.id === detalhe.id) ?? null) : null),
    [detalhe, registros],
  )

  const pronto = registros !== undefined && categorias !== undefined && fatores !== undefined

  function abrirNovo() {
    setCapturando({})
  }
  function editar(r: Registro) {
    setDetalhe(null)
    setCapturando({ registro: r })
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-6">
        {!pronto ? (
          <div className="flex h-full items-center justify-center text-[14px] text-muted">
            Carregando…
          </div>
        ) : aba === 'hoje' ? (
          <Hoje registros={registros} humorTipos={humorTipos} onNovo={abrirNovo} />
        ) : aba === 'linha' ? (
          <LinhaDoTempo
            registros={registros}
            humorTipos={humorTipos}
            fatores={fatoresMapa}
            onAbrir={setDetalhe}
          />
        ) : aba === 'calendario' ? (
          <Calendario
            registros={registros}
            humorTipos={humorTipos}
            fatores={fatoresMapa}
            onAbrirRegistro={setDetalhe}
            onNovoNoDia={(data) => setCapturando({ data })}
          />
        ) : aba === 'insights' ? (
          <Insights registros={registros} fatores={fatores ?? []} />
        ) : (
          <Estatisticas registros={registros} humorTipos={humorTipos} fatores={fatoresMapa} />
        )}
      </div>

      <BarraInferior aba={aba} onMudar={setAba} onNovo={abrirNovo} />

      {capturando && categorias && fatores && (
        <NovoRegistro
          data={capturando.registro?.data ?? capturando.data ?? hojeISO()}
          humorTipos={humorTipos}
          categorias={categorias}
          fatores={fatores}
          registro={capturando.registro}
          onFechar={() => setCapturando(null)}
          onSalvo={() => setCapturando(null)}
        />
      )}

      {detalheAtual && (
        <DetalheRegistro
          registro={detalheAtual}
          humorTipos={humorTipos}
          fatores={fatoresMapa}
          onFechar={() => setDetalhe(null)}
          onEditar={editar}
        />
      )}
    </div>
  )
}
