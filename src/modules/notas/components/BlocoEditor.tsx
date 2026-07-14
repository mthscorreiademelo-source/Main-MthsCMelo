import { useEffect, useRef } from 'react'
import { Checkbox } from '../../../core/components/Checkbox'
import type { Bloco, TipoBloco } from '../types'

interface Props {
  bloco: Bloco
  /** Recebe o foco assim que montado/indicado (bloco recém-criado). */
  focar: boolean
  onMudar: (texto: string) => void
  onTransformar: (tipo: TipoBloco) => void
  onEnter: () => void
  onApagarVazio: () => void
  onAlternarFeito: () => void
  onDesfocar: () => void
}

/** Atalhos de digitação no início do bloco, como no Notion. */
const ATALHOS: [string, TipoBloco][] = [
  ['# ', 'titulo'],
  ['## ', 'titulo'],
  ['- ', 'lista'],
  ['* ', 'lista'],
  ['[] ', 'todo'],
  ['[ ] ', 'todo'],
]

const ESTILO_TEXTO: Record<TipoBloco, string> = {
  paragrafo: 'text-[15px] leading-relaxed',
  titulo: 'text-xl font-semibold leading-snug',
  lista: 'text-[15px] leading-relaxed',
  todo: 'text-[15px] leading-relaxed',
}

export function BlocoEditor({
  bloco,
  focar,
  onMudar,
  onTransformar,
  onEnter,
  onApagarVazio,
  onAlternarFeito,
  onDesfocar,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Autoajuste de altura conforme o conteúdo
  useEffect(() => {
    const el = ref.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [bloco.texto, bloco.tipo])

  useEffect(() => {
    if (focar) ref.current?.focus()
  }, [focar])

  function aoDigitar(texto: string) {
    if (bloco.tipo === 'paragrafo') {
      const atalho = ATALHOS.find(([prefixo]) => texto === prefixo)
      if (atalho) {
        onTransformar(atalho[1])
        return
      }
    }
    onMudar(texto)
  }

  return (
    <div className="group flex items-start gap-1.5">
      {bloco.tipo === 'lista' && (
        <span className="mt-[13px] size-[5px] shrink-0 rounded-full bg-ink/70" />
      )}
      {bloco.tipo === 'todo' && (
        <span className="-my-1.5 -ml-2.5">
          <Checkbox
            marcado={!!bloco.feito}
            onChange={onAlternarFeito}
            rotulo="Concluir item"
          />
        </span>
      )}
      <textarea
        ref={ref}
        rows={1}
        value={bloco.texto}
        onChange={(e) => aoDigitar(e.target.value)}
        onBlur={onDesfocar}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onEnter()
          } else if (e.key === 'Backspace' && bloco.texto === '') {
            e.preventDefault()
            onApagarVazio()
          }
        }}
        placeholder={bloco.tipo === 'titulo' ? 'Título' : 'Escreva algo…'}
        className={`w-full resize-none overflow-hidden bg-transparent py-1 outline-none placeholder:text-muted/0 focus:placeholder:text-muted/50 ${
          ESTILO_TEXTO[bloco.tipo]
        } ${bloco.tipo === 'todo' && bloco.feito ? 'text-muted line-through' : ''}`}
      />
    </div>
  )
}
