import { useMemo, useRef, useState, useEffect } from 'react'
import { rotuloData } from '../dates'
import { formatarBRL } from '../../modules/financas/db'
import { interpretar } from './interpretar'
import { aplicarInterpretacao, desfazer } from './fluxos'
import { criarCaptura } from './db'
import { mostrarToast } from './store'
import { CONF, TIPO_INFO } from './rotulos'
import { useFontesTokens, resolverTokens, tokenAtivo, sugestoesPara, type Sugestao } from './tokens'
import type { Interpretacao } from './types'

function resumoCampos(i: Interpretacao): string {
  const c = i.campos
  const p: string[] = []
  if (c.valorCentavos != null) p.push(formatarBRL(c.valorCentavos))
  if (c.projetoNome) p.push(`# ${c.projetoNome}`)
  if (c.categoria) p.push(c.categoria)
  if (c.data) p.push(rotuloData(c.data))
  if (c.horaInicio) p.push(c.horaInicio)
  if (c.duracaoMin) p.push(`${c.duracaoMin} min`)
  if (c.pessoa) p.push(`com ${c.pessoa}`)
  if (c.local) p.push(`📍 ${c.local}`)
  return p.join(' · ')
}

const COR_TOKEN: Record<Sugestao['tipo'], string> = {
  projeto: '#6366f1',
  categoria: '#0ea5e9',
  pessoa: '#f59e0b',
}

