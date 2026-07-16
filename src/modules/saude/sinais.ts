import { useMemo } from 'react'
import type { FatorDiario, SinalDiario } from '../../core/insights/tipos'
import { serieMetrica } from './db'
import { useSaude } from './hooks'
import type { SaudeDia } from './types'

function diasOnde(dias: SaudeDia[], cond: (d: SaudeDia) => boolean): Set<string> {
  return new Set(dias.filter(cond).map((d) => d.data))
}

/**
 * Sinais e fatores de saúde para o motor de insights cruzar com o humor.
 * (Quando existir mais de uma fonte, isto vira um registro de provedores.)
 */
export function useSinaisSaude(): { sinais: SinalDiario[]; fatores: FatorDiario[] } {
  const dias = useSaude()
  return useMemo(() => {
    const lista = dias ?? []
    const sono = new Map([...serieMetrica(lista, 'sonoMin')].map(([d, v]) => [d, v / 60]))
    const sinais: SinalDiario[] = [
      { chave: 'sono.horas', rotulo: 'Sono', serie: sono, unidade: 'h' },
      { chave: 'passos', rotulo: 'Passos', serie: serieMetrica(lista, 'passos') },
      { chave: 'exercicio', rotulo: 'Exercício', serie: serieMetrica(lista, 'exercicioMin'), unidade: 'min' },
      { chave: 'fc.repouso', rotulo: 'FC de repouso', serie: serieMetrica(lista, 'fcRepouso'), unidade: 'bpm' },
    ]
    const fatores: FatorDiario[] = [
      { chave: 'sono7', rotulo: 'Dormiu 7h+', icone: 'lua', dias: diasOnde(lista, (d) => (d.sonoMin ?? 0) >= 420) },
      { chave: 'treinou', rotulo: 'Treinou', icone: 'raio', dias: diasOnde(lista, (d) => (d.exercicioMin ?? 0) >= 20) },
      { chave: 'ativo', rotulo: '8 mil passos+', icone: 'corrida', dias: diasOnde(lista, (d) => (d.passos ?? 0) >= 8000) },
    ]
    return { sinais, fatores }
  }, [dias])
}
