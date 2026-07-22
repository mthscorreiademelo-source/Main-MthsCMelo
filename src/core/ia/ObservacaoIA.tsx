import type { ResultadoInsight } from './insights'

/**
 * Mostra a observação por IA quando disponível; enquanto carrega ou se a IA
 * não estiver ligada/responder, o chamador renderiza o conteúdo heurístico.
 * Uso típico:
 *   {ins.fonte === 'ia' && ins.texto
 *     ? <ObservacaoIA resultado={ins} />
 *     : <conteúdo heurístico de sempre />}
 */
export function ObservacaoIA({ resultado, className = '' }: { resultado: ResultadoInsight; className?: string }) {
  if (!resultado.texto) return null
  return (
    <div className={`flex items-start gap-2 ${className}`}>
      <span className="mt-0.5 shrink-0 text-[13px]" aria-hidden>✨</span>
      <p className="text-[13.5px] leading-snug text-ink">{resultado.texto}</p>
    </div>
  )
}
