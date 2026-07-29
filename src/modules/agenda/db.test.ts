import { describe, expect, it } from 'vitest'
import {
  expandirEventos,
  gerarOcorrencias,
  planoDestacarOcorrencia,
  planoDividirSerie,
  planoExcluirApartirDe,
  planoExcluirSoEsta,
} from './db'
import type { Evento, RecorrenciaEvento } from './types'

function evento(over: Partial<Evento> = {}): Evento {
  return {
    id: 'e1',
    titulo: 'Reunião',
    data: '2026-08-03', // segunda-feira
    inicio: '09:00',
    fim: '10:00',
    criadoEm: 0,
    ...over,
  }
}

describe('gerarOcorrencias', () => {
  it('gera ocorrências diárias respeitando o intervalo', () => {
    const rec: RecorrenciaEvento = { tipo: 'diaria', intervalo: 2 }
    const datas = [...gerarOcorrencias(evento(), rec, '2026-08-10')]
    expect(datas).toEqual(['2026-08-03', '2026-08-05', '2026-08-07', '2026-08-09'])
  })

  it('pula datas em excecoes mas continua contando pro limite de ocorrências', () => {
    const rec: RecorrenciaEvento = { tipo: 'diaria', ocorrencias: 4, excecoes: ['2026-08-04'] }
    const datas = [...gerarOcorrencias(evento(), rec, '2026-12-31')]
    // 4 ocorrências no total (03, 04, 05, 06); a de 04 vira exceção e não é emitida
    expect(datas).toEqual(['2026-08-03', '2026-08-05', '2026-08-06'])
  })

  it('respeita término por data (ate)', () => {
    const rec: RecorrenciaEvento = { tipo: 'semanal', dias: [1], ate: '2026-08-17' }
    const datas = [...gerarOcorrencias(evento(), rec, '2026-12-31')]
    expect(datas).toEqual(['2026-08-03', '2026-08-10', '2026-08-17'])
  })
})

describe('expandirEventos', () => {
  it('expande uma série semanal nos dias pedidos', () => {
    const e = evento({ recorrencia: { tipo: 'semanal', dias: [1] } })
    const out = expandirEventos([e], ['2026-08-03', '2026-08-10', '2026-08-11'])
    expect(out.map((o) => o.data)).toEqual(['2026-08-03', '2026-08-10'])
    expect(out[0].ehOcorrencia).toBe(false)
    expect(out[1].ehOcorrencia).toBe(true)
  })

  it('não gera ocorrência numa data marcada em excecoes', () => {
    const e = evento({ recorrencia: { tipo: 'semanal', dias: [1], excecoes: ['2026-08-10'] } })
    const out = expandirEventos([e], ['2026-08-03', '2026-08-10', '2026-08-17'])
    expect(out.map((o) => o.data)).toEqual(['2026-08-03', '2026-08-17'])
  })

  it('some até a própria data do master quando ela vira exceção', () => {
    const e = evento({ recorrencia: { tipo: 'semanal', dias: [1], excecoes: ['2026-08-03'] } })
    const out = expandirEventos([e], ['2026-08-03', '2026-08-10'])
    expect(out.map((o) => o.data)).toEqual(['2026-08-10'])
  })

  it('inclui normalmente um evento avulso vinculado por serieId, no lugar da ocorrência excluída', () => {
    const master = evento({ recorrencia: { tipo: 'semanal', dias: [1], excecoes: ['2026-08-10'] } })
    const avulso = evento({ id: 'avulso1', data: '2026-08-12', serieId: 'e1', recorrencia: undefined })
    const out = expandirEventos([master, avulso], ['2026-08-10', '2026-08-12'])
    expect(out.map((o) => o.data)).toEqual(['2026-08-12'])
    expect(out[0].evento.id).toBe('avulso1')
  })
})

