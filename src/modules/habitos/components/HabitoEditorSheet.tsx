import { useEffect, useState } from 'react'
import { Button } from '../../../core/components/Button'
import { IconLixeira } from '../../../core/components/Icons'
import { Sheet } from '../../../core/components/Sheet'
import { calcularStreak, excluirHabito, renomearHabito } from '../db'
import type { Habito } from '../types'

interface Props {
  habito: Habito | null
  diasFeitos: Set<string>
  onFechar: () => void
}

export function HabitoEditorSheet({ habito, diasFeitos, onFechar }: Props) {
  const [nome, setNome] = useState('')
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)

  useEffect(() => {
    if (habito) {
      setNome(habito.nome)
      setConfirmandoExclusao(false)
    }
  }, [habito?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function salvarNome(valor: string) {
    setNome(valor)
    if (habito && valor.trim()) renomearHabito(habito.id, valor)
  }

  async function aoExcluir() {
    if (!habito) return
    if (!confirmandoExclusao) {
      setConfirmandoExclusao(true)
      return
    }
    await excluirHabito(habito.id)
    onFechar()
  }

  const streak = calcularStreak(diasFeitos)
  const total = diasFeitos.size

  return (
    <Sheet aberto={!!habito} titulo="Hábito" onFechar={onFechar}>
      <div className="flex h-full flex-col gap-5">
        <input
          value={nome}
          onChange={(e) => salvarNome(e.target.value)}
          placeholder="Nome do hábito"
          className="w-full bg-transparent text-xl font-semibold outline-none placeholder:text-muted/60"
        />

        <div className="flex gap-3">
          <div className="flex-1 rounded-lg border border-line p-3">
            <p className="text-2xl font-bold">🔥 {streak}</p>
            <p className="text-[13px] text-muted">sequência atual</p>
          </div>
          <div className="flex-1 rounded-lg border border-line p-3">
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-[13px] text-muted">dias no total</p>
          </div>
        </div>

        <p className="text-[13px] leading-relaxed text-muted">
          Toque nos círculos da semana para marcar ou corrigir dias — inclusive
          dias passados.
        </p>

        <div className="flex-1" />

        <Button variante="perigo" onClick={aoExcluir} className="self-start">
          <IconLixeira width={16} height={16} />
          {confirmandoExclusao ? 'Confirmar exclusão' : 'Excluir hábito'}
        </Button>
      </div>
    </Sheet>
  )
}
