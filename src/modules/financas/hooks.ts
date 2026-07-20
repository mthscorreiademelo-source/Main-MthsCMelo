import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/db'
import type {
  Conta,
  FinancasConfig,
  Movimento,
  Objetivo,
  OrcamentoLinha,
  PatrimonioSnapshot,
  Recorrente,
} from './types'

export function useMovimentos(): Movimento[] | undefined {
  return useLiveQuery(() => db.movimentos.toArray(), [])
}

export function useContas(): Conta[] | undefined {
  return useLiveQuery(() => db.contas.orderBy('ordem').toArray(), [])
}

export function useObjetivos(): Objetivo[] | undefined {
  return useLiveQuery(() => db.objetivos.orderBy('ordem').toArray(), [])
}

export function useRecorrentes(): Recorrente[] | undefined {
  return useLiveQuery(() => db.recorrentes.orderBy('ordem').toArray(), [])
}

export function useOrcamentoLinhas(): OrcamentoLinha[] | undefined {
  return useLiveQuery(() => db.orcamentoLinhas.orderBy('ordem').toArray(), [])
}

export function useFinancasConfig(): FinancasConfig | undefined {
  return useLiveQuery(() => db.financasConfig.get('default'), [])
}

export function useSnapshots(): PatrimonioSnapshot[] | undefined {
  return useLiveQuery(() => db.patrimonioSnapshots.toArray(), [])
}
