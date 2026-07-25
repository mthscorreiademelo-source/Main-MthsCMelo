import { describe, expect, it } from 'vitest'
import FitParser, { FitBaseType, FitEncoder } from 'fit-file-parser'
import { lerTreinosFit, ritmoMinKm, sessaoParaAtividade, tipoDoEsporte } from './fitTreinos'

type Sessao = Parameters<typeof sessaoParaAtividade>[0]
const sessao = (over: Record<string, unknown>): Sessao => over as unknown as Sessao

describe('tipoDoEsporte', () => {
  it('mapeia esportes comuns pro português', () => {
    expect(tipoDoEsporte('running')).toBe('Corrida')
    expect(tipoDoEsporte('walking')).toBe('Caminhada')
    expect(tipoDoEsporte('cycling')).toBe('Ciclismo')
    expect(tipoDoEsporte('swimming')).toBe('Natação')
  })

  it('sub-esporte ganha do esporte principal', () => {
    expect(tipoDoEsporte('training', 'strength_training')).toBe('Treino de força')
    expect(tipoDoEsporte('generic', 'yoga')).toBe('Yoga')
    expect(tipoDoEsporte('running', 'treadmill')).toBe('Corrida (esteira)')
  })

  it('esporte desconhecido vira versão "bonitinha" do nome', () => {
    expect(tipoDoEsporte('kitesurfing')).toBe('Kitesurfing')
    expect(tipoDoEsporte('')).toBe('Treino')
    expect(tipoDoEsporte(42)).toBe('42')
  })
})

describe('ritmoMinKm', () => {
  it('calcula min/km', () => {
    expect(ritmoMinKm(1795, 5)).toBe('5:59 /km') // 359 s/km
    expect(ritmoMinKm(1800, 6)).toBe('5:00 /km')
  })

  it('faz o carry quando os segundos arredondam pra 60', () => {
    // 359.6 s/km → 6:00, não 5:60
    expect(ritmoMinKm(1798, 5)).toBe('6:00 /km')
  })

  it('sem dados válidos, não inventa ritmo', () => {
    expect(ritmoMinKm(0, 5)).toBeUndefined()
    expect(ritmoMinKm(1000, 0)).toBeUndefined()
  })
})

describe('sessaoParaAtividade', () => {
  it('mapeia uma corrida completa', () => {
    const inicio = new Date('2026-07-20T07:10:00')
    const a = sessaoParaAtividade(
      sessao({
        start_time: inicio,
        sport: 'running',
        sub_sport: 'generic',
        total_timer_time: 1795,
        total_elapsed_time: 1800,
        total_distance: 5,
        total_calories: 320,
        avg_heart_rate: 150,
      }),
    )
    expect(a).not.toBeNull()
    expect(a!.id).toBe(`zepp-${Math.floor(inicio.getTime() / 1000)}`)
    expect(a!.data).toBe('2026-07-20')
    expect(a!.hora).toBe('07:10')
    expect(a!.tipo).toBe('Corrida')
    expect(a!.duracaoMin).toBe(30)
    expect(a!.distanciaKm).toBe(5)
    expect(a!.calorias).toBe(320)
    expect(a!.fcMediaTreino).toBe(150)
    expect(a!.ritmo).toBe('5:59 /km')
    expect(a!.origem).toBe('Zepp .FIT')
  })

  it('força/musculação não tem distância nem ritmo', () => {
    const a = sessaoParaAtividade(
      sessao({
        start_time: new Date('2026-07-19T18:30:00'),
        sport: 'training',
        sub_sport: 'strength_training',
        total_timer_time: 2700,
        total_calories: 280,
      }),
    )
    expect(a!.tipo).toBe('Treino de força')
    expect(a!.duracaoMin).toBe(45)
    expect(a!.distanciaKm).toBeUndefined()
    expect(a!.ritmo).toBeUndefined()
    expect(a!.calorias).toBe(280)
  })

  it('ciclismo tem distância mas não calcula ritmo min/km', () => {
    const a = sessaoParaAtividade(
      sessao({
        start_time: new Date('2026-07-18T06:00:00'),
        sport: 'cycling',
        total_timer_time: 3600,
        total_distance: 24,
      }),
    )
    expect(a!.tipo).toBe('Ciclismo')
    expect(a!.distanciaKm).toBe(24)
    expect(a!.ritmo).toBeUndefined()
  })

  it('mesmo instante de início → mesmo id (idempotente)', () => {
    const s = sessao({ start_time: new Date('2026-07-20T07:10:00'), sport: 'running' })
    expect(sessaoParaAtividade(s)!.id).toBe(sessaoParaAtividade(s)!.id)
  })

  it('sem horário de início, não cria atividade', () => {
    expect(sessaoParaAtividade(sessao({ sport: 'running' }))).toBeNull()
  })
})

/** Monta um .FIT mínimo (file_id + 1 sessão) pra provar o parse ponta-a-ponta. */
function fitDeUmaCorrida(inicio: Date, fim: Date): ArrayBuffer {
  const E = FitBaseType
  const enc = new FitEncoder()
  const ts = (d: Date) => FitEncoder.toFitTimestamp(d)
  enc.writeMessage(0, [
    { number: 0, size: 1, baseType: E.Enum, value: 4 },
    { number: 1, size: 2, baseType: E.Uint16, value: 1 },
    { number: 4, size: 4, baseType: E.Uint32, value: ts(inicio) },
  ])
  enc.writeMessage(18, [
    { number: 253, size: 4, baseType: E.Uint32, value: ts(fim) },
    { number: 2, size: 4, baseType: E.Uint32, value: ts(inicio) },
    { number: 5, size: 1, baseType: E.Enum, value: 1 }, // running
    { number: 7, size: 4, baseType: E.Uint32, value: 1800 * 1000 }, // elapsed
    { number: 8, size: 4, baseType: E.Uint32, value: 1795 * 1000 }, // timer
    { number: 9, size: 4, baseType: E.Uint32, value: 5000 * 100 }, // 5000 m
    { number: 11, size: 2, baseType: E.Uint16, value: 320 },
    { number: 16, size: 1, baseType: E.Uint8, value: 150 },
  ])
  const bytes = enc.close()
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

describe('lerTreinosFit (parse real de .FIT)', () => {
  it('lê um .FIT de verdade e devolve a atividade', async () => {
    const inicio = new Date('2026-07-20T07:10:00')
    const fim = new Date('2026-07-20T07:40:00')
    const treinos = await lerTreinosFit(fitDeUmaCorrida(inicio, fim))
    expect(treinos).toHaveLength(1)
    const t = treinos[0]
    expect(t.tipo).toBe('Corrida')
    expect(t.data).toBe('2026-07-20')
    expect(t.hora).toBe('07:10')
    expect(t.duracaoMin).toBe(30)
    expect(t.distanciaKm).toBe(5)
    expect(t.calorias).toBe(320)
    expect(t.fcMediaTreino).toBe(150)
    expect(t.ritmo).toBe('5:59 /km')
    expect(t.id).toBe(`zepp-${Math.floor(inicio.getTime() / 1000)}`)
  })

  it('arquivo que não é .FIT dá erro (não trava)', async () => {
    await expect(lerTreinosFit(new TextEncoder().encode('não sou um fit').buffer as ArrayBuffer)).rejects.toBeTruthy()
  })

  // Sanidade: garante que o parser roda de fato neste ambiente.
  it('o parser existe e aceita opções', () => {
    expect(new FitParser({ mode: 'list' })).toBeTruthy()
  })
})
