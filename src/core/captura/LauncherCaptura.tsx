import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { hojeISO } from '../dates'
import { db } from '../db/db'
import { IconSetaEsquerda } from '../components/Icons'
import { QuickAdd } from '../../modules/tarefas/components/QuickAdd'
import { useProjetos } from '../../modules/tarefas/hooks'
import { AddMovimento } from '../../modules/financas/components/AddMovimento'
import { EditorEvento } from '../../modules/agenda/components/EditorEvento'
import { useCronogramas } from '../../modules/agenda/hooks'
import { criarEvento } from '../../modules/agenda/db'
import { criarPagina } from '../../modules/notas/db'
import { criarItemCompra, criarLista } from '../../modules/compras/db'
import { useListas } from '../../modules/compras/hooks'
import type { Evento } from '../../modules/agenda/types'
import { ACOES, GRUPOS, type IdAcao } from './acoes'
import { desfazer } from './fluxos'
import { CapturaUniversal } from './CapturaUniversal'
import { CaixaEntrada } from './CaixaEntrada'
import { useCaixaEntrada } from './db'
import { abrirCaixa, abrirLauncher, fecharCaixa, fecharLauncher, mostrarToast, useLauncher } from './store'

/* --------------------------- Formulário de compra ------------------------- */

function FormCompra({ aoConcluir }: { aoConcluir: (id?: string) => void }) {
  const listas = useListas()
  const [nome, setNome] = useState('')
  const [listaId, setListaId] = useState('')

  useEffect(() => {
    if (!listaId && listas && listas.length > 0) setListaId(listas[0].id)
  }, [listas, listaId])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    const alvo = listaId || (listas && listas[0]?.id) || (await criarLista({ nome: 'Compras', icone: '🛒' }))
    const id = await criarItemCompra({ listaId: alvo, nome: nome.trim(), origem: 'manual' })
    setNome('')
    aoConcluir(id)
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      <input
        autoFocus
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="O que comprar? ex.: Café"
        className="min-h-12 rounded-xl border border-line bg-surface/60 px-3.5 text-[15px] outline-none focus:border-muted/50"
      />
      {listas && listas.length > 1 && (
        <label className="flex items-center justify-between gap-2 text-[13px] text-muted">
          Lista
          <select value={listaId} onChange={(e) => setListaId(e.target.value)} className="min-h-9 rounded-lg border border-line bg-surface px-2 text-[13px] text-ink outline-none">
            {listas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        </label>
      )}
      <button type="submit" disabled={!nome.trim()} className="min-h-11 rounded-full bg-ink text-[14px] font-semibold text-surface disabled:opacity-40">
        Adicionar à lista
      </button>
    </form>
  )
}

/* -------------------------------- Launcher -------------------------------- */

