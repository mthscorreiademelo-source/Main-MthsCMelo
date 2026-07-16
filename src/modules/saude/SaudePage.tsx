import { useMemo, useState } from 'react'
import { EmptyState } from '../../core/components/EmptyState'
import { IconMais, IconSaude, IconUpload } from '../../core/components/Icons'
import { hojeISO, rotuloData } from '../../core/dates'
import { CartaoMetrica } from './components/CartaoMetrica'
import { EditorDia } from './components/EditorDia'
import { ImportarSaude } from './components/ImportarSaude'
import { exibir, METRICAS } from './db'
import { useSaude } from './hooks'
import type { SaudeDia } from './types'

export function SaudePage() {
  const dias = useSaude()
  const [editando, setEditando] = useState<string | null>(null)
  const [importando, setImportando] = useState(false)

  const ordenados = useMemo(
    () => [...(dias ?? [])].sort((a, b) => (a.data < b.data ? 1 : -1)),
    [dias],
  )
  const diaEditado = editando ? (dias ?? []).find((d) => d.data === editando) : undefined

  function resumo(d: SaudeDia): string {
    return METRICAS.map((m) => (d[m.chave] != null ? exibir(m.chave, d[m.chave]) : null))
      .filter(Boolean)
      .join(' · ')
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Saúde</h1>
        <button
          onClick={() => setImportando(true)}
          className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 text-[14px] font-medium text-muted transition-colors hover:text-ink"
        >
          <IconUpload width={16} height={16} />
          Importar
        </button>
      </div>

      <button
        onClick={() => setEditando(hojeISO())}
        className="flex min-h-12 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-line bg-surface/60 text-[15px] font-medium text-muted transition-colors hover:border-muted/50 hover:text-ink"
      >
        <IconMais width={18} height={18} />
        Registrar hoje
      </button>

      {/* Cartões por métrica */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {METRICAS.map((m) => (
          <CartaoMetrica
            key={m.chave}
            def={m}
            dias={dias ?? []}
            onAbrir={() => setEditando(hojeISO())}
          />
        ))}
      </div>

      {/* Histórico */}
      {dias && ordenados.length === 0 ? (
        <EmptyState
          icone={<IconSaude />}
          titulo="Sem dados de saúde ainda"
          descricao="Registre um dia ou importe do seu relógio para ver tendências e correlações com o humor."
        />
      ) : (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[13px] font-medium text-muted">Histórico</h2>
          <ul className="flex flex-col">
            {ordenados.map((d) => (
              <li key={d.id}>
                <button
                  onClick={() => setEditando(d.data)}
                  className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-lg px-2 text-left transition-colors hover:bg-hover"
                >
                  <span className="min-w-0 flex-1 py-2">
                    <span className="block text-[14px] font-medium">
                      {d.data === hojeISO() ? 'Hoje' : rotuloData(d.data)}
                    </span>
                    <span className="block truncate text-[13px] text-muted">{resumo(d) || '—'}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {editando && (
        <EditorDia data={editando} dia={diaEditado} onFechar={() => setEditando(null)} />
      )}
      {importando && <ImportarSaude onFechar={() => setImportando(false)} />}
    </div>
  )
}
