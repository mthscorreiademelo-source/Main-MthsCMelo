import { IconEstrela } from '../../../core/components/Icons'

/** Nota em estrelas (0–5). Se `onChange` for dado, é clicável. */
export function EstrelasNota({
  nota,
  onChange,
  tamanho = 20,
}: {
  nota: number
  onChange?: (n: number) => void
  tamanho?: number
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const ativa = n <= nota
        const estrela = (
          <IconEstrela
            width={tamanho}
            height={tamanho}
            className={ativa ? 'text-amber-400' : 'text-line'}
            fill={ativa ? 'currentColor' : 'none'}
          />
        )
        if (!onChange) return <span key={n}>{estrela}</span>
        return (
          <button
            key={n}
            type="button"
            aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
            onClick={() => onChange(nota === n ? 0 : n)}
            className="cursor-pointer p-0.5 transition-transform hover:scale-110"
          >
            {estrela}
          </button>
        )
      })}
    </div>
  )
}
