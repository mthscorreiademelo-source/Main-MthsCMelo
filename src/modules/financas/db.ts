import { nanoid } from 'nanoid'
import { db } from '../../core/db/db'
import type {
  Conta,
  FinancasConfig,
  Movimento,
  Objetivo,
  OrcamentoLinha,
  Recorrente,
  TipoMovimento,
} from './types'

export const CATEGORIAS = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Saúde',
  'Educação',
  'Lazer',
  'Investimentos',
  'Outros',
] as const

/** Quanto um movimento soma (+) ou subtrai (−) do saldo da sua conta. */
function deltaMov(tipo: TipoMovimento, valorCentavos: number): number {
  return tipo === 'entrada' ? valorCentavos : -valorCentavos
}

/** Aplica um delta ao saldo de uma conta (sem deixar o campo negativo travar nada). */
async function ajustarSaldo(contaId: string | undefined, delta: number) {
  if (!contaId || delta === 0) return
  await db.contas.where('id').equals(contaId).modify((c) => {
    c.saldoCentavos = c.saldoCentavos + delta
  })
}

export async function criarMovimento(dados: {
  tipo: TipoMovimento
  valorCentavos: number
  descricao: string
  data: string
  categoria?: string
  /** Conta de onde saiu/entrou o dinheiro; ajusta o saldo dela. */
  contaId?: string
  /** Vínculo opcional com um pet (integração com o módulo Pets). */
  petId?: string
}): Promise<string | undefined> {
  if (!dados.descricao.trim() || dados.valorCentavos <= 0) return undefined
  const id = nanoid()
  await db.transaction('rw', db.movimentos, db.contas, async () => {
    await db.movimentos.add({
      id,
      ...dados,
      descricao: dados.descricao.trim(),
      criadoEm: Date.now(),
    })
    await ajustarSaldo(dados.contaId, deltaMov(dados.tipo, dados.valorCentavos))
  })
  return id
}

export async function atualizarMovimento(id: string, mudancas: Partial<Movimento>) {
  await db.transaction('rw', db.movimentos, db.contas, async () => {
    const antigo = await db.movimentos.get(id)
    if (!antigo) return
    const novo = { ...antigo, ...mudancas }
    // Reverte o efeito antigo e aplica o novo (cobre troca de conta, valor ou tipo).
    await ajustarSaldo(antigo.contaId, -deltaMov(antigo.tipo, antigo.valorCentavos))
    await ajustarSaldo(novo.contaId, deltaMov(novo.tipo, novo.valorCentavos))
    await db.movimentos.update(id, mudancas)
  })
}

export async function excluirMovimento(id: string) {
  await db.transaction('rw', db.movimentos, db.contas, async () => {
    const antigo = await db.movimentos.get(id)
    if (antigo) await ajustarSaldo(antigo.contaId, -deltaMov(antigo.tipo, antigo.valorCentavos))
    await db.movimentos.delete(id)
  })
}

/* ---------- valores ---------- */

/** Converte texto pt-BR ("1.234,56", "50", "12,5") em centavos; null se inválido. */
export function parsearValor(texto: string): number | null {
  let limpo = texto.replace(/[R$\s]/g, '')
  if (!limpo) return null
  if (limpo.includes(',')) {
    limpo = limpo.replace(/\./g, '').replace(',', '.')
  }
  const numero = Number(limpo)
  if (!Number.isFinite(numero) || numero < 0) return null
  return Math.round(numero * 100)
}

const fmtBRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatarBRL(centavos: number): string {
  return fmtBRL.format(centavos / 100)
}

/** Centavos → texto editável simples ("1234,56"). */
export function valorParaTexto(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',')
}

/* ---------- seleção ---------- */

export function filtrarMes(movimentos: Movimento[], mes: string): Movimento[] {
  return movimentos.filter((m) => m.data.startsWith(mes))
}

export function totais(movimentos: Movimento[]) {
  let entradas = 0
  let saidas = 0
  for (const m of movimentos) {
    if (m.tipo === 'entrada') entradas += m.valorCentavos
    else saidas += m.valorCentavos
  }
  return { entradas, saidas, saldo: entradas - saidas }
}

/** Agrupa por dia, dias e itens mais recentes primeiro. */
export function agruparPorDia(movimentos: Movimento[]): [string, Movimento[]][] {
  const mapa = new Map<string, Movimento[]>()
  const ordenados = [...movimentos].sort(
    (a, b) => (a.data === b.data ? b.criadoEm - a.criadoEm : a.data < b.data ? 1 : -1),
  )
  for (const m of ordenados) {
    if (!mapa.has(m.data)) mapa.set(m.data, [])
    mapa.get(m.data)!.push(m)
  }
  return [...mapa.entries()]
}

