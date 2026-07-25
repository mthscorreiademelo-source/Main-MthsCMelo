import { useEffect, useState } from 'react'
import { useDiario } from '../diario'
import type { TipoDiario } from '../diario'

/**
 * Campo de escrita curta do Hoje (reflexão, gratidão, propósito). Mostra o que já
 * foi escrito hoje, permite editar e salva via `useDiario` (localStorage + nota
 * sincronizada). Reutilizado por vários cards para manter o mesmo comportamento.
 */
export function CampoDiario({
  tipo,
  hoje,
  placeholder,
  pergunta,
  cor = 'var(--vida-accent)',
  linhas = 2,
}: {
  tipo: TipoDiario
  hoje: string
  placeholder: string
  pergunta?: string
  cor?: string
  linhas?: number
}) {
  const { texto, salvar } = useDiario(tipo, hoje)
  const [rascunho, setRascunho] = useState(texto)
  const [salvo, setSalvo] = useState(false)

  // Quando o texto persistido muda (ex.: virou o dia), reidrata o campo.
  useEffect(() => setRascunho(texto), [texto])

  async function onSalvar() {
    if (!rascunho.trim()) return
    await salvar(rascunho, pergunta)
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2000)
  }

  const alterado = rascunho.trim() !== texto.trim()

  return (
    <div className="flex flex-1 flex-col">
      {pergunta && <p className="mb-1.5 text-[13px] text-muted">{pergunta}</p>}
      <textarea
        value={rascunho}
        onChange={(e) => setRascunho(e.target.value)}
        placeholder={placeholder}
        rows={linhas}
        className="w-full flex-1 resize-none rounded-lg border border-line bg-bg px-3 py-2 text-[14px] outline-none transition-colors focus:border-accent"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[12px] text-muted">
          {salvo ? 'Salvo ✓' : texto ? 'Registrado hoje' : ''}
        </span>
        <button
          onClick={onSalvar}
          disabled={!rascunho.trim() || !alterado}
          className="rounded-lg px-3.5 py-1.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: cor }}
        >
          Salvar
        </button>
      </div>
    </div>
  )
}
