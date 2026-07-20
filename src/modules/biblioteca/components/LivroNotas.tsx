import { useState } from 'react'
import { IconLixeira, IconMais } from '../../../core/components/Icons'
import { CORES_DESTAQUE, criarDestaque, criarNota, removerDestaque, removerNota } from '../db'
import { useDestaquesLivro, useNotasLivro } from '../hooks'

/** Aba de Notas ou Destaques do Workspace do Livro. */
export function LivroNotas({ livroId, modo }: { livroId: string; modo: 'notas' | 'destaques' }) {
  const notas = useNotasLivro(livroId) ?? []
  const destaques = useDestaquesLivro(livroId) ?? []
  const [novo, setNovo] = useState(false)
  const [trecho, setTrecho] = useState('')
  const [resumo, setResumo] = useState('')
  const [capitulo, setCapitulo] = useState('')
  const [cor, setCor] = useState(CORES_DESTAQUE[0])

  async function salvar() {
    if (modo === 'notas') {
      if (!resumo.trim()) return
      await criarNota({ livroId, resumo, trecho: trecho.trim() || undefined, capitulo: capitulo.trim() || undefined })
    } else {
      if (!trecho.trim()) return
      await criarDestaque({ livroId, trecho, capitulo: capitulo.trim() || undefined, cor })
    }
    setTrecho(''); setResumo(''); setCapitulo(''); setNovo(false)
  }

  return (
    <div className="flex flex-col gap-3">
      {modo === 'notas'
        ? [...notas].sort((a, b) => b.criadoEm - a.criadoEm).map((n) => (
            <div key={n.id} className="rounded-xl border border-line p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {n.capitulo && <span className="text-[11px] font-medium text-muted">{n.capitulo}</span>}
                  {n.trecho && <p className="my-1 border-l-2 border-accent pl-2 text-[13px] italic text-muted">"{n.trecho}"</p>}
                  <p className="text-[14.5px] leading-snug">{n.resumo}</p>
                </div>
                <button onClick={() => removerNota(n.id)} aria-label="Excluir" className="shrink-0 text-danger/70 hover:text-danger"><IconLixeira width={15} height={15} /></button>
              </div>
            </div>
          ))
        : [...destaques].sort((a, b) => b.criadoEm - a.criadoEm).map((d) => (
            <div key={d.id} className="flex items-start gap-3 rounded-xl border border-line p-3">
              <span className="mt-0.5 h-full min-h-8 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: d.cor }} />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] italic">"{d.trecho}"</p>
                {d.capitulo && <span className="mt-1 block text-[11px] text-muted">{d.capitulo}</span>}
              </div>
              <button onClick={() => removerDestaque(d.id)} aria-label="Excluir" className="shrink-0 text-danger/70 hover:text-danger"><IconLixeira width={15} height={15} /></button>
            </div>
          ))}

      {(modo === 'notas' ? notas : destaques).length === 0 && !novo && (
        <p className="text-[13px] text-muted">Selecione um trecho durante a leitura para criar {modo === 'notas' ? 'notas' : 'destaques'}, ou adicione manualmente abaixo.</p>
      )}

      {novo ? (
        <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
          <input value={capitulo} onChange={(e) => setCapitulo(e.target.value)} placeholder="Capítulo (opcional)" className="min-h-9 rounded-lg border border-line bg-surface px-2.5 text-[13px] outline-none" />
          <textarea value={trecho} onChange={(e) => setTrecho(e.target.value)} rows={2} placeholder={modo === 'destaques' ? 'Trecho destacado' : 'Trecho citado (opcional)'} className="resize-none rounded-lg border border-line bg-surface px-2.5 py-2 text-[14px] outline-none" />
          {modo === 'notas' && <textarea value={resumo} onChange={(e) => setResumo(e.target.value)} rows={3} placeholder="Sua anotação" className="resize-none rounded-lg border border-line bg-surface px-2.5 py-2 text-[14px] outline-none" />}
          {modo === 'destaques' && (
            <div className="flex gap-1.5">{CORES_DESTAQUE.map((c) => <button key={c} onClick={() => setCor(c)} className={`size-6 rounded-full ${cor === c ? 'ring-2 ring-ink ring-offset-1' : ''}`} style={{ backgroundColor: c }} aria-label={c} />)}</div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setNovo(false)} className="rounded-full px-3 py-1.5 text-[13px] text-muted">Cancelar</button>
            <button onClick={salvar} className="rounded-full bg-ink px-4 py-1.5 text-[13px] font-medium text-surface">Salvar</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setNovo(true)} className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-3 text-[13px] font-medium text-muted hover:text-ink">
          <IconMais width={15} height={15} /> Adicionar {modo === 'notas' ? 'nota' : 'destaque'}
        </button>
      )}
    </div>
  )
}