export function CapturaUniversal({ textoInicial, autoFocus, aoFechar }: {
  textoInicial?: string
  autoFocus?: boolean
  aoFechar: () => void
}) {
  const [texto, setTexto] = useState(textoInicial ?? '')
  const [analisado, setAnalisado] = useState<string | null>(null)
  const [caret, setCaret] = useState(0)
  const ref = useRef<HTMLTextAreaElement>(null)
  const fontes = useFontesTokens()

  useEffect(() => { if (autoFocus) ref.current?.focus() }, [autoFocus])

  // Aplica os tokens (#/@) resolvidos sobre cada candidato heurístico.
  const comTokens = useMemo(() => {
    return (t: string): Interpretacao[] => {
      const tk = resolverTokens(t, fontes)
      const base = tk.textoLimpo.trim().length > 1 ? tk.textoLimpo : t
      const extra: Partial<Interpretacao['campos']> = {}
      if (tk.pessoa) extra.pessoa = tk.pessoa
      if (tk.categoria) extra.categoria = tk.categoria
      if (tk.projetoId) { extra.projetoId = tk.projetoId; extra.projetoNome = tk.projetoNome }
      return interpretar(base).map((i) => ({ ...i, campos: { ...i.campos, ...extra } }))
    }
  }, [fontes])

  const cands = useMemo(() => (analisado ? comTokens(analisado) : []), [analisado, comTokens])
  const previa = useMemo(() => (texto.trim().length > 2 ? comTokens(texto)[0] : null), [texto, comTokens])

  const ativo = useMemo(() => (analisado ? null : tokenAtivo(texto, caret)), [texto, caret, analisado])
  const sugestoes = useMemo(() => (ativo ? sugestoesPara(ativo, fontes) : []), [ativo, fontes])

  function sincronizarCaret() {
    const el = ref.current
    if (el) setCaret(el.selectionStart ?? el.value.length)
  }

  function aplicarSugestao(s: Sugestao) {
    if (!ativo) return
    const el = ref.current
    const pos = el?.selectionStart ?? caret
    const antes = texto.slice(0, ativo.inicio)
    const depois = texto.slice(pos)
    const inserido = `${ativo.sigilo}${s.token} `
    const novo = antes + inserido + depois
    setTexto(novo)
    if (analisado) setAnalisado(null)
    const novoCaret = (antes + inserido).length
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(novoCaret, novoCaret)
      setCaret(novoCaret)
    })
  }

  function analisar() {
    if (texto.trim().length < 2) return
    setAnalisado(texto)
  }

  async function salvar(i: Interpretacao) {
    const r = await aplicarInterpretacao(i)
    aoFechar()
    if (r) mostrarToast(r.confirmacao, () => desfazer(r.colecao, r.id))
  }

  async function paraCaixa() {
    const melhor = cands[0] ?? comTokens(texto)[0]
    await criarCaptura({
      origem: 'universal',
      textoBruto: texto.trim(),
      tipoSugerido: melhor?.tipo,
      interpretacao: melhor,
      confianca: melhor?.confianca,
      status: 'aguardando',
    })
    aoFechar()
    mostrarToast('Salvo na Caixa de entrada')
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative rounded-2xl border border-line bg-surface/60 focus-within:border-muted/50">
        <textarea
          ref={ref}
          value={texto}
          onChange={(e) => { setTexto(e.target.value); setCaret(e.target.selectionStart ?? 0); if (analisado) setAnalisado(null) }}
          onKeyUp={sincronizarCaret}
          onClick={sincronizarCaret}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); analisar() }
          }}
          rows={2}
          placeholder="Digite ou cole qualquer coisa… ex.: Comprar café amanhã · Ligar #Trabalho @Ana"
          className="w-full resize-none bg-transparent px-3.5 py-3 text-[15px] leading-snug outline-none placeholder:text-muted/60"
        />

        {ativo && sugestoes.length > 0 && (
          <div className="absolute inset-x-2 top-full z-10 -mt-1 overflow-hidden rounded-xl border border-line bg-bg shadow-lg">
            {sugestoes.map((s) => (
              <button
                key={`${s.tipo}:${s.token}`}
                onMouseDown={(e) => { e.preventDefault(); aplicarSugestao(s) }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-hover"
              >
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: s.cor ?? COR_TOKEN[s.tipo] }} />
                <span className="min-w-0 flex-1 truncate">{s.rotulo}</span>
                <span className="shrink-0 text-[10.5px] uppercase tracking-wide text-muted/70">{s.tipo}</span>
              </button>
            ))}
          </div>
        )}

        {previa && !analisado && !ativo && (
          <div className="flex items-center gap-1.5 border-t border-line/70 px-3.5 py-1.5 text-[11.5px] text-muted">
            <span>{TIPO_INFO[previa.tipo].emoji}</span>
            <span>Palpite: <b className="font-semibold text-ink">{TIPO_INFO[previa.tipo].nome}</b></span>
            <span className="text-muted/60">— confirme antes de salvar</span>
          </div>
        )}
      </div>

      {!analisado && (
        <p className="-mt-1 px-1 text-[11px] text-muted/70">
          Atalhos: <b className="font-semibold">#</b> projeto ou categoria · <b className="font-semibold">@</b> pessoa
        </p>
      )}

      {!analisado ? (
        <button
          onClick={analisar}
          disabled={texto.trim().length < 2}
          className="flex min-h-11 items-center justify-center rounded-full bg-ink text-[14px] font-semibold text-surface disabled:opacity-40"
        >
          Interpretar
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">Como guardar?</span>
            <span className="text-[10.5px] text-muted/70">interpretação automática (heurística)</span>
          </div>
          {cands.map((i, idx) => {
            const info = TIPO_INFO[i.tipo]
            const resumo = resumoCampos(i)
            return (
              <button
                key={i.tipo}
                onClick={() => salvar(i)}
                className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition-colors hover:bg-hover/50 ${idx === 0 ? 'border-accent/40 bg-accent/[0.05]' : 'border-line'}`}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-hover text-[18px]">{info.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold">{info.nome}</span>
                    <span className="inline-flex items-center gap-1 text-[10.5px] text-muted">
                      <span className="size-1.5 rounded-full" style={{ backgroundColor: CONF[i.confianca].c }} />
                      {CONF[i.confianca].t}
                    </span>
                  </span>
                  {resumo && <span className="mt-0.5 block truncate text-[12px] text-muted">{resumo}</span>}
                  <span className="mt-0.5 block text-[11.5px] text-muted/80">{i.rotulo}</span>
                </span>
              </button>
            )
          })}
          <div className="mt-1 flex items-center justify-between gap-2">
            <button onClick={paraCaixa} className="text-[12.5px] font-medium text-muted hover:text-ink">Guardar na Caixa de entrada</button>
            <button onClick={() => setAnalisado(null)} className="text-[12.5px] text-muted hover:text-ink">Editar texto</button>
          </div>
        </div>
      )}
    </div>
  )
}