/* ------------------------------- Contas ----------------------------------- */

async function proximaOrdem(tabela: 'contas' | 'objetivos' | 'recorrentes' | 'orcamentoLinhas'): Promise<number> {
  const ultimo = await db[tabela].orderBy('ordem').last()
  return (ultimo?.ordem ?? 0) + 1
}

export async function criarConta(dados: Partial<Conta> & { nome: string }): Promise<string> {
  const id = dados.id ?? nanoid()
  await db.contas.add({
    id,
    nome: dados.nome.trim() || 'Conta',
    tipo: dados.tipo ?? 'corrente',
    saldoCentavos: dados.saldoCentavos ?? 0,
    cor: dados.cor,
    icone: dados.icone,
    ordem: dados.ordem ?? (await proximaOrdem('contas')),
    criadoEm: Date.now(),
  })
  return id
}
export const atualizarConta = (id: string, m: Partial<Conta>) => db.contas.update(id, m)
export const excluirConta = (id: string) => db.contas.delete(id)

/* ------------------------------ Objetivos --------------------------------- */

export async function criarObjetivo(dados: Partial<Objetivo> & { nome: string }): Promise<string> {
  const id = dados.id ?? nanoid()
  await db.objetivos.add({
    id,
    nome: dados.nome.trim() || 'Objetivo',
    icone: dados.icone,
    cor: dados.cor,
    alvoCentavos: dados.alvoCentavos ?? 0,
    atualCentavos: dados.atualCentavos ?? 0,
    aporteMensalCentavos: dados.aporteMensalCentavos,
    tipo: dados.tipo ?? 'meta',
    ordem: dados.ordem ?? (await proximaOrdem('objetivos')),
    criadoEm: Date.now(),
  })
  return id
}
export const atualizarObjetivo = (id: string, m: Partial<Objetivo>) => db.objetivos.update(id, m)
export const excluirObjetivo = (id: string) => db.objetivos.delete(id)

/* ---------- caixinhas: guardar / retirar / rendimento ---------- */

/**
 * Guarda dinheiro num objetivo, tirando de uma conta. É uma transferência
 * interna (não é gasto): a conta cai e o objetivo sobe. Como o disponível é
 * calculado pelo saldo das contas líquidas, guardar reduz o que dá pra gastar.
 */
export async function guardarNoObjetivo(objetivoId: string, contaId: string | undefined, centavos: number) {
  if (centavos <= 0) return
  await db.transaction('rw', db.objetivos, db.contas, async () => {
    if (contaId) await db.contas.where('id').equals(contaId).modify((c) => { c.saldoCentavos -= centavos })
    await db.objetivos.where('id').equals(objetivoId).modify((o) => { o.atualCentavos += centavos })
  })
}

/** Retira dinheiro de um objetivo de volta para uma conta (o inverso de guardar). */
export async function retirarDoObjetivo(objetivoId: string, contaId: string | undefined, centavos: number) {
  if (centavos <= 0) return
  await db.transaction('rw', db.objetivos, db.contas, async () => {
    await db.objetivos.where('id').equals(objetivoId).modify((o) => {
      o.atualCentavos = Math.max(0, o.atualCentavos - centavos)
    })
    if (contaId) await db.contas.where('id').equals(contaId).modify((c) => { c.saldoCentavos += centavos })
  })
}

/** Rendimento: o objetivo cresce sozinho (juros/valorização), sem mexer em conta. */
export async function renderNoObjetivo(objetivoId: string, centavos: number) {
  if (centavos <= 0) return
  await db.objetivos.where('id').equals(objetivoId).modify((o) => { o.atualCentavos += centavos })
}

/* ------------------------------ Recorrentes ------------------------------- */

export async function criarRecorrente(dados: Partial<Recorrente> & { nome: string }): Promise<string> {
  const id = dados.id ?? nanoid()
  await db.recorrentes.add({
    id,
    nome: dados.nome.trim() || 'Recorrente',
    tipo: dados.tipo ?? 'saida',
    valorCentavos: dados.valorCentavos ?? 0,
    categoria: dados.categoria,
    diaMes: Math.min(31, Math.max(1, dados.diaMes ?? 1)),
    ativo: dados.ativo ?? true,
    cor: dados.cor,
    icone: dados.icone,
    ordem: dados.ordem ?? (await proximaOrdem('recorrentes')),
    criadoEm: Date.now(),
  })
  return id
}
export const atualizarRecorrente = (id: string, m: Partial<Recorrente>) => db.recorrentes.update(id, m)
export const excluirRecorrente = (id: string) => db.recorrentes.delete(id)

