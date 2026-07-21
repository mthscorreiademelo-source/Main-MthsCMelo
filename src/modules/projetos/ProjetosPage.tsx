import { useParams } from 'react-router-dom'
import { ListaProjetos } from './components/ListaProjetos'
import { ProjetoWorkspace } from './components/ProjetoWorkspace'
import { useProjetoWS } from './hooks'

function BoasVindas() {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line text-center">
      <span className="text-5xl">🗂️</span>
      <p className="text-[16px] font-semibold">Selecione um projeto</p>
      <p className="max-w-xs text-[13px] text-muted">Cada projeto é um espaço próprio — tarefas, agenda, notas, finanças e mais, tudo reunido e conectado ao restante do Lume.</p>
    </div>
  )
}

export function ProjetosPage() {
  const { id } = useParams<{ id: string }>()
  const projeto = useProjetoWS(id)

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-5">
      {/* Painel esquerdo: biblioteca de projetos */}
      <aside
        className={`w-full flex-col lg:sticky lg:top-0 lg:h-[calc(100vh-6.5rem)] lg:w-[336px] lg:shrink-0 ${id ? 'hidden lg:flex' : 'flex'}`}
      >
        <ListaProjetos selecionadoId={id} />
      </aside>

      {/* Painel direito: workspace do projeto */}
      <main className={`min-w-0 flex-1 ${id ? '' : 'hidden lg:block'}`}>
        {id ? (
          projeto === undefined ? (
            <p className="py-16 text-center text-[14px] text-muted">Carregando…</p>
          ) : projeto ? (
            <ProjetoWorkspace projeto={projeto} />
          ) : (
            <BoasVindas />
          )
        ) : (
          <BoasVindas />
        )}
      </main>
    </div>
  )
}
