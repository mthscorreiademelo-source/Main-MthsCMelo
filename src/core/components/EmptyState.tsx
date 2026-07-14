import type { ReactNode } from 'react'

interface Props {
  icone: ReactNode
  titulo: string
  descricao?: string
}

export function EmptyState({ icone, titulo, descricao }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <div className="text-muted/60 [&_svg]:size-8">{icone}</div>
      <p className="text-sm font-medium text-muted">{titulo}</p>
      {descricao && <p className="max-w-xs text-sm text-muted/70">{descricao}</p>}
    </div>
  )
}