/* --------------------------- Linhas do orçamento -------------------------- */

export async function criarOrcamentoLinha(dados: Partial<OrcamentoLinha> & { nome: string }): Promise<string> {
  const id = dados.id ?? nanoid()
  await db.orcamentoLinhas.add({
    id,
    nome: dados.nome.trim() || 'Categoria',
    cor: dados.cor ?? '#7c9885',
    icone: dados.icone,
    limiteCentavos: dados.limiteCentavos ?? 0,
    categorias: dados.categorias ?? [],
    ordem: dados.ordem ?? (await proximaOrdem('orcamentoLinhas')),
    criadoEm: Date.now(),
  })
  return id
}
export const atualizarOrcamentoLinha = (id: string, m: Partial<OrcamentoLinha>) => db.orcamentoLinhas.update(id, m)
export const excluirOrcamentoLinha = (id: string) => db.orcamentoLinhas.delete(id)

/* -------------------------------- Config ---------------------------------- */

export async function salvarConfig(m: Partial<FinancasConfig>) {
  const atual = (await db.financasConfig.get('default')) ?? {
    id: 'default',
    rendaMensalCentavos: 0,
    investimentoMensalCentavos: 0,
  }
  await db.financasConfig.put({ ...atual, ...m, id: 'default' })
}

/** Grava o snapshot do patrimônio do mês corrente (para o gráfico de evolução). */
export async function registrarSnapshot(mes: string, valorCentavos: number) {
  await db.patrimonioSnapshots.put({ mes, valorCentavos })
}

/* ------------------------------ Seed exemplo ------------------------------ */

