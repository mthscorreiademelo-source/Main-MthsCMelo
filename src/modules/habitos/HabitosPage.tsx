import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../../core/components/EmptyState'
import { IconChama, IconMais, IconMenuPontos } from '../../core/components/Icons'
import { hojeISO } from '../../core/dates'
import { CabecalhoProgresso } from './components/CabecalhoProgresso'
import { CartaoHabito } from './components/CartaoHabito'
import { CategoriaSecao } from './components/CategoriaSecao'
import { EditorHabito } from './components/EditorHabito'
import { GerenciarCategorias } from './components/GerenciarCategorias'
import { alternarRecolhida, garantirSeedsHabitos, ordenarHabitos } from './db'
import { useCategoriasHabito, useHabitos, useRegistros } from './hooks'
import { registrosDoDia, resumoDoDia, streakGeral } from './progresso'
import type { Habito } from './types'

export function HabitosPage() {
  const habitos = useHabitos()
  const registros = useRegistros()
  const categorias = useCategoriasHabito()
  const data = hojeISO()

  const [editor, setEditor] = useState<{ habito: Habito | null } | null>(null)
  const [gerenciando, setGerenciando] = useState(false)
  const [semCatRecolhida, setSemCatRecolhida] = useState(false)

  useEffect(() => {
    garantirSeedsHabitos()
  }, [])

  const ativos = useMemo(() => (habitos ?? []).filter((h) => !h.arquivado), [habitos])
  const regsDia = useMemo(() => registrosDoDia(registros ?? [], data), [registros, data])
  const resumo = useMemo(() => resumoDoDia(ativos, registros ?? [], data), [ativos, registros, data])
  const streak = useMemo(() => streakGeral(ativos, registros ?? []), [ativos, registros])

  const cats = useMemo(
    () => [...(categorias ?? [])].sort((a, b) => a.ordem - b.ordem),
    [categorias],
  )
  const { porCategoria, semCategoria } = useMemo(() => {
    const mapa = new Map<string, Habito[]>()
    const sem: Habito[] = []
    const idsCat = new Set(cats.map((c) => c.id))
    for (const h of ordenarHabitos(ativos)) {
      if (h.categoriaId && idsCat.has(h.categoriaId)) {
        const arr = mapa.get(h.categoriaId) ?? []
        arr.push(h)
        mapa.set(h.categoriaId, arr)
      } else {
        sem.push(h)
      }
    }
    return { porCategoria: mapa, semCategoria: sem }
  }, [ativos, cats])

  const vazio = habitos && ativos.length === 0

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Hábitos</h1>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setGerenciando(true)}
            className="flex size-10 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-hover hover:text-ink"
            aria-label="Gerenciar categorias"
          >
            <IconMenuPontos width={18} height={18} />
          </button>
          <button
            onClick={() => setEditor({ habito: null })}
            className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full bg-ink px-4 text-[14px] font-medium text-surface transition-opacity hover:opacity-90"
          >
            <IconMais width={16} height={16} />
            Adicionar
          </button>
        </div>
      </div>

      {!vazio && ativos.length > 0 && <CabecalhoProgresso resumo={resumo} streak={streak} />}

      {vazio ? (
        <EmptyState
          icone={<IconChama />}
          titulo="Nenhum hábito ainda"
          descricao="Crie seu primeiro hábito — escolha o tipo (sim/não, contador, tempo…), a frequência e uma categoria."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {cats.map((c) => (
            <CategoriaSecao
              key={c.id}
              nome={c.nome}
              cor={c.cor}
              icone={c.icone}
              recolhida={!!c.recolhida}
              habitos={porCategoria.get(c.id) ?? []}
              registros={regsDia}
              data={data}
              onToggle={() => alternarRecolhida(c.id, !c.recolhida)}
              onEditar={(h) => setEditor({ habito: h })}
            />
          ))}

          {/* Hábitos sem categoria */}
          {semCategoria.length > 0 && (
            <section className="flex flex-col gap-2">
              <button
                onClick={() => setSemCatRecolhida((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-1 py-1 text-left text-[14px] font-semibold text-muted transition-colors hover:bg-hover"
              >
                Sem categoria <span className="text-[12px] font-normal">{semCategoria.length}</span>
              </button>
              {!semCatRecolhida && (
                <div className="flex flex-col gap-2 pl-1">
                  {semCategoria.map((h) => (
                    <CartaoHabito
                      key={h.id}
                      habito={h}
                      registro={regsDia.get(h.id)}
                      data={data}
                      onEditar={(hh) => setEditor({ habito: hh })}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {editor && (
        <EditorHabito habito={editor.habito} categorias={cats} onFechar={() => setEditor(null)} />
      )}
      {gerenciando && (
        <GerenciarCategorias categorias={cats} onFechar={() => setGerenciando(false)} />
      )}
    </div>
  )
}
