import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../../core/components/EmptyState'
import { IconCaneta, IconDocumento, IconMais } from '../../core/components/Icons'
import { GrupoEditorSheet } from './components/GrupoEditorSheet'
import { ListaPaginas } from './components/ListaPaginas'
import { criarPagina, ordenarGrupos } from './db'
import { useGrupos, usePaginas } from './hooks'

export function NotasPage() {
  const paginas = usePaginas()
  const grupos = useGrupos()
  const navigate = useNavigate()
  const [criandoGrupo, setCriandoGrupo] = useState(false)

  const listaGrupos = useMemo(() => ordenarGrupos(grupos ?? []), [grupos])
  const soltas = useMemo(
    () => (paginas ?? []).filter((p) => !p.grupoId),
    [paginas],
  )
  const contagem = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const p of paginas ?? []) {
      if (p.grupoId) mapa.set(p.grupoId, (mapa.get(p.grupoId) ?? 0) + 1)
    }
    return mapa
  }, [paginas])

  async function novaPagina(tipo: 'texto' | 'desenho' = 'texto') {
    const id = await criarPagina(undefined, tipo)
    navigate(`/notas/${id}`)
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      {/* Galeria de grupos */}
      <section>
        <h2 className="mb-2 px-1 text-[13px] font-medium text-muted">Grupos</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {listaGrupos.map((g) => {
            const qtd = contagem.get(g.id) ?? 0
            return (
              <button
                key={g.id}
                onClick={() => navigate(`/notas/grupo/${g.id}`)}
                className="group cursor-pointer text-left"
              >
                <span className="block overflow-hidden rounded-xl border border-line transition-transform duration-150 group-hover:scale-[1.02]">
                  {g.capa ? (
                    <img
                      src={g.capa}
                      alt=""
                      className="aspect-[4/5] w-full object-cover"
                    />
                  ) : (
                    <span className="flex aspect-[4/5] w-full items-center justify-center bg-surface text-4xl font-bold text-muted/50">
                      {g.nome.charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="mt-1.5 block truncate px-0.5 text-[14px] font-medium">
                  {g.nome}
                </span>
                <span className="block px-0.5 text-[12px] text-muted">
                  {qtd} {qtd === 1 ? 'nota' : 'notas'}
                </span>
              </button>
            )
          })}

          <button
            onClick={() => setCriandoGrupo(true)}
            className="cursor-pointer text-left"
          >
            <span className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line text-muted transition-colors hover:border-muted/60 hover:text-ink">
              <IconMais />
              <span className="text-[13px] font-medium">Novo grupo</span>
            </span>
          </button>
        </div>
      </section>

      {/* Notas soltas */}
      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-[13px] font-medium text-muted">Notas soltas</h2>
        <div className="flex gap-2">
          <button
            onClick={() => novaPagina('texto')}
            className="flex min-h-12 flex-1 cursor-pointer items-center gap-1 rounded-lg border border-line bg-surface/60 px-2 text-[15px] text-muted transition-colors hover:border-muted/50 hover:text-ink"
          >
            <span className="flex size-11 items-center justify-center">
              <IconMais />
            </span>
            Nova página
          </button>
          <button
            onClick={() => novaPagina('desenho')}
            className="flex min-h-12 flex-1 cursor-pointer items-center gap-1 rounded-lg border border-line bg-surface/60 px-2 text-[15px] text-muted transition-colors hover:border-muted/50 hover:text-ink"
          >
            <span className="flex size-11 items-center justify-center">
              <IconCaneta width={18} height={18} />
            </span>
            Novo desenho
          </button>
        </div>

        {paginas && soltas.length === 0 && (
          <EmptyState
            icone={<IconDocumento />}
            titulo="Nenhuma nota solta"
            descricao="Notas fora de grupos aparecem aqui."
          />
        )}
        <ListaPaginas paginas={soltas} />
      </section>

      <GrupoEditorSheet
        aberto={criandoGrupo}
        grupo={null}
        onFechar={() => setCriandoGrupo(false)}
      />
    </div>
  )
}
