import { IconChama } from '../../../core/components/Icons'
import type { ResumoDia } from '../progresso'
import { AnelProgresso } from './AnelProgresso'

/** Cabeçalho do dia: anel de progresso + porcentagem, feitos/total e streak. */
export function CabecalhoProgresso({ resumo, streak }: { resumo: ResumoDia; streak: number }) {
  const pct = Math.round(resumo.fracao * 100)
  const tudoFeito = resumo.total > 0 && resumo.feitos === resumo.total
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface/60 p-4">
      <AnelProgresso fracao={resumo.fracao} tamanho={76} espessura={7} cor="var(--vida-accent)">
        <span className="text-[17px] font-bold tabular-nums">{pct}%</span>
      </AnelProgresso>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-[15px] font-semibold">
          {resumo.total === 0
            ? 'Nada previsto para hoje'
            : tudoFeito
              ? 'Dia completo! 🎉'
              : 'Progresso de hoje'}
        </p>
        <p className="text-[13px] text-muted">
          <span className="font-semibold text-ink">{resumo.feitos}</span> de {resumo.total} hábito
          {resumo.total === 1 ? '' : 's'} concluído{resumo.feitos === 1 ? '' : 's'}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[13px] font-medium text-amber-500">
          <IconChama width={15} height={15} />
          <span>
            {streak > 0 ? `${streak} dia${streak === 1 ? '' : 's'} seguidos` : 'Sem sequência ainda'}
          </span>
        </div>
      </div>
    </div>
  )
}
