import { useRef, useState } from 'react'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { hojeISO } from '../../../core/dates'
import { criarMovimento, formatarBRL, parsearValor, valorParaTexto } from '../../financas/db'
import { criarDespensa, criarItemCompra, logMov } from '../db'
import { parseNota, reconhecerTexto } from '../ocr'
import { useListas } from '../hooks'

interface Linha { nome: string; preco: string; incluir: boolean }

/** Fluxo real de OCR (Tesseract.js): foto → texto → revisão → salvar. */
export function ImportarNotaFiscal({ onFechar }: { onFechar: () => void }) {
  const listas = useListas()
  const fileRef = useRef<HTMLInputElement>(null)
  const [fase, setFase] = useState<'inicio' | 'lendo' | 'revisao'>('inicio')
  const [progresso, setProgresso] = useState(0)
  const [estabelecimento, setEstabelecimento] = useState('')
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [total, setTotal] = useState('')
  const [destino, setDestino] = useState<'despensa' | 'lista'>('despensa')
  const [listaId, setListaId] = useState('')
  const [financas, setFinancas] = useState(true)

  async function processar(file: File) {
    setFase('lendo'); setProgresso(0)
    try {
      const texto = await reconhecerTexto(file, setProgresso)
      const nota = parseNota(texto)
      setEstabelecimento(nota.estabelecimento ?? '')
      setLinhas(nota.itens.map((i) => ({ nome: i.nome, preco: i.precoCentavos ? valorParaTexto(i.precoCentavos) : '', incluir: true })))
      setTotal(nota.totalCentavos ? valorParaTexto(nota.totalCentavos) : '')
      if (listas && listas.length > 0) setListaId(listas[0].id)
      setFase('revisao')
    } catch {
      setFase('inicio')
      alert('Não foi possível ler a imagem. Tente uma foto mais nítida e bem iluminada.')
    }
  }

  async function confirmar() {
    const incluidas = linhas.filter((l) => l.incluir && l.nome.trim())
    for (const l of incluidas) {
      const centavos = l.preco ? parsearValor(l.preco) ?? undefined : undefined
      if (destino === 'despensa') {
        const id = await criarDespensa({ nome: l.nome.trim(), categoria: 'outros', unidade: 'un', quantidadeFechados: 1, ultimaCompraEm: hojeISO() })
        await logMov(id, 'compra', { quantidade: 1, precoCentavos: centavos, loja: estabelecimento.trim() || undefined })
      } else if (listaId) {
        await criarItemCompra({ listaId, nome: l.nome.trim(), precoEstimadoCentavos: centavos, origem: 'notafiscal' })
      }
    }
    if (financas) {
      const totCent = total ? parsearValor(total) ?? undefined : undefined
      if (totCent) await criarMovimento({ tipo: 'saida', valorCentavos: totCent, descricao: estabelecimento.trim() || 'Compra', data: hojeISO(), categoria: 'Alimentação' })
    }
    onFechar()
  }

  return (
    <FolhaInferior titulo="Importar nota fiscal / foto" onFechar={onFechar}>
      {fase === 'inicio' && (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] leading-snug text-muted">Fotografe (ou selecione) a nota fiscal ou a embalagem. O texto é reconhecido <b>no próprio aparelho</b> (Tesseract) — nada é enviado para fora. Você revisa tudo antes de salvar.</p>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processar(f); e.target.value = '' }} />
          <button onClick={() => fileRef.current?.click()} className="min-h-12 rounded-xl bg-ink text-[15px] font-semibold text-surface">📷 Escolher / fotografar</button>
          <p className="text-[11px] text-muted">Na 1ª vez, o reconhecimento baixa o pacote de idioma (precisa de internet). Depois roda offline.</p>
        </div>
      )}

      {fase === 'lendo' && (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-[14px] font-medium">Lendo a imagem…</p>
          <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-hover">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.round(progresso * 100)}%` }} />
          </div>
          <p className="text-[12px] text-muted">{Math.round(progresso * 100)}%</p>
        </div>
      )}

      {fase === 'revisao' && (
        <div className="flex flex-col gap-3">
          <label className="block"><span className="text-[12px] font-medium text-muted">Estabelecimento</span>
            <input className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none" value={estabelecimento} onChange={(e) => setEstabelecimento(e.target.value)} placeholder="Loja" />
          </label>

          <div>
            <span className="text-[12px] font-medium text-muted">Itens detectados ({linhas.filter((l) => l.incluir).length}/{linhas.length})</span>
            {linhas.length === 0 ? (
              <p className="mt-1 text-[12.5px] text-muted">Não consegui separar itens automaticamente. Ajuste o estabelecimento/total e registre em Finanças, ou tente uma foto melhor.</p>
            ) : (
              <ul className="mt-1.5 flex max-h-56 flex-col gap-1 overflow-y-auto">
                {linhas.map((l, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <input type="checkbox" checked={l.incluir} onChange={(e) => setLinhas((p) => p.map((x, j) => (j === i ? { ...x, incluir: e.target.checked } : x)))} className="size-4 accent-[var(--vida-accent)]" />
                    <input value={l.nome} onChange={(e) => setLinhas((p) => p.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))} className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-[13px] outline-none" />
                    <input value={l.preco} onChange={(e) => setLinhas((p) => p.map((x, j) => (j === i ? { ...x, preco: e.target.value } : x)))} placeholder="R$" className="w-16 rounded-lg border border-line bg-surface px-1.5 py-1.5 text-center text-[12.5px] outline-none" />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <span className="text-[12px] font-medium text-muted">Adicionar itens a</span>
            <div className="mt-1.5 flex gap-1.5">
              <button onClick={() => setDestino('despensa')} className={`flex-1 rounded-xl border px-2 py-2 text-[13px] font-medium ${destino === 'despensa' ? 'border-ink bg-hover text-ink' : 'border-line text-muted'}`}>Despensa</button>
              <button onClick={() => setDestino('lista')} className={`flex-1 rounded-xl border px-2 py-2 text-[13px] font-medium ${destino === 'lista' ? 'border-ink bg-hover text-ink' : 'border-line text-muted'}`}>Lista</button>
            </div>
            {destino === 'lista' && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(listas ?? []).map((l) => (
                  <button key={l.id} onClick={() => setListaId(l.id)} className={`rounded-full border px-2.5 py-1 text-[12px] font-medium ${listaId === l.id ? 'border-ink bg-ink text-surface' : 'border-line text-muted'}`}>{l.icone} {l.nome}</button>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5">
            <span className="text-[13.5px] font-medium">Registrar total em Finanças {total ? `(${formatarBRL(parsearValor(total) ?? 0)})` : ''}</span>
            <input type="checkbox" checked={financas} onChange={(e) => setFinancas(e.target.checked)} className="size-4 accent-[var(--vida-accent)]" />
          </label>
          {financas && (
            <label className="block"><span className="text-[12px] font-medium text-muted">Total</span>
              <input inputMode="decimal" className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="R$ 0,00" />
            </label>
          )}

          <button onClick={confirmar} className="mt-1 min-h-11 rounded-xl bg-ink text-[14px] font-semibold text-surface">Confirmar importação</button>
        </div>
      )}
    </FolhaInferior>
  )
}