describe('planoDestacarOcorrencia ("só esta")', () => {
  it('marca a data original como exceção no master e cria um avulso vinculado', () => {
    const master = evento({ recorrencia: { tipo: 'semanal', dias: [1] } })
    const plano = planoDestacarOcorrencia(master, '2026-08-10', { inicio: '14:00', fim: '15:00' })
    expect(plano.mudancasMaster?.recorrencia?.excecoes).toEqual(['2026-08-10'])
    expect(plano.avulso.serieId).toBe('e1')
    expect(plano.avulso.data).toBe('2026-08-10')
    expect(plano.avulso.inicio).toBe('14:00')
    expect(plano.avulso.recorrencia).toBeUndefined()
    expect(plano.avulso.titulo).toBe('Reunião')
  })

  it('o avulso pode nascer numa data diferente da original (arrastar pra outro dia)', () => {
    const master = evento({ recorrencia: { tipo: 'semanal', dias: [1] } })
    const plano = planoDestacarOcorrencia(master, '2026-08-10', { data: '2026-08-11' })
    expect(plano.mudancasMaster?.recorrencia?.excecoes).toEqual(['2026-08-10'])
    expect(plano.avulso.data).toBe('2026-08-11')
  })

  it('não duplica a mesma exceção se já existir', () => {
    const master = evento({ recorrencia: { tipo: 'semanal', dias: [1], excecoes: ['2026-08-10'] } })
    const plano = planoDestacarOcorrencia(master, '2026-08-10', {})
    expect(plano.mudancasMaster?.recorrencia?.excecoes).toEqual(['2026-08-10'])
  })
})

describe('planoDividirSerie ("esta e as próximas")', () => {
  it('divide a série: master antigo termina um dia antes, novo master nasce no corte', () => {
    const master = evento({ recorrencia: { tipo: 'diaria', ocorrencias: 10 } })
    const plano = planoDividirSerie(master, '2026-08-06', { inicio: '08:00' })
    expect(plano.tipo).toBe('dividir')
    if (plano.tipo !== 'dividir') throw new Error('esperado dividir')
    expect(plano.mudancasMasterAntigo.recorrencia?.ate).toBe('2026-08-05')
    expect(plano.mudancasMasterAntigo.recorrencia?.ocorrencias).toBeUndefined()
    expect(plano.novoMaster.data).toBe('2026-08-06')
    expect(plano.novoMaster.inicio).toBe('08:00')
    // 3 ocorrências consumidas antes do corte (03, 04, 05) de um total de 10 → sobram 7
    expect(plano.novoMaster.recorrencia?.ocorrencias).toBe(7)
  })

  it('preserva o término por data (ate) no novo master', () => {
    const master = evento({ recorrencia: { tipo: 'diaria', ate: '2026-08-20' } })
    const plano = planoDividirSerie(master, '2026-08-06')
    if (plano.tipo !== 'dividir') throw new Error('esperado dividir')
    expect(plano.novoMaster.recorrencia?.ate).toBe('2026-08-20')
  })

  it('sem "antes" (corte na própria data do master) equivale a editar a série inteira', () => {
    const master = evento({ recorrencia: { tipo: 'diaria' } })
    const plano = planoDividirSerie(master, master.data, { titulo: 'Novo nome' })
    expect(plano).toEqual({ tipo: 'atualizarMaster', mudancas: { titulo: 'Novo nome' } })
  })

  it('mantém só as exceções futuras (>= corte) no novo master', () => {
    const master = evento({ recorrencia: { tipo: 'diaria', excecoes: ['2026-08-04', '2026-08-08'] } })
    const plano = planoDividirSerie(master, '2026-08-06')
    if (plano.tipo !== 'dividir') throw new Error('esperado dividir')
    expect(plano.novoMaster.recorrencia?.excecoes).toEqual(['2026-08-08'])
  })
})

describe('planoExcluirApartirDe ("esta e as próximas" — excluir)', () => {
  it('a série para um dia antes do corte, sem continuação', () => {
    const master = evento({ recorrencia: { tipo: 'diaria', ocorrencias: 10 } })
    const plano = planoExcluirApartirDe(master, '2026-08-06')
    expect(plano).toEqual({
      tipo: 'truncarMaster',
      mudancas: { recorrencia: { tipo: 'diaria', ate: '2026-08-05', ocorrencias: undefined } },
    })
  })

  it('corte na própria data do master exclui a série inteira', () => {
    const master = evento({ recorrencia: { tipo: 'diaria' } })
    expect(planoExcluirApartirDe(master, master.data)).toEqual({ tipo: 'excluirMaster' })
  })
})

describe('planoExcluirSoEsta', () => {
  it('adiciona a data como exceção no master, sem criar avulso', () => {
    const master = evento({ recorrencia: { tipo: 'semanal', dias: [1] } })
    const mudancas = planoExcluirSoEsta(master, '2026-08-10')
    expect(mudancas.recorrencia?.excecoes).toEqual(['2026-08-10'])
  })

  it('não duplica a mesma exceção se já existir', () => {
    const master = evento({ recorrencia: { tipo: 'semanal', dias: [1], excecoes: ['2026-08-10'] } })
    const mudancas = planoExcluirSoEsta(master, '2026-08-10')
    expect(mudancas.recorrencia?.excecoes).toEqual(['2026-08-10'])
  })
})
