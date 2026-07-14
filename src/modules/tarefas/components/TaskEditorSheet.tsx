import { useEffect, useState } from 'react'
import { Button } from '../../../core/components/Button'
import { Sheet } from '../../../core/components/Sheet'
import { IconLixeira } from '../../../core/components/Icons'
import { atualizarTarefa, excluirTarefa } from '../db'
import type { Task } from '../types'

interface Props {
  task: Task | null
  onFechar: () => void
}

/** Edição em sheet lateral com salvamento automático (estilo Notion). */
export function TaskEditorSheet({ task, onFechar }: Props) {
  const [titulo, setTitulo] = useState('')
  const [nota, setNota] = useState('')
  const [data, setData] = useState('')
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)

  useEffect(() => {
    if (task) {
      setTitulo(task.titulo)
      setNota(task.nota ?? '')
      setData(task.data ?? '')
      setConfirmandoExclusao(false)
    }
    // Ressincroniza somente ao trocar de tarefa, não a cada tecla
  }, [task?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function salvarTitulo(valor: string) {
    setTitulo(valor)
    if (task && valor.trim()) {
      atualizarTarefa(task.id, { titulo: valor.trim() })
    }
  }

  function salvarNota(valor: string) {
    setNota(valor)
    if (task) atualizarTarefa(task.id, { nota: valor.trim() || undefined })
  }

  function salvarData(valor: string) {
    setData(valor)
    if (task) atualizarTarefa(task.id, { data: valor || undefined })
  }

  async function aoExcluir() {
    if (!task) return
    if (!confirmandoExclusao) {
      setConfirmandoExclusao(true)
      return
    }
    await excluirTarefa(task.id)
    onFechar()
  }

  return (
    <Sheet aberto={!!task} titulo="Tarefa" onFechar={onFechar}>
      <div className="flex h-full flex-col gap-5">
        <input
          value={titulo}
          onChange={(e) => salvarTitulo(e.target.value)}
          placeholder="Título"
          className="w-full bg-transparent text-xl font-semibold outline-none placeholder:text-muted/60"
        />

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">Data</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={data}
              onChange={(e) => salvarData(e.target.value)}
              className="min-h-11 rounded-lg border border-line bg-transparent px-3 text-[15px] outline-none focus:border-muted/50"
            />
            {data && (
              <Button onClick={() => salvarData('')} className="text-muted">
                Remover
              </Button>
            )}
          </div>
        </label>

        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">Nota</span>
          <textarea
            value={nota}
            onChange={(e) => salvarNota(e.target.value)}
            placeholder="Detalhes, links, contexto…"
            rows={6}
            className="w-full flex-1 resize-none rounded-lg border border-line bg-transparent px-3 py-2.5 text-[15px] leading-relaxed outline-none placeholder:text-muted/60 focus:border-muted/50"
          />
        </label>

        <Button variante="perigo" onClick={aoExcluir} className="self-start">
          <IconLixeira width={16} height={16} />
          {confirmandoExclusao ? 'Confirmar exclusão' : 'Excluir tarefa'}
        </Button>
      </div>
    </Sheet>
  )
}
