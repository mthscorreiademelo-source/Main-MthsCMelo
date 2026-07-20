import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/db'
import type {
  Atividade,
  Consulta,
  DoacaoSangue,
  Exame,
  Medicamento,
  MedicamentoTomada,
  Medida,
  Profissional,
  Refeicao,
  SaudeConfig,
  SaudeDia,
  Vacina,
} from './types'

export function useSaude(): SaudeDia[] | undefined {
  return useLiveQuery(() => db.saude.toArray(), [])
}
export function useSaudeDia(data: string): SaudeDia | undefined {
  return useLiveQuery(() => db.saude.get(data), [data])
}
export function useMedidas(): Medida[] | undefined {
  return useLiveQuery(() => db.saudeMedidas.toArray(), [])
}
export function useAtividades(): Atividade[] | undefined {
  return useLiveQuery(() => db.atividades.toArray(), [])
}
export function useRefeicoes(): Refeicao[] | undefined {
  return useLiveQuery(() => db.refeicoes.toArray(), [])
}
export function useProfissionais(): Profissional[] | undefined {
  return useLiveQuery(() => db.profissionais.toArray(), [])
}
export function useConsultas(): Consulta[] | undefined {
  return useLiveQuery(() => db.consultas.toArray(), [])
}
export function useMedicamentos(): Medicamento[] | undefined {
  return useLiveQuery(() => db.medicamentos.toArray(), [])
}
export function useMedicamentoTomadas(): MedicamentoTomada[] | undefined {
  return useLiveQuery(() => db.medicamentoTomadas.toArray(), [])
}
export function useExames(): Exame[] | undefined {
  return useLiveQuery(() => db.exames.toArray(), [])
}
export function useVacinas(): Vacina[] | undefined {
  return useLiveQuery(() => db.vacinas.toArray(), [])
}
export function useDoacoes(): DoacaoSangue[] | undefined {
  return useLiveQuery(() => db.doacoesSangue.toArray(), [])
}
export function useSaudeConfig(): SaudeConfig | undefined {
  return useLiveQuery(() => db.saudeConfig.get('default'), [])
}