export function LauncherCaptura() {
  const { aberto, aba, textoInicial, caixa } = useLauncher()
  const navigate = useNavigate()
  const projetos = useProjetos()
  const cronogramas = useCronogramas()
  const pendentes = useCaixaEntrada()
  const [fluxo, setFluxo] = useState<IdAcao | null>(null)
  const [eventoEdit, setEventoEdit] = useState<Evento | null>(null)

  useEffect(() => { if (aberto) setFluxo(null) }, [aberto])

  // Atalhos globais de teclado (desktop/tablet com teclado).
  useEffect(() => {
    async function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      if (e.key.toLowerCase() === 'k' && !e.shiftKey) {
        e.preventDefault()
        abrirLauncher('universal')
      } else if (e.key.toLowerCase() === 'n' && e.shiftKey) {
        e.preventDefault()
        const pid = await criarPagina()
        fecharLauncher()
        navigate(`/notas/${pid}`)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  function fecharTudo() {
    fecharLauncher()
    setFluxo(null)
  }

  function confirmar(texto: string, colecao: Parameters<typeof desfazer>[0], id?: string) {
    if (id) mostrarToast(texto, () => desfazer(colecao, id))
    fecharTudo()
  }

  async function escolher(id: IdAcao) {
    switch (id) {
      case 'nota': {
        const pid = await criarPagina()
        fecharTudo()
        navigate(`/notas/${pid}`)
        break
      }
      case 'desenho': {
        const pid = await criarPagina(undefined, 'desenho')
        fecharTudo()
        navigate(`/notas/${pid}`)
        break
      }
      case 'evento': {
        const evId = await criarEvento({ titulo: '', data: hojeISO() })
        const ev = await db.eventos.get(evId)
        fecharLauncher()
        setFluxo(null)
        setEventoEdit(ev ?? null)
        break
      }
      default:
        setFluxo(id)
    }
  }

  // Editor de evento (abre por cima, sem o launcher).
  if (eventoEdit) {
    return (
      <EditorEvento
        evento={eventoEdit}
        cronogramas={cronogramas ?? []}
        onFechar={() => setEventoEdit(null)}
      />
    )
  }

  if (caixa) return <CaixaEntrada onFechar={fecharCaixa} />

  if (!aberto) return null

  const tituloFluxo: Record<IdAcao, string> = {
    tarefa: 'Nova tarefa', evento: 'Novo evento', nota: 'Nova nota', desenho: 'Novo desenho',
    despesa: 'Nova despesa', receita: 'Nova receita', compra: 'Item de compra',
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-start sm:pt-[9vh]">
      <button className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" aria-label="Fechar" onClick={fecharTudo} />
      <div className="animar-passo relative flex max-h-[90%] w-full flex-col overflow-y-auto rounded-t-3xl bg-bg px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-2xl sm:max-w-lg sm:rounded-3xl sm:pb-5">
        <div className="mx-auto mb-1 h-1 w-9 shrink-0 rounded-full bg-line sm:hidden" />

        {fluxo ? (
          <>
            <div className="mb-3 flex items-center gap-2">
              <button onClick={() => setFluxo(null)} aria-label="Voltar" className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink"><IconSetaEsquerda width={18} height={18} /></button>
              <span className="text-[15px] font-bold">{tituloFluxo[fluxo]}</span>
            </div>
            {fluxo === 'tarefa' && (
              <QuickAdd projetos={projetos ?? []} dataPadrao={hojeISO()} autoFocus placeholder="Ex.: Revisar proposta amanhã p1" aoConcluir={(id) => confirmar('Tarefa criada', 'tasks', id)} />
            )}
            {(fluxo === 'despesa' || fluxo === 'receita') && (
              <AddMovimento tipoInicial={fluxo === 'receita' ? 'entrada' : 'saida'} aoConcluir={(id) => confirmar(fluxo === 'receita' ? 'Receita registrada' : 'Despesa registrada', 'movimentos', id)} />
            )}
            {fluxo === 'compra' && (
              <FormCompra aoConcluir={(id) => confirmar('Item adicionado à lista', 'comprasItens', id)} />
            )}
          </>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[16px] font-bold">Captura rápida</span>
              <button onClick={fecharTudo} aria-label="Fechar" className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink">×</button>
            </div>

            <CapturaUniversal textoInicial={textoInicial} autoFocus={aba === 'universal'} aoFechar={fecharTudo} />

            <div className="my-3 flex items-center gap-2 text-[11px] text-muted/70">
              <span className="h-px flex-1 bg-line" /> ou escolha uma ação <span className="h-px flex-1 bg-line" />
            </div>

            <div className="flex flex-col gap-3">
              {GRUPOS.map((g) => {
                const acoes = ACOES.filter((a) => a.grupo === g.id)
                if (acoes.length === 0) return null
                return (
                  <div key={g.id}>
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">{g.nome}</span>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {acoes.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => escolher(a.id)}
                          className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-surface/40 px-1 py-3 text-center transition-colors hover:bg-hover/50"
                        >
                          <span className="flex size-10 items-center justify-center rounded-xl text-[20px]" style={{ backgroundColor: `color-mix(in srgb, ${a.cor} 15%, var(--vida-surface))` }}>{a.emoji}</span>
                          <span className="text-[12px] font-medium leading-tight">{a.nome}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <button onClick={abrirCaixa} className="mt-3 flex items-center justify-center gap-1.5 rounded-full border border-line py-2 text-[12.5px] font-medium text-muted hover:text-ink">
              📥 Caixa de entrada{pendentes && pendentes.length > 0 ? ` · ${pendentes.length}` : ''}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
