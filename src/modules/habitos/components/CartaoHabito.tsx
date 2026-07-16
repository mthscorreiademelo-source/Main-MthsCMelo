import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconCheck, IconFechar, IconLapis } from '../../../core/components/Icons'
import { IconeFator } from '../../../core/components/icones'
import { ajustarValor, alternarItem, cicloSimNao, ehMedido } from '../db'
import { rotuloFrequencia } from '../freq'
import { estadoDia, estaCompleto, fracao, metaHabito, valorDoDia } from '../progresso'
import type { Habito, HabitoRegistro } from '../types'
import { AnelProgresso } from './AnelProgresso'

const VERMELHO = '#d8695e'

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
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const cor = habito.cor ?? 'var(--vida-ink)'
  const completo = estaCompleto(habito, registro)
  const frac = fracao(habito, registro)
  const atual = valorDoDia(habito, registro)
  const medido = ehMedido(habito.tipo)
  const passo = habito.passo && habito.passo > 0 ? habito.passo : 1
  const feitosItens = registro?.itens ?? []
  const estado = habito.tipo === 'sim_nao' ? estadoDia(habito, registro) : undefined
  const falhou = estado === 'falhou'

  function primaria() {
    if (habito.tipo === 'sim_nao') cicloSimNao(habito.id, data)
    else if (medido) ajustarValor(habito, data, passo)
    else if (habito.tipo === 'checklist') setAberto((v) => !v)
  }

  const sub = medido
    ? `${atual % 1 ? atual : Math.round(atual)} / ${metaHabito(habito)}${habito.unidade ? ' ' + habito.unidade : ''} · ${rotuloFrequencia(habito.frequencia)}`
    : habito.tipo === 'checklist'
      ? `${feitosItens.length} / ${habito.itens?.length ?? 0} · ${rotuloFrequencia(habito.frequencia)}`
      : falhou
        ? `Não feito · ${rotuloFrequencia(habito.frequencia)}`
        : habito.descricao || rotuloFrequencia(habito.frequencia)

  const bordaEstilo = completo
    ? { borderColor: `${cor}66`, backgroundColor: `${cor}0f` }
    : falhou
      ? { borderColor: `${VERMELHO}55`, backgroundColor: `${VERMELHO}0d` }
      : undefined

  function miolo() {
    if (habito.tipo === 'sim_nao') {
      if (estado === 'feito')
        return (
          <span className="flex size-8 items-center justify-center rounded-full" style={{ backgroundColor: cor, color: '#fff' }}>
            <IconCheck width={18} height={18} />
          </span>
        )
      if (estado === 'falhou')
        return (
          <span className="flex size-8 items-center justify-center rounded-full" style={{ backgroundColor: VERMELHO, color: '#fff' }}>
            <IconFechar width={16} height={16} />
          </span>
        )
      return (
        <span style={{ color: cor }}>
          <IconeFator nome={habito.icone} width={18} height={18} />
        </span>
      )
    }
    if (completo)
      return (
        <span className="flex size-8 items-center justify-center rounded-full" style={{ backgroundColor: cor, color: '#fff' }}>
          <IconCheck width={18} height={18} />
        </span>
      )
    return (
      <span style={{ color: cor }}>
        <IconeFator nome={habito.icone} width={18} height={18} />
      </span>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface/70 transition-colors" style={bordaEstilo}>
      <div className="flex items-center gap-3 p-2.5">
        <button
          onClick={primaria}
          aria-label="Alternar estado"
          className="shrink-0 rounded-full transition-transform active:scale-90"
        >
          <AnelProgresso fracao={falhou ? 0 : frac} tamanho={44} espessura={4} cor={falhou ? VERMELHO : cor}>
            {miolo()}
          </AnelProgresso>
        </button>

        <button onClick={() => navigate(`/habitos/${habito.id}`)} className="min-w-0 flex-1 py-1 text-left">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-semibold">{habito.nome}</span>
            {habito.horario && <span className="shrink-0 text-[11px] text-muted/80">{habito.horario}</span>}
          </span>
          <span className="block truncate text-[12px] text-muted">{sub}</span>
        </button>

        {medido && atual > 0 && (
          <button
            onClick={() => ajustarValor(habito, data, -passo)}
            aria-label="Diminuir"
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-[18px] leading-none text-muted transition-colors hover:text-ink"
          >
            −
          </button>
        )}

        <button
          onClick={() => onEditar(habito)}
          aria-label="Editar hábito"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted/70 transition-colors hover:bg-hover hover:text-ink"
        >
          <IconLapis width={15} height={15} />
        </button>
      </div>

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
                    style={feito ? { backgroundColor: cor, borderColor: cor, color: '#fff' } : { borderColor: 'var(--vida-line)' }}
                  >
                    {feito && <IconCheck width={13} height={13} />}
                  </span>
                  <span className={`text-[14px] ${feito ? 'text-muted line-through' : ''}`}>{it.texto}</span>
                </button>
              </li>
            )
          })}
          {(habito.itens?.length ?? 0) === 0 && (
            <li className="px-1.5 py-1 text-[12px] text-muted">Sem itens ainda — edite o hábito para adicionar.</li>
          )}
        </ul>
      )}
    </div>
  )
}
