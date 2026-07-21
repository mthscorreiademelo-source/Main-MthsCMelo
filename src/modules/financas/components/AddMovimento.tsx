import { useEffect, useState, type FormEvent } from 'react'
import { IconMais } from '../../../core/components/Icons'
import { hojeISO } from '../../../core/dates'
import { criarMovimento, parsearValor } from '../db'
import { useContas } from '../hooks'
import type { TipoMovimento } from '../types'

export function AddMovimento() {
  const contas = useContas()
  const [tipo, setTipo] = useState<TipoMovimento>('saida')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [contaId, setContaId] = useState('')
  const [erro, setErro] = useState(false)

  // Pré-seleciona a primeira conta corrente/carteira assim que as contas chegam.
  useEffect(() => {
    if (contaId || !contas || contas.length === 0) return
    const preferida =
      contas.find((c) => c.tipo === 'corrente') ??
      contas.find((c) => c.tipo === 'carteira') ??
      contas[0]
    setContaId(preferida.id)
  }, [contas, contaId])

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const centavos = parsearValor(valor)
    if (!descricao.trim() || centavos === null || centavos <= 0) {
      setErro(true)
      return
    }
    setErro(false)
    await criarMovimento({
      tipo,
      valorCentavos: centavos,
      descricao,
      data: hojeISO(),
      contaId: contaId || undefined,
    })
    setDescricao('')
    setValor('')
  }

  return (
    <form
      onSubmit={aoEnviar}
      className={`flex flex-wrap items-center gap-2 rounded-lg border bg-surface/60 p-2 transition-colors focus-within:border-muted/50 ${
        erro ? 'border-danger/60' : 'border-line'
      }`}
    >
      <div className="flex overflow-hidden rounded-lg border border-line">
        <button
          type="button"
          onClick={() => setTipo('saida')}
          className={`min-h-10 cursor-pointer px-3 text-sm font-medium transition-colors ${
            tipo === 'saida' ? 'bg-danger/10 text-danger' : 'text-muted hover:bg-hover'
          }`}
        >
          − Saída
        </button>
        <button
          type="button"
          onClick={() => setTipo('entrada')}
          className={`min-h-10 cursor-pointer px-3 text-sm font-medium transition-colors ${
            tipo === 'entrada' ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-hover'
          }`}
        >
          + Entrada
        </button>
      </div>
      <input
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        placeholder={tipo === 'saida' ? 'Ex.: mercado' : 'Ex.: salário'}
        className="min-w-32 flex-1 bg-transparent px-1 py-2.5 text-[15px] outline-none placeholder:text-muted/70"
      />
      <input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="0,00"
        inputMode="decimal"
        aria-label="Valor"
        className="w-24 bg-transparent px-1 py-2.5 text-right text-[15px] outline-none placeholder:text-muted/70"
      />
      {contas && contas.length > 0 && (
        <select
          value={contaId}
          onChange={(e) => setContaId(e.target.value)}
          aria-label={tipo === 'saida' ? 'Conta de origem' : 'Conta de destino'}
          title={tipo === 'saida' ? 'De onde saiu o dinheiro' : 'Para onde entrou o dinheiro'}
          className="min-h-10 max-w-36 rounded-lg border border-line bg-transparent px-2 text-[13px] text-muted outline-none focus:text-ink"
        >
          {contas.map((c) => (
            <option key={c.id} value={c.id}>{c.icone ? `${c.icone} ` : ''}{c.nome}</option>
          ))}
        </select>
      )}
      <button
        type="submit"
        aria-label="Adicionar movimento"
        className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-ink text-bg transition-opacity hover:opacity-85"
      >
        <IconMais width={18} height={18} />
      </button>
    </form>
  )
}
