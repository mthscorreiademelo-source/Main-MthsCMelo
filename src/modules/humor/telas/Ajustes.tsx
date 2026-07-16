import { useMemo, useState } from 'react'
import {
  IconChevron,
  IconFechar,
  IconLapis,
  IconMais,
  IconSeta,
} from '../../../core/components/Icons'
import { EditorCategoria } from '../components/EditorCategoria'
import { EditorFator } from '../components/EditorFator'
import { EditorHumorTipo } from '../components/EditorHumorTipo'
import { IconeFator } from '../../../core/components/icones'
import { RostoHumor } from '../components/RostoHumor'
import { moverCategoria, moverFator, atualizarCategoria } from '../personalizar'
import type { Categoria, Fator, HumorTipo } from '../types'

interface Props {
  humorTipos: HumorTipo[]
  categorias: Categoria[]
  fatores: Fator[]
  onFechar: () => void
}

export function Ajustes({ humorTipos, categorias, fatores, onFechar }: Props) {
  const [aba, setAba] = useState<'humores' | 'fatores'>('humores')
  const [editHumor, setEditHumor] = useState<HumorTipo | null>(null)
  const [editCat, setEditCat] = useState<{ categoria?: Categoria } | null>(null)
  const [editFator, setEditFator] = useState<{ fator?: Fator; categoriaId: string } | null>(null)

  const cats = useMemo(() => [...categorias].sort((a, b) => a.ordem - b.ordem), [categorias])
  const porCategoria = useMemo(() => {
    const m = new Map<string, Fator[]>()
    for (const f of fatores) {
      if (!m.has(f.categoriaId)) m.set(f.categoriaId, [])
      m.get(f.categoriaId)!.push(f)
    }
    for (const lista of m.values()) lista.sort((a, b) => a.ordem - b.ordem)
    return m
  }, [fatores])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      <header className="flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-3">
        <h2 className="flex-1 text-lg font-bold">Personalizar</h2>
        <button
          onClick={onFechar}
          aria-label="Fechar"
          className="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-hover"
        >
          <IconFechar width={20} height={20} />
        </button>
      </header>

      {/* Segmentado */}
      <div className="px-5 pb-3">
        <div className="flex gap-1 rounded-full border border-line p-1 text-[13px]">
          {(['humores', 'fatores'] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAba(a)}
              className={`min-h-9 flex-1 cursor-pointer rounded-full font-medium transition-colors ${
                aba === a ? 'bg-ink text-bg' : 'text-muted hover:text-ink'
              }`}
            >
              {a === 'humores' ? 'Humores' : 'Fatores'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3">
          {aba === 'humores'
            ? humorTipos.map((t) => (
                <button
                  key={t.nivel}
                  onClick={() => setEditHumor(t)}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line p-3 text-left transition-colors hover:border-muted/40"
                >
                  <span
                    className="flex size-11 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${t.cor}26` }}
                  >
                    <RostoHumor nivel={t.nivel} width={26} height={26} style={{ color: t.cor }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">{t.nome}</span>
                    {t.descricao && (
                      <span className="block truncate text-[13px] text-muted">{t.descricao}</span>
                    )}
                  </span>
                  <span className="size-4 shrink-0 rounded-full" style={{ backgroundColor: t.cor }} />
                  <IconLapis width={16} height={16} className="shrink-0 text-muted" />
                </button>
              ))
            : (
              <>
                {cats.map((c, i) => (
                  <CategoriaCard
                    key={c.id}
                    categoria={c}
                    fatores={porCategoria.get(c.id) ?? []}
                    primeira={i === 0}
                    ultima={i === cats.length - 1}
                    onEditar={() => setEditCat({ categoria: c })}
                    onEditarFator={(fator) => setEditFator({ fator, categoriaId: c.id })}
                    onNovoFator={() => setEditFator({ categoriaId: c.id })}
                    onRecolher={() => atualizarCategoria(c.id, { recolhida: !c.recolhida })}
                    onMover={(d) => moverCategoria(c.id, d)}
                    onMoverFator={(id, d) => moverFator(id, d)}
                  />
                ))}
                <button
                  onClick={() => setEditCat({})}
                  className="flex min-h-12 cursor-pointer items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line text-[14px] font-medium text-muted transition-colors hover:border-muted/50 hover:text-ink"
                >
                  <IconMais width={18} height={18} />
                  Nova categoria
                </button>
              </>
            )}
        </div>
      </div>

      {editHumor && <EditorHumorTipo tipo={editHumor} onFechar={() => setEditHumor(null)} />}
      {editCat && (
        <EditorCategoria categoria={editCat.categoria} onFechar={() => setEditCat(null)} />
      )}
      {editFator && (
        <EditorFator
          fator={editFator.fator}
          categoriaId={editFator.categoriaId}
          onFechar={() => setEditFator(null)}
        />
      )}
    </div>
  )
}

function CategoriaCard({
  categoria,
  fatores,
  primeira,
  ultima,
  onEditar,
  onEditarFator,
  onNovoFator,
  onRecolher,
  onMover,
  onMoverFator,
}: {
  categoria: Categoria
  fatores: Fator[]
  primeira: boolean
  ultima: boolean
  onEditar: () => void
  onEditarFator: (f: Fator) => void
  onNovoFator: () => void
  onRecolher: () => void
  onMover: (d: -1 | 1) => void
  onMoverFator: (id: string, d: -1 | 1) => void
}) {
  const ativos = fatores.filter((f) => !f.arquivado)
  const arquivados = fatores.filter((f) => f.arquivado)
  const ordenados = [...ativos, ...arquivados]

  return (
    <section className="rounded-2xl border border-line">
      <div className="flex items-center gap-1 p-2.5">
        <button
          onClick={onEditar}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
        >
          <IconeFator nome={categoria.icone} width={18} height={18} className="shrink-0 text-muted" />
          <span className="truncate text-[14px] font-semibold">{categoria.nome}</span>
          {categoria.sistema && (
            <span className="shrink-0 rounded-full bg-hover px-1.5 py-0.5 text-[10px] text-muted">
              sistema
            </span>
          )}
          <IconLapis width={13} height={13} className="shrink-0 text-muted/60" />
        </button>
        <MiniBtn aria="Mover para cima" disabled={primeira} onClick={() => onMover(-1)}>
          <IconSeta width={15} height={15} />
        </MiniBtn>
        <MiniBtn aria="Mover para baixo" disabled={ultima} onClick={() => onMover(1)}>
          <IconSeta width={15} height={15} className="rotate-180" />
        </MiniBtn>
        <MiniBtn aria={categoria.recolhida ? 'Expandir' : 'Recolher'} onClick={onRecolher}>
          <IconChevron
            width={16}
            height={16}
            className={categoria.recolhida ? '' : 'rotate-180'}
          />
        </MiniBtn>
      </div>

      {!categoria.recolhida && (
        <div className="flex flex-col gap-1 px-2.5 pb-2.5">
          {ordenados.map((f, i) => (
            <div
              key={f.id}
              className={`flex items-center gap-1 rounded-xl px-1 ${f.arquivado ? 'opacity-45' : ''}`}
            >
              <button
                onClick={() => onEditarFator(f)}
                className="flex min-h-10 min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
              >
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: f.cor ? `${f.cor}22` : 'var(--vida-hover)' }}
                >
                  <IconeFator
                    nome={f.icone}
                    width={14}
                    height={14}
                    style={{ color: f.cor ?? 'var(--vida-muted)' }}
                  />
                </span>
                <span className="truncate text-[13.5px]">{f.nome}</span>
                {f.arquivado && <span className="text-[11px] text-muted">arquivado</span>}
              </button>
              <MiniBtn aria="Mover para cima" disabled={i === 0} onClick={() => onMoverFator(f.id, -1)}>
                <IconSeta width={13} height={13} />
              </MiniBtn>
              <MiniBtn
                aria="Mover para baixo"
                disabled={i === ordenados.length - 1}
                onClick={() => onMoverFator(f.id, 1)}
              >
                <IconSeta width={13} height={13} className="rotate-180" />
              </MiniBtn>
            </div>
          ))}
          <button
            onClick={onNovoFator}
            className="mt-1 flex min-h-9 cursor-pointer items-center gap-1.5 self-start rounded-full px-2 text-[13px] font-medium text-muted transition-colors hover:text-ink"
          >
            <IconMais width={15} height={15} />
            Adicionar fator
          </button>
        </div>
      )}
    </section>
  )
}

function MiniBtn({
  children,
  aria,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  aria: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={aria}
      className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover disabled:cursor-default disabled:opacity-25"
    >
      {children}
    </button>
  )
}
