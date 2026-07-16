import { TileResumo } from '../../core/components/TileResumo'
import { IconCheckCircle } from '../../core/components/Icons'
import { concluidasHoje, filtrarHoje } from './db'
import { useTarefas } from './hooks'

/** Tile do cockpit: tarefas pendentes para hoje. */
export function HojeResumo() {
  const tarefas = useTarefas()
  if (!tarefas) return null
  const pendentes = filtrarHoje(tarefas).length
  const feitasHoje = concluidasHoje(tarefas).length
  if (pendentes + feitasHoje === 0) return null
  return (
    <TileResumo
      to="/tarefas"
      icone={<IconCheckCircle width={18} height={18} />}
      cor="#246fe0"
      valor={pendentes === 0 ? '✓' : pendentes}
      rotulo={pendentes === 0 ? 'Tarefas concluídas' : pendentes === 1 ? 'tarefa para hoje' : 'tarefas para hoje'}
    />
  )
}
