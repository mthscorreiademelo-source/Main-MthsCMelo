import { useMemo, useRef, useState, useEffect } from 'react'
import { rotuloData } from '../dates'
import { formatarBRL } from '../../modules/financas/db'
import { interpretar } from './interpretar'
import { aplicarInterpretacao, desfazer } from './fluxos'
import { criarCaptura } from './db'
import { mostrarToast } from './store'
import { CONF, TIPO_INFO } from './rotulos'
import type { Interpretacao } from './types'

function resumoCampos(i: Interpretacao): string {
  const c = i.campos
  const p: string[] = []
  if (c.valorCentavos != null) p.push(formatarBRL(c.valorCentavos))
  if (c.categoria) p.push(c.categoria)
  if (c.data) p.push(rotuloData(c.data))
  if (c.horaInicio) p.push(c.horaInicio)
  if (c.duracaoMin) p.push(`${c.duracaoMin} min`)
  if (c.pessoa) p.push(`com ${c.pessoa}`)
  if (c.local) p.push(`📍 ${c.local}`)
  return p.join(' · ')
}

export function CapturaUniversal({ textoInicial, autoFocus, aoFechar }: {
  textoInicial?: string
  autoFocus?: boolean
  aoFechar: () => void
}) {
  const [texto, setTexto] = useState(textoInicial ?? '')
  const [analisado, setAnalisado] = useState<string | null>(null)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { if (autoFocus) ref.current?.focus() }, [autoFocus])

  const cands = useMemo(() => (analisado ? interpretar(analisado) : []), [analisado])
  const previa = useMemo(() => (texto.trim().length > 2 ? interpretar(texto)[0] : null), [texto])

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
    const melhor = cands[0] ?? interpretar(texto)[0]
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
      <div className="rounded-2xl border border-line bg-surface/60 focus-within:border-muted/50">
        <textarea
          ref={ref}
          value={texto}
          onChange={(e) => { setTexto(e.target.value); if (analisado) setAnalisado(null) }}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); analisar() } }}
          rows={2}
          placeholder="Digite ou cole qualquer coisa… ex.: Comprar café amanhã · Gastei R$ 48 no mercado"
          className="w-full resize-none bg-transparent px-3.5 py-3 text-[15px] leading-snug outline-none placeholder:text-muted/60"
        />
        {previa && !analisado && (
          <div className="flex items-center gap-1.5 border-t border-line/70 px-3.5 py-1.5 text-[11.5px] text-muted">
            <span>{TIPO_INFO[previa.tipo].emoji}</span>
            <span>Palpite: <b className="font-semibold text-ink">{TIPO_INFO[previa.tipo].nome}</b></span>
            <span className="text-muted/60">— confirme antes de salvar</span>
          </div>
        )}
      </div>

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
