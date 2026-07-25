import type { Faixa } from './agora'
import { faixaDoDia } from './agora'

/**
 * O "modo do momento" — o cérebro do selo no topo do Hoje. Combina o HORÁRIO
 * (faixa do dia) com o ESTADO (há alerta urgente? há trabalho hoje?) e devolve
 * um rótulo curto, um tom (cor) e se estamos no claro ou no escuro do dia.
 *
 * É a função central pedida na reconstrução: `modoDoMomento(agora, estado)`.
 */

/** O clima do momento — decide a cor do selo. */
export type TomModo = 'planejar' | 'foco' | 'atencao' | 'calmo'

/** Estado resumido do dia que, junto do horário, define o modo. */
export interface EstadoHoje {
  /** Existe um alerta de alta prioridade agora? → vira "· Atenção". */
  temAlertaAlta: boolean
  /** Há sinais de trabalho hoje (evento/tarefa de trabalho)? → "· Trabalho". */
  temTrabalho: boolean
}

/** O modo calculado: rótulo do selo + tom + se é dia (sol) ou noite (lua). */
export interface Modo {
  faixa: Faixa
  /** Rótulo curto para o selo, ex.: "Manhã · Planejar". */
  rotulo: string
  tom: TomModo
  /** true = período claro (ícone de sol); false = período escuro (lua). */
  diurno: boolean
}

interface BaseModo {
  periodo: string
  sub: string
  tom: TomModo
  diurno: boolean
}

/** O modo "base" de cada faixa, antes de aplicar o estado do dia. */
const BASE: Record<Faixa, BaseModo> = {
  madrugada: { periodo: 'Madrugada', sub: 'Descanso', tom: 'calmo', diurno: false },
  manha: { periodo: 'Manhã', sub: 'Planejar', tom: 'planejar', diurno: true },
  meiodia: { periodo: 'Meio-dia', sub: 'Foco', tom: 'foco', diurno: true },
  tarde: { periodo: 'Tarde', sub: 'Foco', tom: 'foco', diurno: true },
  noite: { periodo: 'Noite', sub: 'Desacelerar', tom: 'calmo', diurno: false },
  fimdenoite: { periodo: 'Fim do dia', sub: 'Encerrar', tom: 'calmo', diurno: false },
}

/** Faixas em que o refinamento "· Trabalho" faz sentido (horário de trabalho). */
const FAIXAS_TRABALHO: Faixa[] = ['meiodia', 'tarde']

/**
 * Calcula o modo do momento. Um alerta urgente sempre vence e vira "· Atenção";
 * fora isso, em horário de trabalho e com sinais de trabalho, sinaliza "· Trabalho".
 */
export function modoDoMomento(agora: Date, estado: EstadoHoje): Modo {
  const faixa = faixaDoDia(agora)
  const base = BASE[faixa]
  const partes = [base.periodo]
  let tom = base.tom

  if (estado.temAlertaAlta) {
    partes.push('Atenção')
    tom = 'atencao'
  } else {
    partes.push(base.sub)
    if (estado.temTrabalho && FAIXAS_TRABALHO.includes(faixa)) {
      partes.push('Trabalho')
    }
  }

  return { faixa, rotulo: partes.join(' · '), tom, diurno: base.diurno }
}