function isoDia(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function tsHoje(h: number, min: number): number {
  const d = new Date()
  d.setHours(h, min, 0, 0)
  return d.getTime()
}

/**
 * Semeia um exemplo realista na primeira vez (para a tela nascer preenchida).
 * Tudo é editável/removível. Guardado por `config.semeado`.
 */
export async function semearFinancasSePreciso() {
  const cfg = await db.financasConfig.get('default')
  if (cfg?.semeado) return
  const jaTemContas = (await db.contas.count()) > 0
  const jaTemMov = (await db.movimentos.count()) > 0

  const hoje = new Date()

  await salvarConfig({ rendaMensalCentavos: 600000, investimentoMensalCentavos: 50000, semeado: true })

  if (!jaTemContas) {
    await db.contas.bulkAdd([
      { id: nanoid(), nome: 'Conta corrente', tipo: 'corrente', saldoCentavos: 242000, cor: '#4073ff', icone: '🏦', ordem: 1, criadoEm: Date.now() },
      { id: nanoid(), nome: 'Reserva (poupança)', tipo: 'poupanca', saldoCentavos: 630000, cor: '#299438', icone: '🛟', ordem: 2, criadoEm: Date.now() },
      { id: nanoid(), nome: 'Investimentos', tipo: 'investimento', saldoCentavos: 950000, cor: '#884dff', icone: '📈', ordem: 3, criadoEm: Date.now() },
      { id: nanoid(), nome: 'Carteira', tipo: 'carteira', saldoCentavos: 20000, cor: '#eb8909', icone: '👛', ordem: 4, criadoEm: Date.now() },
    ])

    await db.objetivos.bulkAdd([
      { id: nanoid(), nome: 'Reserva de emergência', icone: '🛟', cor: '#299438', alvoCentavos: 1000000, atualCentavos: 630000, aporteMensalCentavos: 50000, tipo: 'reserva', ordem: 1, criadoEm: Date.now() },
      { id: nanoid(), nome: 'Notebook novo', icone: '💻', cor: '#884dff', alvoCentavos: 500000, atualCentavos: 205000, aporteMensalCentavos: 30000, tipo: 'meta', ordem: 2, criadoEm: Date.now() },
      { id: nanoid(), nome: 'Viagem ao Japão', icone: '✈️', cor: '#eb8909', alvoCentavos: 900000, atualCentavos: 162000, aporteMensalCentavos: 40000, tipo: 'meta', ordem: 3, criadoEm: Date.now() },
    ])

    await db.recorrentes.bulkAdd([
      { id: nanoid(), nome: 'Aluguel', tipo: 'saida', valorCentavos: 150000, categoria: 'Moradia', diaMes: 5, ativo: true, icone: '🏠', ordem: 1, criadoEm: Date.now() },
      { id: nanoid(), nome: 'Internet', tipo: 'saida', valorCentavos: 10000, categoria: 'Moradia', diaMes: 10, ativo: true, icone: '🌐', ordem: 2, criadoEm: Date.now() },
      { id: nanoid(), nome: 'Academia', tipo: 'saida', valorCentavos: 12000, categoria: 'Saúde', diaMes: 8, ativo: true, icone: '🏋️', ordem: 3, criadoEm: Date.now() },
      { id: nanoid(), nome: 'Spotify', tipo: 'saida', valorCentavos: 2190, categoria: 'Lazer', diaMes: 15, ativo: true, icone: '🎵', ordem: 4, criadoEm: Date.now() },
      { id: nanoid(), nome: 'Netflix', tipo: 'saida', valorCentavos: 4490, categoria: 'Lazer', diaMes: 20, ativo: true, icone: '🎬', ordem: 5, criadoEm: Date.now() },
    ])

    await db.orcamentoLinhas.bulkAdd([
      { id: nanoid(), nome: 'Essencial', cor: '#7c9885', icone: '🏠', limiteCentavos: 215000, categorias: ['Alimentação', 'Moradia', 'Transporte', 'Saúde'], ordem: 1, criadoEm: Date.now() },
      { id: nanoid(), nome: 'Educação', cor: '#884dff', icone: '📚', limiteCentavos: 180000, categorias: ['Educação'], ordem: 2, criadoEm: Date.now() },
      { id: nanoid(), nome: 'Lazer', cor: '#eb8909', icone: '🎬', limiteCentavos: 190000, categorias: ['Lazer'], ordem: 3, criadoEm: Date.now() },
      { id: nanoid(), nome: 'Investimentos', cor: '#4073ff', icone: '📈', limiteCentavos: 400000, categorias: ['Investimentos'], ordem: 4, criadoEm: Date.now() },
      { id: nanoid(), nome: 'Outros', cor: '#808080', icone: '•••', limiteCentavos: 170000, categorias: ['Outros'], ordem: 5, criadoEm: Date.now() },
    ])

    // Snapshots dos meses anteriores (evolução crescente).
    const valores = [1350000, 1480000, 1520000, 1610000, 1700000]
    for (let i = 5; i >= 1; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const mm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      await db.patrimonioSnapshots.put({ mes: mm, valorCentavos: valores[5 - i] })
    }
  }

  if (!jaTemMov) {
    const d = (dia: number) => isoDia(new Date(hoje.getFullYear(), hoje.getMonth(), dia))
    const mkMov = (dataISO: string, tipo: TipoMovimento, valor: number, desc: string, cat: string, ts: number): Movimento => ({
      id: nanoid(), tipo, valorCentavos: valor, descricao: desc, categoria: cat, data: dataISO, criadoEm: ts,
    })
    const hj = isoDia(hoje)
    const movs: Movimento[] = [
      // Hoje
      mkMov(hj, 'saida', 800, 'Café da manhã', 'Alimentação', tsHoje(7, 45)),
      mkMov(hj, 'saida', 1400, 'Uber', 'Transporte', tsHoje(8, 15)),
      mkMov(hj, 'saida', 2600, 'Almoço', 'Alimentação', tsHoje(12, 30)),
      // Mês corrente (para a distribuição)
      mkMov(d(2), 'entrada', 600000, 'Salário', 'Outros', tsHoje(9, 0) - 5 * 86400000),
      mkMov(d(3), 'saida', 32000, 'Supermercado', 'Alimentação', tsHoje(18, 0)),
      mkMov(d(4), 'saida', 9000, 'Farmácia', 'Saúde', tsHoje(11, 0)),
      mkMov(d(6), 'saida', 21000, 'Cinema + jantar', 'Lazer', tsHoje(20, 0)),
      mkMov(d(7), 'saida', 45000, 'Curso online', 'Educação', tsHoje(15, 0)),
      mkMov(d(8), 'saida', 12000, 'Combustível', 'Transporte', tsHoje(17, 0)),
      mkMov(d(9), 'saida', 87000, 'Aporte investimento', 'Investimentos', tsHoje(10, 0)),
    ]
    // Mês anterior — mais transporte (para o insight "economizou em Transporte").
    const ma = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 12)
    const maISO = isoDia(ma)
    movs.push(mkMov(maISO, 'saida', 42000, 'Transporte (mês passado)', 'Transporte', ma.getTime()))
    await db.movimentos.bulkAdd(movs)
  }
}
