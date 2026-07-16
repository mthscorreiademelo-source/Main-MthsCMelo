import { Component, type ReactNode } from 'react'

interface Estado {
  erro: Error | null
}

/** Rede de segurança: um erro de renderização mostra uma tela amigável em vez de branco. */
export class ErrorBoundary extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { erro: null }

  static getDerivedStateFromError(erro: Error): Estado {
    return { erro }
  }

  componentDidCatch(erro: Error) {
    console.error('[lume] erro de renderização:', erro)
  }

  render() {
    if (!this.state.erro) return this.props.children
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-bg px-6 py-20 text-center text-ink">
        <p className="text-lg font-semibold">Algo deu errado ao exibir esta tela</p>
        <p className="max-w-sm text-sm text-muted">
          Seus dados estão salvos. Tente recarregar; se persistir, volte ao início.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => window.location.reload()}
            className="min-h-11 rounded-lg bg-ink px-4 text-sm font-medium text-surface"
          >
            Recarregar
          </button>
          <button
            onClick={() => {
              window.location.hash = '#/'
              window.location.reload()
            }}
            className="min-h-11 rounded-lg border border-line px-4 text-sm font-medium text-muted"
          >
            Ir para o início
          </button>
        </div>
      </div>
    )
  }
}
