/** Resumo de saúde de um dia (um registro por dia; id = a data ISO). */
export interface SaudeDia {
  id: string
  /** Dia no formato ISO yyyy-MM-dd */
  data: string
  /** Minutos de sono */
  sonoMin?: number
  passos?: number
  /** Calorias ativas (kcal) */
  caloriasAtivas?: number
  /** Frequência cardíaca de repouso (bpm) */
  fcRepouso?: number
  /** Minutos de exercício/treino no dia */
  exercicioMin?: number
  criadoEm: number
  atualizadoEm?: number
}

export type MetricaSaude = 'sonoMin' | 'passos' | 'caloriasAtivas' | 'fcRepouso' | 'exercicioMin'
