import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { EmptyState } from '../../core/components/EmptyState'
import { IconButton } from '../../core/components/Button'
import {
  IconCaneta,
  IconDocumento,
  IconLapis,
  IconMais,
  IconSetaEsquerda,
} from '../../core/components/Icons'
import { GrupoEditorSheet } from './components/GrupoEditorSheet'
import { ListaPaginas } from './components/ListaPaginas'
import { criarPagina } from './db'
import { useGrupos, usePaginas } from './hooks'

export function GrupoPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const grupos = useGrupos()
  const paginas = usePaginas()
  const [editando, setEditando] = useState(false)

  const grupo = grupos?.find((g) => g.id === id) ?? null
  const doGrupo = useMemo(
    () => (paginas ?? []).filter((p) => p.grupoId === id),
    [paginas, id],
  )

  // Grupos carregados e este id não existe (ex.: excluído) → volta à galeria
  if (grupos && !grupo) return <Navigate to="/notas" replace />
  if (!grupo) return null

  async function novaPagina(tipo: 'texto' | 'desenho' = 'texto') {
    const novoId = await criarPagina(id, tipo)
    navigate(`/notas/${novoId}`)
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-2">
        <IconButton onClick={() => navigate('/notas')} aria-label="Voltar para Notas">
          <IconSetaEsquerda />
        </IconButton>
        {grupo.capa && (
          <img
            src={grupo.capa}
            alt=""
            className="h-12 w-[38px] shrink-0 rounded-md border border-line object-cover"
          />
        )}
        <h1 className="min-w-0 flex-1 truncate text-2xl font-bold tracking-tight">
          {grupo.nome}
        </h1>
        <IconButton onClick={() => setEditando(true)} aria-label="Editar grupo">
          <IconLapis />
        </IconButton>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => novaPagina('texto')}
          className="flex min-h-12 flex-1 cursor-pointer items-center gap-1 rounded-lg border border-line bg-surface/60 px-2 text-[15px] text-muted transition-colors hover:border-muted/50 hover:text-ink"
        >
          <span className="flex size-11 items-center justify-center">
            <IconMais />
          </span>
          Nova página em {grupo.nome}
        </button>
        <button
          onClick={() => novaPagina('desenho')}
          className="flex min-h-12 flex-1 cursor-pointer items-center gap-1 rounded-lg border border-line bg-surface/60 px-2 text-[15px] text-muted transition-colors hover:border-muted/50 hover:text-ink"
        >
          <span className="flex size-11 items-center justify-center">
            <IconCaneta width={18} height={18} />
          </span>
          Novo desenho
        </button>
      </div>

      {paginas && doGrupo.length === 0 && (
        <EmptyState
          icone={<IconDocumento />}
          titulo="Grupo vazio"
          descricao="Crie uma página aqui ou mova notas existentes pelo editor."
        />
      )}
      <ListaPaginas paginas={doGrupo} />

      <GrupoEditorSheet
        aberto={editando}
        grupo={grupo}
        onFechar={() => setEditando(false)}
        onExcluido={() => navigate('/notas')}
      />
    </div>
  )
}
