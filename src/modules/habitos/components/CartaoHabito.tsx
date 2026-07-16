import { useState } from 'react'
import { IconCheck } from '../../../core/components/Icons'
import { IconeFator } from '../../../core/components/icones'
import { ajustarValor, alternarItem, alternarSimNao, ehMedido } from '../db'
import { rotuloFrequencia } from '../freq'
import { estaCompleto, fracao, metaHabito, valorDoDia } from '../progresso'
import type { Habito, HabitoRegistro } from '../types'
import { AnelProgresso } from './AnelProgresso'

export function CartaoHabito({
  habito,
  registro,
  data,
  onEditar,
}: {
  habito: Habito
  registro: HabitoRegistro | undefined
  data: string
  onEditar: (h: Habito) => void
}) {
  const [aberto, setAberto] = useState(false)
  const cor = habito.cor ?? 'var(--vida-ink)'
  const completo = estaCompleto(habito, registro)
  const frac = fracao(habito, registro)
  const atual = valorDoDia(habito, registro)
  const medido = ehMedido(habito.tipo)
  const passo = habito.passo && habito.passo > 0 ? habito.passo : 1
  const feitosItens = registro?.itens ?? []

  function primaria() {
    if (habito.tipo === 'sim_nao') alternarSimNao(habito.id, data)
    else if (medido) ajustarValor(habito, data, passo)
    else if (habito.tipo === 'checklist') setAberto((v) => !v)
  }

  const sub = medido
    ? `${atual % 1 ? atual : Math.round(atual)} / ${metaHabito(habito)}${habito.unidade ? ' ' + habito.unidade : ''} · ${rotuloFrequencia(habito.frequencia)}`
    : habito.tipo === 'checklist'
      ? `${feitosItens.length} / ${habito.itens?.length ?? 0} · ${rotuloFrequencia(habito.frequencia)}`
      : habito.descricao || rotuloFrequencia(habito.frequencia)

  return (
    <div
      className="overflow-hidden rounded-xl border border-line bg-surface/70 transition-colors"
      style={completo ? { borderColor: `${cor}66`, backgroundColor: `${cor}0f` } : undefined}
    >
      <div className="flex items-center gap-3 p-2.5">
        {/* Controle primário (um toque) */}
        <button
          onClick={primaria}
          aria-label={completo ? 'Desfazer' : 'Concluir'}
          className="shrink-0 rounded-full transition-transform active:scale-90"
        >
          <AnelProgresso fracao={frac} tamanho={44} espessura={4} cor={cor}>
            {completo ? (
              <span
                className="flex size-8 items-center justify-center rounded-full"
                style={{ backgroundColor: cor, color: '#fff' }}
              >
                <IconCheck width={18} height={18} />
              </span>
            ) : (
              <span style={{ color: cor }}>
                <IconeFator nome={habito.icone} width={18} height={18} />
              </span>
            )}
          </AnelProgresso>
        </button>

        {/* Nome + sub (abre editor) */}
        <button onClick={() => onEditar(habito)} className="min-w-0 flex-1 py-1 text-left">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-semibold">{habito.nome}</span>
            {habito.horario && (
              <span className="shrink-0 text-[11px] text-muted/80">{habito.horario}</span>
            )}
          </span>
          <span className="block truncate text-[12px] text-muted">{sub}</span>
        </button>

        {/* Controle secundário para tipos medidos: diminuir */}
        {medido && atual > 0 && (
          <button
            onClick={() => ajustarValor(habito, data, -passo)}
            aria-label="Diminuir"
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-[18px] leading-none text-muted transition-colors hover:text-ink"
          >
            −
          </button>
        )}
      </div>

      {/* Checklist expandido */}
      {habito.tipo === 'checklist' && aberto && (
        <ul className="flex flex-col gap-0.5 border-t border-line/70 px-2.5 py-2">
          {(habito.itens ?? []).map((it) => {
            const feito = feitosItens.includes(it.id)
            return (
              <li key={it.id}>
                <button
                  onClick={() => alternarItem(habito, data, it.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-hover"
                >
                  <span
                    className="flex size-5 shrink-0 items-center justify-center rounded-md border"
                    style={
                      feito
                        ? { backgroundColor: cor, borderColor: cor, color: '#fff' }
                        : { borderColor: 'var(--vida-line)' }
                    }
                  >
                    {feito && <IconCheck width={13} height={13} />}
                  </span>
                  <span className={`text-[14px] ${feito ? 'text-muted line-through' : ''}`}>
                    {it.texto}
                  </span>
                </button>
              </li>
            )
          })}
          {(habito.itens?.length ?? 0) === 0 && (
            <li className="px-1.5 py-1 text-[12px] text-muted">
              Sem itens ainda — edite o hábito para adicionar.
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
