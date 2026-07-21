import { useMemo, useState } from 'react'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { interpretar } from '../../../core/captura/interpretar'
import { aplicarInterpretacao } from '../../../core/captura/fluxos'
import { mostrarToast } from '../../../core/captura/store'
import type { Interpretacao, TipoCaptura } from '../../../core/captura/types'
import type { Pagina } from '../types'

type TipoExtrai = 'tarefa' | 'evento' | 'compra'
const OPCOES: { id: TipoExtrai; nome: string; emoji: string }[] = [
  { id: 'tarefa', nome: 'Tarefa', emoji: '✅' },
  { id: 'evento', nome: 'Evento', emoji: '📅' },
  { id: 'compra', nome: 'Compra', emoji: '🛒' },
]

interface Item {
  texto: string
  tipo: TipoExtrai
  incluir: boolean
  campos: Interpretacao['campos']
}

/** Extrai linhas da nota e sugere ações — o usuário confirma individualmente. */
function linhasDe(pagina: Pagina): string[] {
  const out: string[] = []
  for (const b of pagina.blocos) {
    if (b.tipo === 'titulo') continue
    for (const parte of (b.texto ?? '').split('\n')) {
      const t = parte.trim()
      if (t.length > 2) out.push(t)
    }
  }
  return [...new Set(out)].slice(0, 20)
}

export function ExtrairAcoes({ pagina, onFechar }: { pagina: Pagina; onFechar: () => void }) {
  const iniciais = useMemo<Item[]>(() => {
    return linhasDe(pagina).map((texto) => {
      const top = interpretar(texto)[0]
      const tipo: TipoExtrai = top && (top.tipo === 'evento' || top.tipo === 'compra') ? top.tipo : 'tarefa'
      return { texto, tipo, incluir: true, campos: top?.campos ?? { titulo: texto } }
    })
  }, [pagina])
  const [itens, setItens] = useState<Item[]>(iniciais)

  function set(i: number, m: Partial<Item>) {
    setItens((arr) => arr.map((x, idx) => (idx === i ? { ...x, ...m } : x)))
  }

  async function criar() {
    const alvos = itens.filter((x) => x.incluir)
    let n = 0
    for (const it of alvos) {
      const interp: Interpretacao = {
        tipo: it.tipo as TipoCaptura,
        campos: { ...it.campos, titulo: it.campos.titulo ?? it.texto },
        confianca: 'media',
        rotulo: 'extraído da nota',
      }
      const r = await aplicarInterpretacao(interp)
      if (r) n++
    }
    onFechar()
    if (n > 0) mostrarToast(`${n} ${n === 1 ? 'item criado' : 'itens criados'} a partir da nota`)
  }

  const total = itens.filter((x) => x.incluir).length

  return (
    <FolhaInferior titulo="Extrair ações da nota" onFechar={onFechar}>
      {itens.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-muted">Não encontrei linhas para transformar em ações.</p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="-mt-1 text-[12px] text-muted">Revise e confirme — nada é criado sem você marcar. A leitura é heurística.</p>
          <ul className="flex max-h-[50vh] flex-col gap-1.5 overflow-y-auto">
            {itens.map((it, i) => (
              <li key={i} className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 ${it.incluir ? 'border-line' : 'border-line opacity-50'}`}>
                <button onClick={() => set(i, { incluir: !it.incluir })} className={`flex size-5 shrink-0 items-center justify-center rounded-md text-[12px] ${it.incluir ? 'bg-accent text-white' : 'border border-line'}`}>{it.incluir ? '✓' : ''}</button>
                <span className="min-w-0 flex-1 truncate text-[13.5px]">{it.texto}</span>
                <select value={it.tipo} onChange={(e) => set(i, { tipo: e.target.value as TipoExtrai })} className="shrink-0 rounded-lg border border-line bg-surface px-1.5 py-1 text-[12px] text-ink outline-none">
                  {OPCOES.map((o) => <option key={o.id} value={o.id}>{o.emoji} {o.nome}</option>)}
                </select>
              </li>
            ))}
          </ul>
          <button onClick={criar} disabled={total === 0} className="mt-1 min-h-11 rounded-full bg-ink text-[14px] font-semibold text-surface disabled:opacity-40">
            Criar {total} {total === 1 ? 'item' : 'itens'}
          </button>
        </div>
      )}
    </FolhaInferior>
  )
}
