import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db } from '../../../core/db/db'
import { IconCaneta, IconDocumento, IconMais } from '../../../core/components/Icons'
import { criarPagina, textoResumo } from '../../notas/db'
import { marcarAtividade } from '../db'

/** Bloco Notas — integrado: notas do Lume marcadas com este projeto. */
export function BlocoNotas({ projetoId }: { projetoId: string }) {
  const navigate = useNavigate()
  const paginas = useLiveQuery(
    async () => db.paginas.where('projetoId').equals(projetoId).reverse().sortBy('atualizadaEm'),
    [projetoId],
  )

  async function nova(tipo: 'texto' | 'desenho') {
    const id = await criarPagina(undefined, tipo)
    await db.paginas.update(id, { projetoId })
    await marcarAtividade(projetoId)
    navigate(`/notas/${id}`)
  }

  return (
    <div className="flex flex-col gap-2">
      {(paginas ?? []).length === 0 ? (
        <p className="text-[13px] text-muted">Anotações, ideias e desenhos do projeto. Também aparecem em Notas.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {(paginas ?? []).slice(0, 6).map((p) => (
            <li key={p.id}>
              <button onClick={() => navigate(`/notas/${p.id}`)} className="flex w-full items-center gap-2.5 py-2 text-left">
                <span className="flex size-8 items-center justify-center rounded-lg bg-hover text-[14px]">{p.tipo === 'desenho' ? '✏️' : '📝'}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{p.titulo || textoResumo(p) || 'Sem título'}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-1 flex gap-1.5">
        <button onClick={() => nova('texto')} className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line text-[13px] font-medium text-muted hover:text-ink">
          <IconMais width={14} height={14} /> Texto
        </button>
        <button onClick={() => nova('desenho')} className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line text-[13px] font-medium text-muted hover:text-ink">
          <IconCaneta width={14} height={14} /> Desenho
        </button>
        {(paginas ?? []).length > 6 && (
          <button onClick={() => navigate('/notas')} className="flex min-h-9 items-center justify-center rounded-lg px-2 text-[13px] text-muted"><IconDocumento width={14} height={14} /></button>
        )}
      </div>
    </div>
  )
}
