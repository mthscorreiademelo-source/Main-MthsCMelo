import { IconEstrela } from '../../../core/components/Icons'

/**
 * Nota em estrelas com meia-estrela (0–5, passo 0,5). Se `onChange` for dado,
 * é clicável: clicar na metade esquerda de uma estrela dá .5; na direita, cheia.
 */
export function EstrelasNota({
  nota,
  onChange,
  tamanho = 20,
}: {
  nota: number
  onChange?: (n: number) => void
  tamanho?: number
}) {
  const estrela = (preenchimento: number) => (
    <span className="relative inline-block align-middle" style={{ width: tamanho, height: tamanho }}>
      <IconEstrela width={tamanho} height={tamanho} className="absolute inset-0 text-line" fill="none" />
      {preenchimento > 0 && (
        <span
          className="absolute inset-0 overflow-hidden"
          style={{ width: tamanho * Math.min(1, preenchimento) }}
        >
          <IconEstrela
            width={tamanho}
            height={tamanho}
            className="max-w-none text-amber-400"
            fill="currentColor"
          />
        </span>
      )}
    </span>
  )

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const preenchimento = nota - (n - 1) // 1 = cheia, 0.5 = meia, ≤0 = vazia
        if (!onChange) return <span key={n}>{estrela(preenchimento)}</span>
        return (
          <button
            key={n}
            type="button"
            aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const meia = e.clientX - rect.left < rect.width / 2
              const valor = meia ? n - 0.5 : n
              onChange(nota === valor ? 0 : valor)
            }}
            className="cursor-pointer p-0.5 transition-transform hover:scale-110"
          >
            {estrela(preenchimento)}
          </button>
        )
      })}
    </div>
  )
}
