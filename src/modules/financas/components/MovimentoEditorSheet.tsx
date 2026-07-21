import { useEffect, useState } from 'react'
import { Button } from '../../../core/components/Button'
import { IconLixeira } from '../../../core/components/Icons'
import { Sheet } from '../../../core/components/Sheet'
import {
  atualizarMovimento,
  CATEGORIAS,
  excluirMovimento,
  parsearValor,
  valorParaTexto,
} from '../db'
import { useContas } from '../hooks'
import type { Movimento, TipoMovimento } from '../types'

interface Props {
  movimento: Movimento | null
  onFechar: () => void
}

export function MovimentoEditorSheet({ movimento, onFechar }: Props) {
  const contas = useContas()
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)

  useEffect(() => {
    if (movimento) {
      setDescricao(movimento.descricao)
      setValor(valorParaTexto(movimento.valorCentavos))
      setConfirmandoExclusao(false)
    }
  }, [movimento?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function salvarDescricao(texto: string) {
    setDescricao(texto)
    if (movimento && texto.trim()) {
      atualizarMovimento(movimento.id, { descricao: texto.trim() })
    }
  }

  function salvarValor(texto: string) {
    setValor(texto)
    const centavos = parsearValor(texto)
    if (movimento && centavos !== null && centavos > 0) {
      atualizarMovimento(movimento.id, { valorCentavos: centavos })
    }
  }

  function salvarTipo(tipo: TipoMovimento) {
    if (movimento) atualizarMovimento(movimento.id, { tipo })
  }

  function salvarCategoria(categoria: string) {
    if (!movimento) return
    atualizarMovimento(movimento.id, {
      categoria: movimento.categoria === categoria ? undefined : categoria,
    })
  }

  async function aoExcluir() {
    if (!movimento) return
    if (!confirmandoExclusao) {
      setConfirmandoExclusao(true)
      return
    }
    await excluirMovimento(movimento.id)
    onFechar()
  }

  return (
    <Sheet aberto={!!movimento} titulo="Movimento" onFechar={onFechar}>
      <div className="flex h-full flex-col gap-5">
        <input
          value={descricao}
          onChange={(e) => salvarDescricao(e.target.value)}
          placeholder="Descrição"
          className="w-full bg-transparent text-xl font-semibold outline-none placeholder:text-muted/60"
        />

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted">Valor (R$)</span>
            <input
              value={valor}
              onChange={(e) => salvarValor(e.target.value)}
              inputMode="decimal"
              className="min-h-11 rounded-lg border border-line bg-transparent px-3 text-[15px] outline-none focus:border-muted/50"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted">Tipo</span>
            <div className="flex min-h-11 overflow-hidden rounded-lg border border-line">
              <button
                onClick={() => salvarTipo('saida')}
                className={`flex-1 cursor-pointer text-sm font-medium transition-colors ${
                  movimento?.tipo === 'saida'
                    ? 'bg-danger/10 text-danger'
                    : 'text-muted hover:bg-hover'
                }`}
              >
                Saída
              </button>
              <button
                onClick={() => salvarTipo('entrada')}
                className={`flex-1 cursor-pointer text-sm font-medium transition-colors ${
                  movimento?.tipo === 'entrada'
                    ? 'bg-accent/10 text-accent'
                    : 'text-muted hover:bg-hover'
                }`}
              >
                Entrada
              </button>
            </div>
          </label>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">Categoria</span>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIAS.map((c) => (
              <button
                key={c}
                onClick={() => salvarCategoria(c)}
                className={`min-h-9 cursor-pointer rounded-full border px-3 text-[13px] font-medium transition-colors ${
                  movimento?.categoria === c
                    ? 'border-ink bg-ink text-bg'
                    : 'border-line text-muted hover:bg-hover'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {contas && contas.length > 0 && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted">{movimento?.tipo === 'entrada' ? 'Entrou na conta' : 'Saiu da conta'}</span>
            <select
              value={movimento?.contaId ?? ''}
              onChange={(e) => movimento && atualizarMovimento(movimento.id, { contaId: e.target.value || undefined })}
              className="min-h-11 self-start rounded-lg border border-line bg-transparent px-3 text-[15px] outline-none focus:border-muted/50"
            >
              <option value="">Nenhuma (não altera saldo)</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>{c.icone ? `${c.icone} ` : ''}{c.nome}</option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">Data</span>
          <input
            type="date"
            value={movimento?.data ?? ''}
            onChange={(e) => {
              if (movimento && e.target.value) {
                atualizarMovimento(movimento.id, { data: e.target.value })
              }
            }}
            className="min-h-11 self-start rounded-lg border border-line bg-transparent px-3 text-[15px] outline-none focus:border-muted/50"
          />
        </label>

        <div className="flex-1" />

        <Button variante="perigo" onClick={aoExcluir} className="self-start">
          <IconLixeira width={16} height={16} />
          {confirmandoExclusao ? 'Confirmar exclusão' : 'Excluir movimento'}
        </Button>
      </div>
    </Sheet>
  )
}
