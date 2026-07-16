import { db } from '../../core/db/db'
import type { SaudeDia } from '../saude/types'
import type { Habito, TipoHabito } from './types'

/**
 * Fontes de integração: um hábito pode puxar o valor do dia automaticamente de
 * outro módulo (hoje, da Saúde). O valor derivado é gravado no registro do dia,
 * então mapa de calor, estatísticas e sequências funcionam sem tratamento extra.
 */
export interface FonteIntegracao {
  id: string
  modulo: string
  rotulo: string
  tipoSugerido: TipoHabito
  unidade: string
  icone: string
  cor: string
  /** valor bruto do dia (ou undefined se não houver dado). */
  valorDoDia(data: string): Promise<number | undefined>
}

async function metricaSaude(
  data: string,
  campo: keyof SaudeDia,
): Promise<number | undefined> {
  const dia = await db.saude.get(data)
  const v = dia?.[campo]
  return typeof v === 'number' ? v : undefined
}

export const FONTES: FonteIntegracao[] = [
  {
    id: 'saude:passos',
    modulo: 'Saúde',
    rotulo: 'Passos',
    tipoSugerido: 'quantidade',
    unidade: 'passos',
    icone: 'corrida',
    cor: '#8cae7b',
    valorDoDia: (d) => metricaSaude(d, 'passos'),
  },
  {
    id: 'saude:sono',
    modulo: 'Saúde',
    rotulo: 'Sono',
    tipoSugerido: 'tempo',
    unidade: 'min',
    icone: 'lua',
    cor: '#6d8bc4',
    valorDoDia: (d) => metricaSaude(d, 'sonoMin'),
  },
  {
    id: 'saude:exercicio',
    modulo: 'Saúde',
    rotulo: 'Exercício',
    tipoSugerido: 'tempo',
    unidade: 'min',
    icone: 'raio',
    cor: '#5b9c86',
    valorDoDia: (d) => metricaSaude(d, 'exercicioMin'),
  },
  {
    id: 'saude:calorias',
    modulo: 'Saúde',
    rotulo: 'Calorias ativas',
    tipoSugerido: 'valor',
    unidade: 'kcal',
    icone: 'chama',
    cor: '#d89b6c',
    valorDoDia: (d) => metricaSaude(d, 'caloriasAtivas'),
  },
]

export function fonteDe(id: string | undefined): FonteIntegracao | undefined {
  if (!id) return undefined
  return FONTES.find((f) => f.id === id)
}

/**
 * Espelha os dados de origem nos registros dos hábitos integrados. Percorre os
 * dias com dados de Saúde e grava o valor derivado no registro do hábito, só
 * quando muda (evita gravações — e sincronizações — desnecessárias).
 * Retorna quantos registros foram tocados.
 */
export async function sincronizarIntegracoes(habitos: Habito[]): Promise<number> {
  const integrados = habitos.filter((h) => !h.arquivado && h.fonteId)
  if (integrados.length === 0) return 0

  const diasSaude = await db.saude.toArray()
  if (diasSaude.length === 0) return 0

  let tocados = 0
  for (const h of integrados) {
    const fonte = fonteDe(h.fonteId)
    if (!fonte || !fonte.id.startsWith('saude:')) continue
    for (const dia of diasSaude) {
      const valor = await fonte.valorDoDia(dia.data)
      const id = `${h.id}:${dia.data}`
      const existe = await db.habitoRegistros.get(id)
      if (valor == null || valor <= 0) {
        // Origem sem dado: remove um registro derivado vazio, se houver.
        if (existe && (existe.valor ?? 0) > 0 && !existe.estado && !existe.itens?.length) {
          await db.habitoRegistros.delete(id)
          tocados++
        }
        continue
      }
      if ((existe?.valor ?? -1) === valor) continue
      if (existe) await db.habitoRegistros.update(id, { valor })
      else await db.habitoRegistros.add({ id, habitoId: h.id, data: dia.data, valor })
      tocados++
    }
  }
  return tocados
}
