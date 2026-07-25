import { Link } from 'react-router-dom'
import { IconPasta } from '../../../core/components/Icons'
import { AnelProgresso } from '../../habitos/components/AnelProgresso'
import { CartaoHoje } from '../CartaoHoje'
import { BarraProgresso, Rotulo, rotuloDuracao } from '../ui'
import type { PropsCard } from './tipos'

/* -------------------------------- Foco do dia ------------------------------- */
export function CardFocoDoDia({ dados, tamanho }: PropsCard) {
  const foco = dados.foco
  if (!foco) return null
  const cor = foco.projeto.cor ?? 'var(--vida-accent)'
  return (
    <CartaoHoje
      tamanho={tamanho}
      to="/projetos"
      destaque
      style={{
        backgroundColor: `color-mix(in srgb, ${cor} 8%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${cor} 22%, transparent)`,
      }}
    >
      <Rotulo cor={cor}>Foco do dia</Rotulo>
      <div className="mt-2 flex flex-1 items-center gap-4">
        <AnelProgresso fracao={foco.pct / 100} tamanho={76} espessura={7} cor={cor}>
          <span className="text-[15px] font-bold tabular-nums">{foco.pct}%</span>
        </AnelProgresso>
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-bold leading-tight">{foco.projeto.nome}</h2>
          <p className="mt-1 text-[13px] text-muted">
            {foco.pct}% do seu tempo planejado hoje está neste projeto.
          </p>
          <p className="mt-1 text-[12px] text-muted">
            {rotuloDuracao(foco.minutos)} de {rotuloDuracao(foco.totalMinutos)} planejados
          </p>
        </div>
      </div>
    </CartaoHoje>
  )
}

/* ---------------------------- Projetos em andamento ------------------------- */
export function CardProjetosAndamento({ dados, tamanho }: PropsCard) {
  const projetos = dados.projetosAndamento
  if (projetos.length === 0) return null
  return (
    <CartaoHoje tamanho={tamanho}>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent" aria-hidden>
          <IconPasta width={16} height={16} />
        </span>
        <span className="flex-1 text-[14px] font-semibold">Projetos em andamento</span>
        <Link to="/projetos" className="text-[12px] font-medium text-accent hover:underline">
          Ver todos
        </Link>
      </div>
      <ul className="flex flex-col gap-2.5">
        {projetos.map(({ projeto, progresso, restantes }) => {
          const cor = projeto.cor ?? 'var(--vida-accent)'
          return (
            <li key={projeto.id}>
              <Link to={`/projetos/${projeto.id}`} className="block rounded-lg px-1 py-1 transition-colors hover:bg-hover">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-[13px] font-medium">{projeto.nome}</span>
                  <span className="shrink-0 text-[12px] tabular-nums text-muted">{Math.round(progresso * 100)}%</span>
                </div>
                <BarraProgresso fracao={progresso} altura={6} cor={cor} />
                <span className="mt-1 block text-[11px] text-muted">
                  {restantes > 0 ? `${restantes} tarefa${restantes > 1 ? 's' : ''} restante${restantes > 1 ? 's' : ''}` : 'Tudo concluído'}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </CartaoHoje>
  )
}
