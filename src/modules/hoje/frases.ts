/**
 * Conteúdo estático do Hoje: frase do dia e sugestões para relaxar.
 * Fica no próprio módulo (sem sync, sem tabela nova). A escolha é determinística
 * pelo dia — a mesma frase o dia inteiro, mudando à meia-noite.
 */

export interface Frase {
  texto: string
  autor: string
}

/** Frases curadas — tom sóbrio e encorajador, na medida do LUME. */
export const FRASES: Frase[] = [
  { texto: 'A melhor forma de prever o futuro é criá-lo.', autor: 'Peter Drucker' },
  { texto: 'Pequenos passos todos os dias levam a grandes lugares.', autor: 'Provérbio' },
  { texto: 'Você não precisa ser grande para começar, mas precisa começar para ser grande.', autor: 'Zig Ziglar' },
  { texto: 'Disciplina é escolher entre o que você quer agora e o que você quer mais.', autor: 'Augusto Cury' },
  { texto: 'O que você faz hoje pode melhorar todos os seus amanhãs.', autor: 'Ralph Marston' },
  { texto: 'A jornada de mil milhas começa com um único passo.', autor: 'Lao-Tsé' },
  { texto: 'Cuide dos minutos e as horas cuidarão de si mesmas.', autor: 'Lord Chesterfield' },
  { texto: 'Não conte os dias, faça os dias contarem.', autor: 'Muhammad Ali' },
  { texto: 'A persistência realiza o impossível.', autor: 'Provérbio chinês' },
  { texto: 'Foco não é dizer sim para a coisa certa, é dizer não para mil outras.', autor: 'Steve Jobs' },
  { texto: 'Somos o que repetidamente fazemos. A excelência é um hábito.', autor: 'Aristóteles' },
  { texto: 'O sucesso é a soma de pequenos esforços repetidos dia após dia.', autor: 'Robert Collier' },
  { texto: 'Comece onde você está. Use o que você tem. Faça o que você pode.', autor: 'Arthur Ashe' },
  { texto: 'A calma é a maior expressão de força.', autor: 'Provérbio' },
  { texto: 'Um dia de cada vez é o suficiente.', autor: 'Provérbio' },
]

/** Sugestão para relaxar (modo noite) — sem áudio real, só o convite calmo. */
export interface SugestaoRelaxar {
  titulo: string
  detalhe: string
}

export const SUGESTOES_RELAXAR: SugestaoRelaxar[] = [
  { titulo: 'Respiração 4-7-8', detalhe: 'Inspire em 4, segure em 7, solte em 8. Repita 4 vezes.' },
  { titulo: 'Alongar o corpo', detalhe: '5 minutos de alongamento leve antes de deitar.' },
  { titulo: 'Silêncio e luz baixa', detalhe: 'Diminua as luzes e afaste as telas por 20 minutos.' },
  { titulo: 'Uma página de leitura', detalhe: 'Leia algo leve por alguns minutos, sem pressa.' },
  { titulo: 'Chá sem cafeína', detalhe: 'Uma bebida quente ajuda o corpo a desacelerar.' },
]

/** Perguntas de reflexão rápida (modo manhã) — respondidas em ~1 minuto. */
export const PERGUNTAS_REFLEXAO: string[] = [
  'Qual é a coisa mais importante para hoje?',
  'O que vai deixar seu dia bom?',
  'Do que você é grato neste começo de dia?',
]

/** Escolha determinística por dia (mesma o dia todo; muda à meia-noite). */
export function escolhaDoDia<T>(lista: T[], diaISO: string): T {
  let soma = 0
  for (let i = 0; i < diaISO.length; i++) soma = (soma + diaISO.charCodeAt(i)) % 100000
  return lista[soma % lista.length]
}
