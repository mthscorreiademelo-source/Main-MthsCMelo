import { useMemo, useState } from 'react'
import { EmptyState } from '../../../core/components/EmptyState'
import { IconLixeira, IconMais } from '../../../core/components/Icons'
import { useLivros } from '../hooks'
import { criarFlashcard, excluirFlashcard, revisarFlashcard, useFlashcards, useFlashcardsDevidos } from './db'
import type { Flashcard, Qualidade } from './tipos'

const NOTAS: { q: Qualidade; rotulo: string; cor: string }[] = [
  { q: 2, rotulo: 'Errei', cor: 'var(--vida-danger)' },
  { q: 4, rotulo: 'Bom', cor: 'var(--vida-accent)' },
  { q: 5, rotulo: 'Fácil', cor: '#16a34a' },
]

/** Flashcards com repetição espaçada (SM-2). Criação manual, 100% offline. */
export function PainelFlashcards() {
  const cards = useFlashcards()
  const devidos = useFlashcardsDevidos()
  const livros = useLivros()
  const [revisando, setRevisando] = useState(false)
  const [criando, setCriando] = useState(false)

  if (revisando && devidos) return <Revisao fila={devidos} onSair={() => setRevisando(false)} />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[13px] text-muted">
            {cards?.length ?? 0} {cards?.length === 1 ? 'cartão' : 'cartões'}
            {devidos && devidos.length > 0 ? ` · ${devidos.length} para revisar hoje` : ' · nada para hoje'}
          </p>
          <p className="text-[11.5px] text-muted/70">Repetição espaçada (SM-2), local e offline. Cartões criados por você.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setCriando((v) => !v)} className="flex min-h-9 items-center gap-1 rounded-full border border-line px-3 text-[13px] font-medium text-muted hover:text-ink">
            <IconMais width={15} height={15} /> Novo
          </button>
          {devidos && devidos.length > 0 && (
            <button onClick={() => setRevisando(true)} className="min-h-9 rounded-full bg-ink px-4 text-[13px] font-semibold text-surface hover:opacity-90">
              Revisar {devidos.length}
            </button>
          )}
        </div>
      </div>

      {criando && <FormNovo livros={livros ?? []} onPronto={() => setCriando(false)} />}

      {!cards || cards.length === 0 ? (
        !criando && <EmptyState icone={<span className="text-2xl">🧠</span>} titulo="Sem flashcards" descricao="Crie cartões (pergunta e resposta) e revise-os no tempo certo. Ótimo para o que você lê." />
      ) : (
        <ul className="flex flex-col gap-2">
          {cards.map((c) => (
            <li key={c.id} className="group flex items-start gap-2 rounded-xl border border-line p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">{c.frente}</p>
                <p className="truncate text-[12.5px] text-muted">{c.verso}</p>
                <p className="mt-0.5 text-[11px] text-muted/70">Próxima: {c.proximaRevisao}</p>
              </div>
              <button onClick={() => excluirFlashcard(c.id)} aria-label="Excluir cartão" className="shrink-0 rounded-full p-1.5 text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100">
                <IconLixeira width={15} height={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FormNovo({ livros, onPronto }: { livros: { id: string; titulo: string }[]; onPronto: () => void }) {
  const [frente, setFrente] = useState('')
  const [verso, setVerso] = useState('')
  const [livroId, setLivroId] = useState('')

  async function salvar() {
    const id = await criarFlashcard({ frente, verso, livroId: livroId || undefined })
    if (id) { setFrente(''); setVerso(''); onPronto() }
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface/50 p-3">
      <textarea value={frente} onChange={(e) => setFrente(e.target.value)} placeholder="Frente (pergunta)" rows={2} className="resize-none rounded-lg border border-line bg-bg px-3 py-2 text-[14px] outline-none focus:border-muted/50" />
      <textarea value={verso} onChange={(e) => setVerso(e.target.value)} placeholder="Verso (resposta)" rows={2} className="resize-none rounded-lg border border-line bg-bg px-3 py-2 text-[14px] outline-none focus:border-muted/50" />
      {livros.length > 0 && (
        <select value={livroId} onChange={(e) => setLivroId(e.target.value)} className="rounded-lg border border-line bg-bg px-2 py-2 text-[13px] text-ink outline-none">
          <option value="">Sem livro</option>
          {livros.map((l) => <option key={l.id} value={l.id}>{l.titulo}</option>)}
        </select>
      )}
      <div className="flex justify-end gap-2">
        <button onClick={onPronto} className="rounded-full px-3 py-1.5 text-[13px] text-muted hover:text-ink">Cancelar</button>
        <button onClick={salvar} disabled={!frente.trim() || !verso.trim()} className="rounded-full bg-ink px-4 py-1.5 text-[13px] font-semibold text-surface disabled:opacity-40">Criar</button>
      </div>
    </div>
  )
}

function Revisao({ fila, onSair }: { fila: Flashcard[]; onSair: () => void }) {
  // Congela a fila no início da sessão para não reordenar a cada resposta.
  const cartoes = useMemo(() => fila, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0)
  const [mostrou, setMostrou] = useState(false)
  const card = cartoes[i]

  async function responder(q: Qualidade) {
    if (card) await revisarFlashcard(card, q)
    setMostrou(false)
    setI((n) => n + 1)
  }

  if (!card) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <span className="text-4xl">🎉</span>
        <p className="text-[15px] font-semibold">Revisão concluída!</p>
        <p className="text-[13px] text-muted">Você revisou {cartoes.length} {cartoes.length === 1 ? 'cartão' : 'cartões'}.</p>
        <button onClick={onSair} className="rounded-full bg-ink px-5 py-2 text-[13px] font-semibold text-surface">Voltar</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-[12px] text-muted">
        <button onClick={onSair} className="hover:text-ink">← Sair</button>
        <span className="tabular-nums">{i + 1} / {cartoes.length}</span>
      </div>
      <div className="flex min-h-52 flex-col rounded-2xl border border-line bg-surface/40 p-5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted/70">Pergunta</span>
        <p className="mt-1.5 text-[17px] font-medium leading-snug">{card.frente}</p>
        {mostrou && (
          <>
            <span className="mt-4 border-t border-line pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted/70">Resposta</span>
            <p className="mt-1.5 text-[16px] leading-snug">{card.verso}</p>
          </>
        )}
      </div>
      {!mostrou ? (
        <button onClick={() => setMostrou(true)} className="min-h-12 rounded-full bg-ink text-[14px] font-semibold text-surface">Mostrar resposta</button>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {NOTAS.map((n) => (
            <button key={n.q} onClick={() => responder(n.q)} className="min-h-12 rounded-xl border-2 text-[13.5px] font-semibold transition-colors hover:bg-hover/50" style={{ borderColor: n.cor, color: n.cor }}>
              {n.rotulo}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
