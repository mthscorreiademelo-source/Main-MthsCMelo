import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { SecaoDashboard } from '../../../core/components/SecaoDashboard'
import { hojeISO } from '../../../core/dates'
import { ordenarHabitos } from '../db'
import { devidoNoDia } from '../freq'
import { useHabitos, useRegistros } from '../hooks'
import { contagemSemana, registrosDoDia, resumoDoDia } from '../progresso'
import { CartaoHabito } from './CartaoHabito'

/** Seção de hábitos para o dashboard Hoje: os hábitos devidos hoje, com um-toque. */
export function HabitosHoje() {
  const habitos = useHabitos()
  const registros = useRegistros()
  const navigate = useNavigate()
  const data = hojeISO()

  const ativos = useMemo(() => (habitos ?? []).filter((h) => !h.arquivado), [habitos])
  const devidos = useMemo(
    () => ordenarHabitos(ativos).filter((h) => devidoNoDia(h, data)),
    [ativos, data],
  )
  const regs = useMemo(() => registrosDoDia(registros ?? [], data), [registros, data])

  if (habitos === undefined || devidos.length === 0) return null
  const resumo = resumoDoDia(ativos, registros ?? [], data)

  return (
    <SecaoDashboard titulo={`Hábitos · ${resumo.feitos}/${resumo.total}`} verTodos="/habitos">
      <div className="flex flex-col gap-2">
        {devidos.map((h) => (
          <CartaoHabito
            key={h.id}
            habito={h}
            registro={regs.get(h.id)}
            data={data}
            semana={
              h.frequencia?.tipo === 'semanal'
                ? {
                    feitos: contagemSemana(h, registros ?? [], data),
                    meta: Math.max(1, h.frequencia.vezes ?? 1),
                  }
                : undefined
            }
            onEditar={() => navigate('/habitos')}
          />
        ))}
      </div>
    </SecaoDashboard>
  )
}
