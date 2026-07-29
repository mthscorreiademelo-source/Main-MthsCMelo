// Testes do interpretador de linguagem natural do "Nova tarefa" (Item 1 do
// plano). Referência temporal fixa via fake timers, mesmo padrão de db.test.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { interpretarTarefa } from './interpretar'
import type { Projeto } from './types'

// Quarta-feira.
const HOJE = '2026-07-29'

function projeto(over: Partial<Projeto> & { id: string; nome: string }): Projeto {
  return { cor: '#4073ff', ordem: 0, criadoEm: 0, ...over }
}

describe('interpretarTarefa', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(`${HOJE}T10:00:00`))
  })
  afterEach(() => vi.useRealTimers())

  it('mantém o que já reconhecia: hoje/amanhã/dia da semana, p1-p4 e #projeto', () => {
    const projetos = [projeto({ id: 'p1', nome: 'Casa Nova' })]
    expect(interpretarTarefa('lavar roupa hoje', []).data).toBe('2026-07-29')
    expect(interpretarTarefa('lavar roupa amanhã', []).data).toBe('2026-07-30')
    const r = interpretarTarefa('estudar p2 #CasaNova', projetos)
    expect(r.prioridade).toBe(2)
    expect(r.projetoId).toBe('p1')
    expect(r.titulo).toBe('Estudar')
  })

  it('reconhece dia da semana (próxima ocorrência)', () => {
    // HOJE é quarta (2026-07-29). "sexta" -> 2026-07-31.
    expect(interpretarTarefa('ligar pro dentista sexta', []).data).toBe('2026-07-31')
  })

  describe('data mais rica', () => {
    it('anteontem / depois de amanhã', () => {
      expect(interpretarTarefa('resolver isso anteontem', []).data).toBe('2026-07-27')
      expect(interpretarTarefa('resolver isso depois de amanhã', []).data).toBe('2026-07-31')
    })
    it('data com hífen dd-mm-aaaa e dd-mm', () => {
      expect(interpretarTarefa('pagar conta 05-08-2026', []).data).toBe('2026-08-05')
      expect(interpretarTarefa('pagar conta 05-08', []).data).toBe('2026-08-05')
    })
    it('data com barra (dd/mm/aaaa)', () => {
      expect(interpretarTarefa('pagar conta 05/08/2026', []).data).toBe('2026-08-05')
    })
    it('"dia N de mês"', () => {
      expect(interpretarTarefa('pagar aluguel dia 5 de agosto', []).data).toBe('2026-08-05')
    })
  })

  describe('horário — prazo (limite) vs bloco planejado', () => {
    it('"até as 23h" vira prazo-horário (Task.horario), sem criar bloco', () => {
      const r = interpretarTarefa('lavar roupa até as 23h', [])
      expect(r.horario).toBe('23:00')
      expect(r.bloco).toBeUndefined()
      expect(r.titulo).toBe('Lavar roupa')
    })
    it('"até 9h" vira prazo-horário', () => {
      expect(interpretarTarefa('entregar relatório até 9h', []).horario).toBe('09:00')
    })
    it('"antes das 18h" vira prazo-horário', () => {
      expect(interpretarTarefa('sair antes das 18h', []).horario).toBe('18:00')
    })
    it('"às 23h" sozinho (sem limite) vira bloco planejado fixado, não prazo', () => {
      const r = interpretarTarefa('lavar roupa hoje às 23h', [])
      expect(r.horario).toBeUndefined()
      expect(r.bloco).toEqual({ data: '2026-07-29', inicio: '23:00', duracaoMin: 30 })
      expect(r.titulo).toBe('Lavar roupa')
    })
    it('"9 da manhã" vira bloco com hora 09:00', () => {
      const r = interpretarTarefa('tomar remédio 9 da manhã', [])
      expect(r.bloco?.inicio).toBe('09:00')
    })
    it('"meio-dia" e "meia-noite"', () => {
      expect(interpretarTarefa('almoçar meio-dia', []).bloco?.inicio).toBe('12:00')
      expect(interpretarTarefa('virar o relatório meia-noite', []).bloco?.inicio).toBe('00:00')
    })
    it('"madrugada" como período (sem número) vira bloco com horário padrão', () => {
      expect(interpretarTarefa('estudar de madrugada', []).bloco?.inicio).toBe('05:00')
    })
    it('bloco sem data reconhecida usa hoje', () => {
      expect(interpretarTarefa('ligar às 15h', []).bloco?.data).toBe('2026-07-29')
    })
  })

  describe('duração', () => {
    it('"por 2 horas"', () => {
      expect(interpretarTarefa('estudar por 2 horas', []).duracaoMin).toBe(120)
    })
    it('"30 min"', () => {
      expect(interpretarTarefa('caminhar 30 min', []).duracaoMin).toBe(30)
    })
    it('"meia hora"', () => {
      expect(interpretarTarefa('meditar meia hora', []).duracaoMin).toBe(30)
    })
    it('"2 horas e meia"', () => {
      expect(interpretarTarefa('organizar o quarto 2 horas e meia', []).duracaoMin).toBe(150)
    })
    it('"2h30" (sem marcador de horário antes) vira duração', () => {
      expect(interpretarTarefa('estudar inglês 2h30', []).duracaoMin).toBe(150)
    })
    it('duração some do campo Task.duracaoMin quando vira um bloco (fica só no bloco)', () => {
      const r = interpretarTarefa('lavar roupa às 23h por 1 hora', [])
      expect(r.duracaoMin).toBeUndefined()
      expect(r.bloco?.duracaoMin).toBe(60)
    })
    it('só a duração reconhecida (sem horário) não cria bloco', () => {
      const r = interpretarTarefa('lavar roupa amanhã, 45 min', [])
      expect(r.duracaoMin).toBe(45)
      expect(r.bloco).toBeUndefined()
      expect(r.titulo).toBe('Lavar roupa')
    })
  })

  describe('limpeza de título', () => {
    it('remove palavras de intenção redundantes', () => {
      expect(interpretarTarefa('preciso lavar roupa amanhã', []).titulo).toBe('Lavar roupa')
      expect(interpretarTarefa('tenho que ligar pro dentista', []).titulo).toBe('Ligar pro dentista')
      expect(interpretarTarefa('não esquecer de pagar o boleto', []).titulo).toBe('Pagar o boleto')
      expect(interpretarTarefa('lembrar de comprar presente', []).titulo).toBe('Comprar presente')
    })
    it('nunca esvazia o título mesmo quando tudo foi reconhecido', () => {
      const r = interpretarTarefa('hoje p1', [])
      expect(r.titulo.trim().length).toBeGreaterThan(0)
    })
    it('combina vários campos na mesma frase e limpa tudo', () => {
      const projetos = [projeto({ id: 'px', nome: 'Trabalho' })]
      const r = interpretarTarefa('preciso revisar proposta amanhã até as 18h p1 #Trabalho', projetos)
      expect(r.data).toBe('2026-07-30')
      expect(r.horario).toBe('18:00')
      expect(r.prioridade).toBe(1)
      expect(r.projetoId).toBe('px')
      expect(r.titulo).toBe('Revisar proposta')
    })
  })
})
