import { useEffect, useState, type FormEvent } from 'react'
import { hojeISO } from '../../../core/dates'
import { criarMovimento, parsearValor } from '../db'
import { useContas } from '../hooks'
import type { TipoMovimento } from '../types'

export function AddMovimento({
  aoConcluir,
  tipoInicial = 'saida',
  descricaoInicial = '',
}: {
  aoConcluir?: (id?: string) => void
  tipoInicial?: TipoMovimento
  descricaoInicial?: string
}) {
  const contas = useContas()
  const [tipo, setTipo] = useState<TipoMovimento>(tipoInicial)
  const [descricao, setDescricao] = useState(descricaoInicial)
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
    const id = await criarMovimento({
      tipo,
      valorCentavos: centavos,
      descricao,
      data: hojeISO(),
      contaId: contaId || undefined,
    })
    setDescricao('')
    setValor('')
    aoConcluir?.(id)
  }

  return (
    <form onSubmit={aoEnviar} className="flex flex-col gap-3">
      {/* Tipo */}
      <div className="flex overflow-hidden rounded-xl border border-line">
        <button
          type="button"
          onClick={() => setTipo('saida')}
          className={`min-h-11 flex-1 cursor-pointer text-[14px] font-medium transition-colors ${
            tipo === 'saida' ? 'bg-danger/10 text-danger' : 'text-muted hover:bg-hover'
          }`}
        >
          − Saída
        </button>
        <button
          type="button"
          onClick={() => setTipo('entrada')}
          className={`min-h-11 flex-1 cursor-pointer text-[14px] font-medium transition-colors ${
            tipo === 'entrada' ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-hover'
          }`}
        >
          + Entrada
        </button>
      </div>

      {/* Descrição */}
      <input
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        placeholder={tipo === 'saida' ? 'Ex.: mercado' : 'Ex.: salário'}
        autoFocus
        className={`min-h-12 rounded-xl border bg-transparent px-3 text-[15px] outline-none focus:border-muted/50 ${erro && !descricao.trim() ? 'border-danger' : 'border-line'}`}
      />

      {/* Valor + conta */}
      <div className="flex gap-2">
        <div className={`flex flex-1 items-center rounded-xl border bg-transparent px-3 ${erro && !parsearValor(valor) ? 'border-danger' : 'border-line'}`}>
          <span className="text-[15px] text-muted">R$</span>
          <input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
            inputMode="decimal"
            aria-label="Valor"
            className="min-h-12 w-full bg-transparent px-2 text-[17px] font-semibold outline-none placeholder:text-muted/60"
          />
        </div>
        {contas && contas.length > 0 && (
          <select
            value={contaId}
            onChange={(e) => setContaId(e.target.value)}
            aria-label={tipo === 'saida' ? 'Conta de origem' : 'Conta de destino'}
            title={tipo === 'saida' ? 'De onde saiu o dinheiro' : 'Para onde entrou o dinheiro'}
            className="min-h-12 max-w-[45%] rounded-xl border border-line bg-transparent px-2 text-[13px] text-muted outline-none focus:text-ink"
          >
            {contas.map((c) => (
              <option key={c.id} value={c.id}>{c.icone ? `${c.icone} ` : ''}{c.nome}</option>
            ))}
          </select>
        )}
      </div>

      <button
        type="submit"
        className="mt-1 flex min-h-12 items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-bg transition-opacity hover:opacity-90"
      >
        {tipo === 'saida' ? 'Registrar saída' : 'Registrar entrada'}
      </button>
    </form>
  )
}
