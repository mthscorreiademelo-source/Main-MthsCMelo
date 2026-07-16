import { useState } from 'react'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { IconLixeira, IconMais } from '../../../core/components/Icons'
import { atualizarCronograma, CORES_EVENTO, criarCronograma, excluirCronograma } from '../db'
import type { Cronograma } from '../types'

export function GerenciarCronogramas({
  cronogramas,
  onFechar,
}: {
  cronogramas: Cronograma[]
  onFechar: () => void
}) {
  const [novo, setNovo] = useState('')

  async function adicionar() {
    if (!novo.trim()) return
    await criarCronograma({ nome: novo, cor: CORES_EVENTO[cronogramas.length % CORES_EVENTO.length] })
    setNovo('')
  }

  return (
    <FolhaInferior titulo="Cronogramas" onFechar={onFechar}>
      <div className="flex flex-col gap-2">
        {cronogramas.map((c) => (
          <div key={c.id} className="flex items-center gap-2 rounded-lg border border-line p-2">
            <div className="flex gap-1">
              {CORES_EVENTO.slice(0, 6).map((cor) => (
                <button
                  key={cor}
                  onClick={() => atualizarCronograma(c.id, { cor })}
                  aria-label={`Cor ${cor}`}
                  className={`size-5 rounded-full ${c.cor === cor ? 'ring-2 ring-ink ring-offset-1 ring-offset-bg' : ''}`}
                  style={{ backgroundColor: cor }}
                />
              ))}
            </div>
            <input
              value={c.nome}
              onChange={(e) => atualizarCronograma(c.id, { nome: e.target.value })}
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
            />
            <button
              onClick={() => confirm(`Excluir o cronograma "${c.nome}"? Os eventos são mantidos (apenas desvinculados).`) && excluirCronograma(c.id)}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:text-red-500"
              aria-label="Excluir"
            >
              <IconLixeira width={15} height={15} />
            </button>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          adicionar()
        }}
        className="flex items-center gap-2"
      >
        <input
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          placeholder="Novo cronograma (ex.: Trabalho)"
          className="min-h-11 flex-1 rounded-lg border border-line bg-surface px-3 text-[15px] outline-none focus:border-muted/60"
        />
        <button type="submit" className="flex min-h-11 items-center gap-1 rounded-lg bg-ink px-4 text-[14px] font-medium text-surface">
          <IconMais width={16} height={16} /> Criar
        </button>
      </form>
    </FolhaInferior>
  )
}
