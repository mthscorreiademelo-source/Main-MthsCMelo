import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { IconCalendario, IconFechar, IconSol } from '../../../core/components/Icons'
import { rotuloData } from '../../../core/dates'
import { dataRelativa, reagendar } from '../db'
import type { Task } from '../types'

interface Opcao {
  chave: 'hoje' | 'amanha' | 'fim_semana' | 'prox_semana'
  rotulo: string
}

const OPCOES: Opcao[] = [
  { chave: 'hoje', rotulo: 'Hoje' },
  { chave: 'amanha', rotulo: 'Amanhã' },
  { chave: 'fim_semana', rotulo: 'Fim de semana' },
  { chave: 'prox_semana', rotulo: 'Próxima semana' },
]

/** Bottom sheet para reagendar rapidamente uma tarefa ("planejar"). */
export function MenuReagendar({ task, onFechar }: { task: Task; onFechar: () => void }) {
  function aplicar(data: string | undefined) {
    reagendar(task.id, data)
    onFechar()
  }

  return (
    <FolhaInferior titulo="Reagendar" onFechar={onFechar}>
      <div className="flex flex-col gap-1">
        {OPCOES.map((o) => {
          const data = dataRelativa(o.chave)
          return (
            <button
              key={o.chave}
              onClick={() => aplicar(data)}
              className="flex items-center justify-between rounded-lg px-2 py-3 text-left text-[15px] transition-colors hover:bg-hover"
            >
              <span className="flex items-center gap-3">
                <IconSol width={17} height={17} className="text-muted" />
                {o.rotulo}
              </span>
              <span className="text-[13px] text-muted">{rotuloData(data)}</span>
            </button>
          )
        })}

        <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-3 text-[15px] transition-colors hover:bg-hover">
          <IconCalendario width={17} height={17} className="text-muted" />
          Escolher data
          <input
            type="date"
            defaultValue={task.data ?? ''}
            onChange={(e) => e.target.value && aplicar(e.target.value)}
            className="ml-auto rounded-md border border-line bg-transparent px-2 py-1 text-[14px] outline-none"
          />
        </label>

        {task.data && (
          <button
            onClick={() => aplicar(undefined)}
            className="flex items-center gap-3 rounded-lg px-2 py-3 text-left text-[15px] text-danger transition-colors hover:bg-danger/10"
          >
            <IconFechar width={17} height={17} />
            Remover data
          </button>
        )}
      </div>
    </FolhaInferior>
  )
}
