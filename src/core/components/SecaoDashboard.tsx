import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/**
 * Cabeçalho padrão de uma seção do dashboard (tela Hoje).
 * Mantém consistência visual entre as contribuições de cada módulo.
 */
export function SecaoDashboard({
  titulo,
  contagem,
  verTodos,
  children,
}: {
  titulo: string
  contagem?: number
  verTodos?: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[13px] font-medium text-muted">
          {titulo}
          {contagem != null && ` · ${contagem}`}
        </h2>
        {verTodos && (
          <Link to={verTodos} className="text-[13px] text-muted transition-colors hover:text-ink">
            ver todos
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}
