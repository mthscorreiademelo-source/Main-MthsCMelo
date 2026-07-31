import { nanoid } from 'nanoid'
import { db } from '../../core/db/db'
import { SEMEAR_EXEMPLOS } from '../../core/db/exemplos'
import type {
  Atividade,
  Consulta,
  DoacaoSangue,
  Exame,
  Medicamento,
  Medida,
  MetricaSaude,
  Profissional,
  Refeicao,
  SaudeConfig,
  SaudeDia,
  StatusExame,
  TipoMedida,
  Vacina,
} from './types'

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
  {
    chave: 'aguaMl',
    nome: 'Água',
    icone: 'gota',
    cor: '#4d9bd6',
    unidade: 'L',
    formatar: (v) => `${(v / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L`,
    // entrada em litros (ex.: 1,5) → ml
    daEntrada: (t) => {
      const n = Number(t.replace(',', '.'))
      return Number.isFinite(n) ? Math.round(n * 1000) : undefined
    },
  },
  {
    chave: 'spo2',
    nome: 'Oxigenação',
    icone: 'coracao',
    cor: '#6a86b8',
    unidade: '%',
    formatar: (v) => `${v}%`,
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

/* --------------------------- Medidas corporais ---------------------------- */

export interface DefMedida {
  tipo: TipoMedida
  nome: string
  unidade: string
  icone: string
  /** casas decimais na exibição. */
  dec?: number
}

export const MEDIDAS: DefMedida[] = [
  { tipo: 'peso', nome: 'Peso', unidade: 'kg', icone: '⚖️', dec: 1 },
  { tipo: 'gordura', nome: '% Gordura', unidade: '%', icone: '📉', dec: 1 },
  { tipo: 'massaMuscular', nome: 'Massa muscular', unidade: 'kg', icone: '💪', dec: 1 },
  { tipo: 'cintura', nome: 'Cintura', unidade: 'cm', icone: '📏' },
  { tipo: 'quadril', nome: 'Quadril', unidade: 'cm', icone: '📏' },
  { tipo: 'peitoral', nome: 'Peitoral', unidade: 'cm', icone: '📏' },
  { tipo: 'braco', nome: 'Braço', unidade: 'cm', icone: '📏' },
  { tipo: 'coxa', nome: 'Coxa', unidade: 'cm', icone: '📏' },
  { tipo: 'panturrilha', nome: 'Panturrilha', unidade: 'cm', icone: '📏' },
  { tipo: 'altura', nome: 'Altura', unidade: 'cm', icone: '📐' },
]

export const DEF_MEDIDA = new Map(MEDIDAS.map((m) => [m.tipo, m]))

export function formatarMedida(tipo: TipoMedida, valor: number): string {
  const d = DEF_MEDIDA.get(tipo)
  const dec = d?.dec ?? 0
  return `${valor.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })} ${d?.unidade ?? ''}`.trim()
}

/** Última medida de cada tipo (para os cartões). */
export function ultimaMedida(medidas: Medida[], tipo: TipoMedida): Medida | undefined {
  return medidas.filter((m) => m.tipo === tipo).sort((a, b) => (a.data < b.data ? 1 : -1))[0]
}

export async function salvarMedida(tipo: TipoMedida, data: string, valor: number): Promise<string> {
  const id = `${tipo}:${data}`
  await db.saudeMedidas.put({ id, tipo, data, valor, criadoEm: Date.now() })
  return id
}
export const excluirMedida = (id: string) => db.saudeMedidas.delete(id)

/** IMC a partir do peso (kg) e altura (cm). */
export function calcularIMC(pesoKg?: number, alturaCm?: number): number | undefined {
  if (!pesoKg || !alturaCm) return undefined
  const m = alturaCm / 100
  return pesoKg / (m * m)
}
export function classificacaoIMC(imc: number): string {
  if (imc < 18.5) return 'Abaixo'
  if (imc < 25) return 'Saudável'
  if (imc < 30) return 'Sobrepeso'
  return 'Obesidade'
}

/* -------------------------------- Atividades ------------------------------ */

export async function criarAtividade(d: Partial<Atividade> & { tipo: string; data: string }): Promise<string> {
  const id = d.id ?? nanoid()
  await db.atividades.add({ id, tipo: d.tipo, data: d.data, hora: d.hora, duracaoMin: d.duracaoMin, calorias: d.calorias, distanciaKm: d.distanciaKm, ritmo: d.ritmo, origem: d.origem ?? 'Manual', obs: d.obs, criadoEm: Date.now() })
  return id
}
export const atualizarAtividade = (id: string, m: Partial<Atividade>) => db.atividades.update(id, m)
export const excluirAtividade = (id: string) => db.atividades.delete(id)

/* ------------------------------- Refeições -------------------------------- */

export async function criarRefeicao(d: Partial<Refeicao> & { data: string }): Promise<string> {
  const id = d.id ?? nanoid()
  await db.refeicoes.add({ id, data: d.data, hora: d.hora, tipo: d.tipo ?? 'lanche', descricao: d.descricao ?? '', fotoId: d.fotoId, calorias: d.calorias, proteinaG: d.proteinaG, carboidratoG: d.carboidratoG, gorduraG: d.gorduraG, fibraG: d.fibraG, sodioMg: d.sodioMg, criadoEm: Date.now() })
  return id
}
export const atualizarRefeicao = (id: string, m: Partial<Refeicao>) => db.refeicoes.update(id, m)
export const excluirRefeicao = (id: string) => db.refeicoes.delete(id)

/* --------------------------- Profissionais/Consultas ---------------------- */

export async function criarProfissional(d: Partial<Profissional> & { nome: string }): Promise<string> {
  const id = d.id ?? nanoid()
  await db.profissionais.add({ id, nome: d.nome.trim() || 'Profissional', especialidade: d.especialidade, telefone: d.telefone, clinica: d.clinica, obs: d.obs, criadoEm: Date.now() })
  return id
}
export const atualizarProfissional = (id: string, m: Partial<Profissional>) => db.profissionais.update(id, m)
export const excluirProfissional = (id: string) => db.profissionais.delete(id)

export async function criarConsulta(d: Partial<Consulta> & { data: string }): Promise<string> {
  const id = d.id ?? nanoid()
  await db.consultas.add({ id, profissionalId: d.profissionalId, titulo: d.titulo, especialidade: d.especialidade, data: d.data, hora: d.hora, local: d.local, status: d.status ?? 'agendada', recomendacoes: d.recomendacoes, obs: d.obs, custoCentavos: d.custoCentavos, criadoEm: Date.now() })
  return id
}
export const atualizarConsulta = (id: string, m: Partial<Consulta>) => db.consultas.update(id, m)
export async function excluirConsulta(id: string) {
  const c = await db.consultas.get(id)
  if (c?.eventoId) await db.eventos.delete(c.eventoId)
  await db.consultas.delete(id)
}

/* ------------------------------- Medicamentos ----------------------------- */

export async function criarMedicamento(d: Partial<Medicamento> & { nome: string }): Promise<string> {
  const id = d.id ?? nanoid()
  await db.medicamentos.add({ id, nome: d.nome.trim() || 'Medicamento', dosagem: d.dosagem, horarios: d.horarios ?? [], frequencia: d.frequencia, estoque: d.estoque, estoqueAlerta: d.estoqueAlerta, ativo: d.ativo ?? true, cor: d.cor, obs: d.obs, criadoEm: Date.now() })
  return id
}
export const atualizarMedicamento = (id: string, m: Partial<Medicamento>) => db.medicamentos.update(id, m)
export const excluirMedicamento = (id: string) => db.medicamentos.delete(id)

/**
 * Ajusta o estoque de um medicamento em `delta` unidades (ex.: -1 ao tomar, +1 ao desfazer).
 * Nunca deixa o estoque ficar negativo (piso em 0). No-op se o medicamento não existir
 * ou não tiver controle de estoque (`estoque` undefined). Pensado para ser chamado por
 * outros módulos (ex.: um hábito vinculado a este medicamento).
 */
export async function ajustarEstoqueMedicamento(medicamentoId: string, delta: number): Promise<void> {
  const med = await db.medicamentos.get(medicamentoId)
  if (med?.estoque == null) return
  await db.medicamentos.update(medicamentoId, { estoque: Math.max(0, med.estoque + delta) })
}

/** Marca/desmarca uma dose como tomada e baixa/repõe o estoque. */
export async function alternarTomada(medicamentoId: string, data: string, hora: string) {
  const id = `${medicamentoId}:${data}:${hora}`
  const existe = await db.medicamentoTomadas.get(id)
  const med = await db.medicamentos.get(medicamentoId)
  if (existe) {
    await db.medicamentoTomadas.delete(id)
    if (med?.estoque != null) await db.medicamentos.update(medicamentoId, { estoque: med.estoque + 1 })
  } else {
    await db.medicamentoTomadas.add({ id, medicamentoId, data, hora, criadoEm: Date.now() })
    if (med?.estoque != null && med.estoque > 0) await db.medicamentos.update(medicamentoId, { estoque: med.estoque - 1 })
  }
}

/* --------------------------------- Exames --------------------------------- */

/** Deriva o status pelo valor e faixa de referência. */
export function statusPorReferencia(valor?: number, refMin?: number, refMax?: number): StatusExame | undefined {
  if (valor == null || (refMin == null && refMax == null)) return undefined
  const min = refMin ?? -Infinity
  const max = refMax ?? Infinity
  if (valor >= min && valor <= max) return 'normal'
  // até 10% fora = atenção; mais que isso = alterado
  const margem = (max === Infinity ? min : max === -Infinity ? max : Math.abs(max - min)) * 0.1 || Math.abs(valor) * 0.1
  if ((valor < min && min - valor <= margem) || (valor > max && valor - max <= margem)) return 'atencao'
  return 'alterado'
}

export async function criarExame(d: Partial<Exame> & { nome: string; data: string }): Promise<string> {
  const id = d.id ?? nanoid()
  const status = d.status ?? statusPorReferencia(d.valorNum, d.refMin, d.refMax)
  await db.exames.add({ id, nome: d.nome.trim() || 'Exame', marcador: d.marcador ?? d.nome.trim(), data: d.data, valorNum: d.valorNum, valorTexto: d.valorTexto, unidade: d.unidade, refMin: d.refMin, refMax: d.refMax, status, arquivoId: d.arquivoId, obs: d.obs, criadoEm: Date.now() })
  return id
}
export const atualizarExame = (id: string, m: Partial<Exame>) => db.exames.update(id, m)
export const excluirExame = (id: string) => db.exames.delete(id)

/* --------------------------------- Vacinas -------------------------------- */

export async function criarVacina(d: Partial<Vacina> & { nome: string }): Promise<string> {
  const id = d.id ?? nanoid()
  await db.vacinas.add({ id, nome: d.nome.trim() || 'Vacina', data: d.data, dose: d.dose, proximaDose: d.proximaDose, lote: d.lote, comprovanteId: d.comprovanteId, obs: d.obs, criadoEm: Date.now() })
  return id
}
export const atualizarVacina = (id: string, m: Partial<Vacina>) => db.vacinas.update(id, m)
export const excluirVacina = (id: string) => db.vacinas.delete(id)

/* ----------------------------- Doação de sangue --------------------------- */

export async function criarDoacao(d: Partial<DoacaoSangue> & { data: string }): Promise<string> {
  const id = d.id ?? nanoid()
  await db.doacoesSangue.add({ id, data: d.data, local: d.local, obs: d.obs, criadoEm: Date.now() })
  return id
}
export const atualizarDoacao = (id: string, m: Partial<DoacaoSangue>) => db.doacoesSangue.update(id, m)
export const excluirDoacao = (id: string) => db.doacoesSangue.delete(id)

/** Homens podem doar a cada 60 dias; mulheres, 90. Usamos 60 como padrão. */
export function proximaDoacao(ultimaISO: string): string {
  const d = new Date(`${ultimaISO}T00:00:00`)
  d.setDate(d.getDate() + 60)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* --------------------------------- Config --------------------------------- */

export async function salvarSaudeConfig(m: Partial<SaudeConfig>) {
  const atual = (await db.saudeConfig.get('default')) ?? { id: 'default' }
  await db.saudeConfig.put({ ...atual, ...m, id: 'default' })
}

/* ------------------------------ Seed exemplo ------------------------------ */

function iso(off: number): string {
  const d = new Date()
  d.setDate(d.getDate() + off)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Semeia um prontuário de exemplo na primeira visita (tudo editável). */
export async function semearSaudeSePreciso() {
  if (!SEMEAR_EXEMPLOS) return
  const cfg = await db.saudeConfig.get('default')
  if (cfg?.semeado) return
  await salvarSaudeConfig({
    semeado: true,
    tipoSanguineo: 'O+',
    alturaCm: 178,
    metaAguaMl: 2000,
    metaPassos: 8000,
    metaSonoMin: 480,
    metaPesoKg: 82,
    metaCaloriasAtivas: 600,
  })

  if ((await db.saude.count()) === 0) {
    // 14 dias de métricas diárias com alguma variação natural.
    const base = [
      { s: 470, p: 8200, c: 540, f: 62, e: 45, a: 2100, o: 97 },
      { s: 430, p: 6100, c: 380, f: 66, e: 0, a: 1600, o: 97 },
      { s: 500, p: 9400, c: 620, f: 61, e: 60, a: 2300, o: 98 },
      { s: 445, p: 5200, c: 300, f: 65, e: 20, a: 1400, o: 96 },
      { s: 460, p: 7800, c: 500, f: 63, e: 40, a: 1900, o: 97 },
      { s: 480, p: 8600, c: 560, f: 62, e: 50, a: 2200, o: 98 },
      { s: 410, p: 4300, c: 260, f: 67, e: 0, a: 1200, o: 96 },
    ]
    for (let i = 13; i >= 0; i--) {
      const b = base[(13 - i) % base.length]
      await db.saude.put({
        id: iso(-i), data: iso(-i),
        sonoMin: b.s + ((i % 3) - 1) * 12, passos: b.p + (i % 5) * 120, caloriasAtivas: b.c,
        fcRepouso: b.f, exercicioMin: b.e, aguaMl: b.a, spo2: b.o,
        criadoEm: Date.now(),
      })
    }
    // hoje (parcial, como no meio do dia)
    await db.saude.put({ id: iso(0), data: iso(0), sonoMin: 382, passos: 4572, caloriasAtivas: 210, fcRepouso: 67, exercicioMin: 20, aguaMl: 1000, spo2: 98, criadoEm: Date.now() })
  }

  if ((await db.saudeMedidas.count()) === 0) {
    const medHoje: [TipoMedida, number][] = [
      ['peso', 84.2], ['gordura', 21.3], ['massaMuscular', 36.4], ['cintura', 92],
      ['quadril', 101], ['peitoral', 104], ['braco', 34], ['coxa', 56], ['panturrilha', 38], ['altura', 178],
    ]
    for (const [tipo, valor] of medHoje) await salvarMedida(tipo, iso(0), valor)
    // histórico de peso (para o gráfico)
    const pesos = [86.1, 85.6, 85.2, 84.9, 84.8, 84.2]
    for (let k = 0; k < pesos.length; k++) await salvarMedida('peso', iso(-(150 - k * 30)), pesos[k])
  }

  if ((await db.atividades.count()) === 0) {
    await db.atividades.bulkAdd([
      { id: nanoid(), data: iso(0), hora: '07:25', tipo: 'Caminhada', duracaoMin: 35, distanciaKm: 2.8, calorias: 180, origem: 'Manual', criadoEm: Date.now() },
      { id: nanoid(), data: iso(0), hora: '18:30', tipo: 'Treino de força', duracaoMin: 45, calorias: 280, origem: 'Manual', criadoEm: Date.now() },
      { id: nanoid(), data: iso(-1), hora: '07:10', tipo: 'Corrida', duracaoMin: 30, distanciaKm: 5, ritmo: '6:00 /km', calorias: 320, origem: 'Manual', criadoEm: Date.now() },
    ])
  }

  if ((await db.refeicoes.count()) === 0) {
    await db.refeicoes.bulkAdd([
      { id: nanoid(), data: iso(0), hora: '07:45', tipo: 'cafe', descricao: 'Ovos, pão integral e café', calorias: 380, proteinaG: 22, carboidratoG: 34, gorduraG: 16, criadoEm: Date.now() },
      { id: nanoid(), data: iso(0), hora: '12:30', tipo: 'almoco', descricao: 'Frango, arroz, feijão e salada', calorias: 620, proteinaG: 45, carboidratoG: 60, gorduraG: 18, fibraG: 9, criadoEm: Date.now() },
      { id: nanoid(), data: iso(-1), hora: '20:00', tipo: 'jantar', descricao: 'Salmão e legumes', calorias: 520, proteinaG: 38, carboidratoG: 20, gorduraG: 28, criadoEm: Date.now() },
    ])
  }

  if ((await db.profissionais.count()) === 0) {
    const nutri = nanoid()
    const cardio = nanoid()
    await db.profissionais.bulkAdd([
      { id: nutri, nome: 'Dra. Ana Nutri', especialidade: 'Nutricionista', clinica: 'Clínica Performance', criadoEm: Date.now() },
      { id: cardio, nome: 'Dr. Carlos Cardio', especialidade: 'Cardiologista', clinica: 'Instituto do Coração', criadoEm: Date.now() },
    ])
    await db.consultas.bulkAdd([
      { id: nanoid(), profissionalId: nutri, titulo: 'Avaliação física', especialidade: 'Nutricionista', data: iso(7), hora: '14:00', local: 'Clínica Performance', status: 'agendada', custoCentavos: 25000, criadoEm: Date.now() },
      { id: nanoid(), profissionalId: cardio, titulo: 'Retorno cardiológico', especialidade: 'Cardiologista', data: iso(-40), hora: '09:00', local: 'Instituto do Coração', status: 'realizada', recomendacoes: 'Manter caminhadas 3x/semana.', criadoEm: Date.now() },
    ])
  }

  if ((await db.medicamentos.count()) === 0) {
    await db.medicamentos.bulkAdd([
      { id: nanoid(), nome: 'Vitamina D', dosagem: '1.000 UI', horarios: ['08:00'], frequencia: 'Diário', estoque: 24, estoqueAlerta: 7, ativo: true, cor: '#eb8909', criadoEm: Date.now() },
      { id: nanoid(), nome: 'Ômega 3', dosagem: '1 cápsula', horarios: ['12:00'], frequencia: 'Diário', estoque: 40, estoqueAlerta: 10, ativo: true, cor: '#4d9bd6', criadoEm: Date.now() },
      { id: nanoid(), nome: 'Magnésio', dosagem: '200 mg', horarios: ['20:00'], frequencia: 'Diário', estoque: 5, estoqueAlerta: 7, ativo: true, cor: '#884dff', criadoEm: Date.now() },
    ])
  }

  if ((await db.exames.count()) === 0) {
    const dExame = iso(-40)
    await db.exames.bulkAdd([
      { id: nanoid(), nome: 'Hemograma completo', marcador: 'Hemoglobina', data: dExame, valorNum: 15.1, unidade: 'g/dL', refMin: 13, refMax: 17, status: 'normal', criadoEm: Date.now() },
      { id: nanoid(), nome: 'Vitamina D', marcador: 'Vitamina D', data: dExame, valorNum: 34, unidade: 'ng/mL', refMin: 30, refMax: 100, status: 'normal', criadoEm: Date.now() },
      { id: nanoid(), nome: 'Glicemia em jejum', marcador: 'Glicose', data: dExame, valorNum: 104, unidade: 'mg/dL', refMin: 70, refMax: 99, status: 'atencao', criadoEm: Date.now() },
      { id: nanoid(), nome: 'Colesterol total', marcador: 'Colesterol', data: dExame, valorNum: 185, unidade: 'mg/dL', refMin: 0, refMax: 190, status: 'normal', criadoEm: Date.now() },
      // histórico do colesterol (para o gráfico de evolução do marcador)
      { id: nanoid(), nome: 'Colesterol total', marcador: 'Colesterol', data: iso(-400), valorNum: 214, unidade: 'mg/dL', refMin: 0, refMax: 190, status: 'atencao', criadoEm: Date.now() },
      { id: nanoid(), nome: 'Colesterol total', marcador: 'Colesterol', data: iso(-220), valorNum: 201, unidade: 'mg/dL', refMin: 0, refMax: 190, status: 'atencao', criadoEm: Date.now() },
    ])
  }

  if ((await db.vacinas.count()) === 0) {
    await db.vacinas.bulkAdd([
      { id: nanoid(), nome: 'Influenza (gripe)', data: iso(-120), dose: 'Anual', lote: 'FLU2026A', criadoEm: Date.now() },
      { id: nanoid(), nome: 'Febre amarela', proximaDose: iso(118), criadoEm: Date.now() },
      { id: nanoid(), nome: 'Hepatite B', data: iso(-800), dose: '3ª dose', criadoEm: Date.now() },
    ])
  }

  if ((await db.doacoesSangue.count()) === 0) {
    await db.doacoesSangue.add({ id: nanoid(), data: iso(-127), local: 'Hemocentro', criadoEm: Date.now() })
  }
}
