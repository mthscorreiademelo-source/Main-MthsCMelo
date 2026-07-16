import { db } from '../../core/db/db'
import type { MetricaSaude, SaudeDia } from './types'

export interface DefMetrica {
  chave: MetricaSaude
  nome: string
  icone: string
  cor: string
  unidade: string
  /** Formata o valor bruto para exibição. */
  formatar: (v: number) => string
  /** Converte o texto do input para o valor bruto guardado. */
  daEntrada?: (texto: string) => number | undefined
}

function horasMin(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

export const METRICAS: DefMetrica[] = [
  {
    chave: 'sonoMin',
    nome: 'Sono',
    icone: 'lua',
    cor: '#6d8bc4',
    unidade: 'h',
    formatar: horasMin,
    // entrada em horas (ex.: 7.5) → minutos
    daEntrada: (t) => {
      const n = Number(t.replace(',', '.'))
      return Number.isFinite(n) ? Math.round(n * 60) : undefined
    },
  },
  {
    chave: 'passos',
    nome: 'Passos',
    icone: 'corrida',
    cor: '#8cae7b',
    unidade: '',
    formatar: (v) => v.toLocaleString('pt-BR'),
  },
  {
    chave: 'caloriasAtivas',
    nome: 'Calorias',
    icone: 'chama',
    cor: '#d89b6c',
    unidade: 'kcal',
    formatar: (v) => `${v.toLocaleString('pt-BR')} kcal`,
  },
  {
    chave: 'fcRepouso',
    nome: 'FC repouso',
    icone: 'coracao',
    cor: '#c46a5e',
    unidade: 'bpm',
    formatar: (v) => `${v} bpm`,
  },
  {
    chave: 'exercicioMin',
    nome: 'Exercício',
    icone: 'raio',
    cor: '#5b9c86',
    unidade: 'min',
    formatar: (v) => `${v} min`,
  },
]

/** Exibe uma métrica bruta, ou "—" se ausente. */
export function exibir(chave: MetricaSaude, v: number | undefined): string {
  if (v == null) return '—'
  return METRICAS.find((m) => m.chave === chave)!.formatar(v)
}

/** Cria/atualiza o registro de um dia com as mudanças informadas. */
export async function salvarDia(data: string, mudancas: Partial<SaudeDia>) {
  const existente = await db.saude.get(data)
  if (existente) {
    await db.saude.update(data, mudancas)
  } else {
    await db.saude.add({ id: data, data, criadoEm: Date.now(), ...mudancas })
  }
}

export async function excluirDia(data: string) {
  await db.saude.delete(data)
}

/** Série diária de uma métrica (para gráficos e correlações). */
export function serieMetrica(dias: SaudeDia[], chave: MetricaSaude): Map<string, number> {
  const m = new Map<string, number>()
  for (const d of dias) {
    const v = d[chave]
    if (typeof v === 'number') m.set(d.data, v)
  }
  return m
}
