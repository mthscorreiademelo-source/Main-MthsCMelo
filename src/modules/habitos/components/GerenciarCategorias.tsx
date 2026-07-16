import { useState } from 'react'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { IconLixeira, IconMais } from '../../../core/components/Icons'
import { IconeFator } from '../../../core/components/icones'
import { atualizarCategoria, criarCategoria, excluirCategoria, PALETA } from '../db'
import type { CategoriaHabito } from '../types'

export function GerenciarCategorias({
  categorias,
  onFechar,
}: {
  categorias: CategoriaHabito[]
  onFechar: () => void
}) {
  const [nova, setNova] = useState('')

  async function adicionar() {
    if (!nova.trim()) return
    await criarCategoria({ nome: nova.trim() })
    setNova('')
  }

  return (
    <FolhaInferior titulo="Categorias" onFechar={onFechar}>
      <div className="flex flex-col gap-2">
        {categorias.map((c) => (
          <div key={c.id} className="flex items-center gap-2 rounded-lg border border-line px-2 py-1.5">
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-md"
              style={{ backgroundColor: `${c.cor ?? '#888'}1f`, color: c.cor ?? '#888' }}
            >
              <IconeFator nome={c.icone} width={15} height={15} />
            </span>
            <input
              value={c.nome}
              onChange={(e) => atualizarCategoria(c.id, { nome: e.target.value })}
              className="min-w-0 flex-1 bg-transparent text-[14px] outline-none"
            />
            <div className="flex shrink-0 gap-1">
              {PALETA.slice(0, 6).map((cor) => (
                <button
                  key={cor}
                  onClick={() => atualizarCategoria(c.id, { cor })}
                  aria-label={`Cor ${cor}`}
                  className={`size-4 rounded-full ${c.cor === cor ? 'ring-2 ring-ink ring-offset-1 ring-offset-bg' : ''}`}
                  style={{ backgroundColor: cor }}
                />
              ))}
            </div>
            <button
              onClick={() => confirm(`Excluir "${c.nome}"? Os hábitos ficam sem categoria.`) && excluirCategoria(c.id)}
              aria-label="Excluir categoria"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:text-red-500"
            >
              <IconLixeira width={15} height={15} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && adicionar()}
          placeholder="Nova categoria…"
          className="min-h-10 flex-1 rounded-lg border border-line bg-surface px-3 text-[15px] outline-none focus:border-muted/60"
        />
        <button
          onClick={adicionar}
          className="flex min-h-10 items-center gap-1 rounded-lg bg-ink px-3 text-[14px] font-medium text-surface"
        >
          <IconMais width={16} height={16} /> Criar
        </button>
      </div>
    </FolhaInferior>
  )
}
