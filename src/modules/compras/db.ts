import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { nanoid } from 'nanoid'
import { db } from '../../core/db/db'
import { SEMEAR_EXEMPLOS } from '../../core/db/exemplos'
import { criarMovimento } from '../financas/db'
import { hojeISO } from '../../core/dates'
import type {
  Aquisicao,
  ComprasConfig,
  ItemCompra,
  ItemDespensa,
  ListaCompra,
  MovDespensa,
  NivelAprox,
  OrigemItem,
  StatusAquisicao,
  TipoMovDespensa,
} from './types'

/* ------------------------------- catálogos -------------------------------- */

/** Categorias de produto + "corredor" para o Modo mercado. */
export const CATEGORIAS: { valor: string; nome: string; icone: string; corredor: string }[] = [
  { valor: 'hortifruti', nome: 'Hortifruti', icone: '🥬', corredor: 'Hortifruti' },
  { valor: 'graos', nome: 'Grãos', icone: '🌾', corredor: 'Grãos e massas' },
  { valor: 'massas', nome: 'Massas', icone: '🍝', corredor: 'Grãos e massas' },
  { valor: 'laticinios', nome: 'Laticínios', icone: '🥛', corredor: 'Frios e laticínios' },
  { valor: 'bebidas', nome: 'Bebidas', icone: '🧃', corredor: 'Bebidas' },
  { valor: 'congelados', nome: 'Congelados', icone: '🧊', corredor: 'Congelados' },
  { valor: 'limpeza', nome: 'Limpeza', icone: '🧽', corredor: 'Limpeza' },
  { valor: 'higiene', nome: 'Higiene', icone: '🧴', corredor: 'Higiene' },
  { valor: 'pet', nome: 'Pet', icone: '🐾', corredor: 'Pet' },
  { valor: 'farmacia', nome: 'Farmácia', icone: '💊', corredor: 'Farmácia' },
  { valor: 'escritorio', nome: 'Escritório', icone: '🖇️', corredor: 'Escritório' },
  { valor: 'casa', nome: 'Casa', icone: '🏠', corredor: 'Casa' },
  { valor: 'outros', nome: 'Outros', icone: '📦', corredor: 'Outros' },
]
export function catInfo(v?: string) {
  return CATEGORIAS.find((c) => c.valor === v) ?? CATEGORIAS[CATEGORIAS.length - 1]
}

export const LOCAIS_PADRAO = [
  'Despensa', 'Geladeira', 'Freezer', 'Banheiro', 'Lavanderia', 'Escritório', 'Quarto', 'Armário de medicamentos',
]

export const SECOES: { id: string; nome: string; emoji: string }[] = [
  { id: 'sugestoes', nome: 'Sugestões do Lume', emoji: '✨' },
  { id: 'listas', nome: 'Lista de compras', emoji: '🛒' },
  { id: 'despensa', nome: 'Despensa inteligente', emoji: '🗄️' },
  { id: 'aquisicoes', nome: 'Aquisições planejadas', emoji: '🎯' },
]

const NIVEL_FRACAO: Record<NivelAprox, number> = {
  cheio: 1,
  tres_quartos: 0.75,
  metade: 0.5,
  pouco: 0.25,
  quase_vazio: 0.1,
}
export const NIVEIS: { valor: NivelAprox; nome: string }[] = [
  { valor: 'cheio', nome: 'Cheio' },
  { valor: 'tres_quartos', nome: 'Três quartos' },
  { valor: 'metade', nome: 'Metade' },
  { valor: 'pouco', nome: 'Pouco' },
  { valor: 'quase_vazio', nome: 'Quase vazio' },
]

export const STATUS_AQUISICAO: { valor: StatusAquisicao; nome: string; cor: string }[] = [
  { valor: 'desejo', nome: 'Desejo', cor: '#884dff' },
  { valor: 'pesquisando', nome: 'Pesquisando', cor: '#4073ff' },
  { valor: 'planejando', nome: 'Planejando', cor: '#6accbc' },
  { valor: 'aguardando_preco', nome: 'Aguardando preço', cor: '#eb8909' },
  { valor: 'pronto', nome: 'Pronto para comprar', cor: '#299438' },
  { valor: 'comprado', nome: 'Comprado', cor: '#808080' },
  { valor: 'cancelado', nome: 'Cancelado', cor: '#d1453b' },
]

const LISTAS_SEMENTE: { nome: string; icone: string }[] = [
  { nome: 'Mercado', icone: '🛒' },
  { nome: 'Farmácia', icone: '💊' },
  { nome: 'Pet Shop', icone: '🐾' },
  { nome: 'Casa', icone: '🏠' },
]

/* -------------------------------- config ---------------------------------- */

export function secoesPadrao() {
  return SECOES.map((s, i) => ({ id: s.id, visivel: true, recolhido: false, ordem: i }))
}
export async function getConfig(): Promise<ComprasConfig> {
  const c = await db.comprasConfig.get('default')
  if (c) return c
  const novo: ComprasConfig = { id: 'default', secoes: secoesPadrao(), locais: [] }
  await db.comprasConfig.put(novo)
  return novo
}
export async function salvarSecoes(secoes: ComprasConfig['secoes']) {
  const c = await getConfig()
  await db.comprasConfig.put({ ...c, secoes })
}
export function secoesEfetivas(config?: ComprasConfig) {
  const salvos = config?.secoes ?? []
  const mapa = new Map(salvos.map((s) => [s.id, s]))
  return SECOES.map((s, i) => mapa.get(s.id) ?? { id: s.id, visivel: true, recolhido: false, ordem: i }).sort(
    (a, b) => a.ordem - b.ordem,
  )
}

/* --------------------------------- listas --------------------------------- */

export async function criarLista(dados: { nome: string; icone?: string; eventoId?: string }): Promise<string> {
  const id = nanoid()
  const max = await db.comprasListas.orderBy('ordem').last()
  await db.comprasListas.add({ id, nome: dados.nome.trim() || 'Lista', icone: dados.icone ?? '🛒', eventoId: dados.eventoId, ordem: max ? max.ordem + 1 : 0, criadoEm: Date.now() })
  return id
}
export const atualizarLista = (id: string, m: Partial<ListaCompra>) => db.comprasListas.update(id, m)
export async function excluirLista(id: string) {
  const itens = await db.comprasItens.where('listaId').equals(id).primaryKeys()
  await db.comprasItens.bulkDelete(itens as string[])
  await db.comprasListas.delete(id)
}

/* --------------------------------- itens ---------------------------------- */

export async function criarItemCompra(dados: Partial<ItemCompra> & { listaId: string; nome: string; origem?: OrigemItem }): Promise<string> {
  const id = dados.id ?? nanoid()
  const max = await db.comprasItens.where('listaId').equals(dados.listaId).count()
  await db.comprasItens.add({
    id,
    listaId: dados.listaId,
    nome: dados.nome.trim(),
    quantidade: dados.quantidade,
    unidade: dados.unidade,
    categoria: dados.categoria,
    marca: dados.marca,
    prioridade: dados.prioridade,
    obs: dados.obs,
    precoEstimadoCentavos: dados.precoEstimadoCentavos,
    loja: dados.loja,
    petId: dados.petId,
    projetoId: dados.projetoId,
    dataDesejada: dados.dataDesejada,
    origem: dados.origem ?? 'manual',
    status: 'pendente',
    despensaId: dados.despensaId,
    ordem: max,
    criadoEm: Date.now(),
  })
  return id
}
export const atualizarItem = (id: string, m: Partial<ItemCompra>) => db.comprasItens.update(id, m)
export const excluirItem = (id: string) => db.comprasItens.delete(id)
export const moverItem = (id: string, listaId: string) => db.comprasItens.update(id, { listaId })
export const adiarItem = (id: string) => db.comprasItens.update(id, { status: 'adiado' })

/** Concluir a compra de um item: atualiza estoque e/ou Finanças e recalibra. */
export async function marcarComprado(
  item: ItemCompra,
  opc: { quantidade?: number; valorCentavos?: number; loja?: string; data?: string; atualizarEstoque: boolean; registrarFinancas: boolean; categoriaFin?: string },
): Promise<void> {
  const data = opc.data ?? hojeISO()
  const qtd = opc.quantidade ?? item.quantidade ?? 1
  if (opc.atualizarEstoque) {
    let despensaId = item.despensaId
    if (!despensaId) {
      // tenta casar por nome+categoria; senão cria um item novo na despensa
      const existente = (await db.despensa.toArray()).find(
        (d) => d.nome.toLowerCase() === item.nome.toLowerCase() && (!item.categoria || d.categoria === item.categoria),
      )
      if (existente) despensaId = existente.id
      else {
        despensaId = await criarDespensa({
          nome: item.nome,
          categoria: item.categoria ?? 'outros',
          unidade: item.unidade ?? 'un',
          marca: item.marca,
          petId: item.petId,
        })
      }
    }
    const alvo = await db.despensa.get(despensaId)
    if (alvo) {
      await db.despensa.update(despensaId, {
        quantidadeFechados: (alvo.quantidadeFechados ?? 0) + qtd,
        ultimaCompraEm: data,
        possuiApenas: false,
      })
      await logMov(despensaId, 'compra', { data, quantidade: qtd, precoCentavos: opc.valorCentavos, loja: opc.loja, marca: item.marca })
    }
  }
  if (opc.registrarFinancas && opc.valorCentavos && opc.valorCentavos > 0) {
    await criarMovimento({
      tipo: 'saida',
      valorCentavos: opc.valorCentavos,
      descricao: item.nome,
      data,
      categoria: opc.categoriaFin ?? 'Alimentação',
      petId: item.petId,
    })
  }
  await db.comprasItens.update(item.id, { status: 'comprado', compradoEm: Date.now() })
}

export async function transformarEmAquisicao(item: ItemCompra): Promise<string> {
  const id = await criarAquisicao({ nome: item.nome, categoria: item.categoria, valorEsperadoCentavos: item.precoEstimadoCentavos, prioridade: item.prioridade, projetoId: item.projetoId })
  await db.comprasItens.delete(item.id)
  return id
}

/* -------------------------------- despensa -------------------------------- */

export async function criarDespensa(dados: Partial<ItemDespensa> & { nome: string; categoria: string; unidade: string }): Promise<string> {
  const id = dados.id ?? nanoid()
  await db.despensa.add({
    id,
    nome: dados.nome.trim(),
    marca: dados.marca,
    categoria: dados.categoria,
    local: dados.local,
    unidade: dados.unidade,
    ean: dados.ean,
    quantidadeFechados: dados.quantidadeFechados,
    emUso: dados.emUso,
    fracaoEmUso: dados.fracaoEmUso,
    tamanhoEmbalagem: dados.tamanhoEmbalagem,
    nivelAprox: dados.nivelAprox,
    possuiApenas: dados.possuiApenas,
    consumoDia: dados.consumoDia,
    fabricacao: dados.fabricacao,
    validade: dados.validade,
    validadeAposAbertura: dados.validadeAposAbertura,
    lote: dados.lote,
    abertoEm: dados.abertoEm,
    monitorarIA: dados.monitorarIA ?? true,
    favorito: dados.favorito,
    petId: dados.petId,
    saudeVinculo: dados.saudeVinculo,
    projetoId: dados.projetoId,
    obs: dados.obs,
    ultimaCompraEm: dados.ultimaCompraEm,
    criadoEm: Date.now(),
  })
  return id
}
export const atualizarDespensa = (id: string, m: Partial<ItemDespensa>) => db.despensa.update(id, m)
export async function excluirDespensa(id: string) {
  const hist = await db.despensaHistorico.where('despensaId').equals(id).primaryKeys()
  await db.despensaHistorico.bulkDelete(hist as string[])
  await db.despensa.delete(id)
}

export async function logMov(despensaId: string, tipo: TipoMovDespensa, dados: Partial<MovDespensa> = {}) {
  await db.despensaHistorico.add({ id: nanoid(), despensaId, tipo, data: dados.data ?? hojeISO(), quantidade: dados.quantidade, precoCentavos: dados.precoCentavos, loja: dados.loja, marca: dados.marca, obs: dados.obs, criadoEm: Date.now() })
}

/** Ações rápidas de estoque. */
export async function ajusteRapido(item: ItemDespensa, acao: 'add' | 'remove' | 'acabou' | 'aberto' | 'descarte') {
  if (acao === 'add') await atualizarDespensa(item.id, { quantidadeFechados: (item.quantidadeFechados ?? 0) + 1, possuiApenas: false })
  else if (acao === 'remove') await atualizarDespensa(item.id, { quantidadeFechados: Math.max(0, (item.quantidadeFechados ?? 0) - 1) })
  else if (acao === 'acabou') {
    await atualizarDespensa(item.id, { quantidadeFechados: 0, emUso: false, fracaoEmUso: 0, nivelAprox: 'quase_vazio', possuiApenas: false })
    await logMov(item.id, 'acabou')
  } else if (acao === 'aberto') {
    await atualizarDespensa(item.id, { emUso: true, fracaoEmUso: 1, abertoEm: hojeISO(), quantidadeFechados: Math.max(0, (item.quantidadeFechados ?? 0) - 1) })
    await logMov(item.id, 'abriu')
  } else if (acao === 'descarte') {
    await atualizarDespensa(item.id, { quantidadeFechados: Math.max(0, (item.quantidadeFechados ?? 0) - 1) })
    await logMov(item.id, 'descarte')
  }
}

/** Feedback rápido "ainda tenho" — recalibra o nível e registra um ajuste. */
export async function feedbackNivel(item: ItemDespensa, nivel: NivelAprox) {
  await atualizarDespensa(item.id, { nivelAprox: nivel, possuiApenas: false })
  await logMov(item.id, 'ajuste', { obs: `feedback: ${nivel}` })
}

/* ------------------------------ aquisições -------------------------------- */

export async function criarAquisicao(dados: Partial<Aquisicao> & { nome: string }): Promise<string> {
  const id = dados.id ?? nanoid()
  const max = await db.aquisicoes.orderBy('ordem').last()
  await db.aquisicoes.add({
    id,
    nome: dados.nome.trim(),
    categoria: dados.categoria,
    descricao: dados.descricao,
    necessidade: dados.necessidade,
    prioridade: dados.prioridade,
    orcamentoCentavos: dados.orcamentoCentavos,
    valorEsperadoCentavos: dados.valorEsperadoCentavos,
    valorAtualCentavos: dados.valorAtualCentavos,
    dataDesejada: dados.dataDesejada,
    projetoId: dados.projetoId,
    links: dados.links,
    lojas: dados.lojas,
    pros: dados.pros,
    contras: dados.contras,
    notas: dados.notas,
    status: dados.status ?? 'desejo',
    ordem: max ? max.ordem + 1 : 0,
    criadoEm: Date.now(),
  })
  return id
}
export const atualizarAquisicao = (id: string, m: Partial<Aquisicao>) => db.aquisicoes.update(id, m)
export async function excluirAquisicao(id: string) {
  const precos = await db.aquisicaoPrecos.where('aquisicaoId').equals(id).primaryKeys()
  await db.aquisicaoPrecos.bulkDelete(precos as string[])
  await db.aquisicoes.delete(id)
}
export async function registrarPreco(aquisicaoId: string, precoCentavos: number, loja?: string) {
  await db.aquisicaoPrecos.add({ id: nanoid(), aquisicaoId, data: hojeISO(), precoCentavos, loja, criadoEm: Date.now() })
  await db.aquisicoes.update(aquisicaoId, { valorAtualCentavos: precoCentavos })
}

/* ------------------------- previsão heurística ---------------------------- */

export type Confianca = 'alta' | 'moderada' | 'poucos'

/** Estimativa da quantidade atual (na unidade do item), ou null se desconhecida. */
export function quantidadeEstim(item: ItemDespensa): number | null {
  if (item.possuiApenas) return null
  const tam = item.tamanhoEmbalagem
  if (item.nivelAprox && (item.quantidadeFechados == null || item.quantidadeFechados === 0) && !item.emUso) {
    return tam ? NIVEL_FRACAO[item.nivelAprox] * tam : NIVEL_FRACAO[item.nivelAprox]
  }
  const fechados = item.quantidadeFechados ?? 0
  const aberto = item.emUso ? (item.fracaoEmUso ?? 1) : 0
  if (tam) return fechados * tam + aberto * tam
  const unid = fechados + aberto
  return unid > 0 ? unid : item.nivelAprox ? NIVEL_FRACAO[item.nivelAprox] : null
}

/** Intervalo médio (dias) entre compras registradas. */
export function intervaloMedio(historico: MovDespensa[]): { dias: number; n: number } | null {
  const compras = historico.filter((h) => h.tipo === 'compra').map((h) => h.data).sort()
  if (compras.length < 2) return null
  let soma = 0
  for (let i = 1; i < compras.length; i++) soma += differenceInCalendarDays(parseISO(compras[i]), parseISO(compras[i - 1]))
  return { dias: Math.round(soma / (compras.length - 1)), n: compras.length }
}

/** Consumo diário estimado (na unidade), do campo explícito ou do histórico. */
export function consumoDiaEstim(item: ItemDespensa, historico: MovDespensa[]): number | null {
  if (item.consumoDia && item.consumoDia > 0) return item.consumoDia
  const im = intervaloMedio(historico)
  if (im && item.tamanhoEmbalagem) return item.tamanhoEmbalagem / im.dias
  return null
}

export function diasRestantes(item: ItemDespensa, historico: MovDespensa[]): number | null {
  const q = quantidadeEstim(item)
  const c = consumoDiaEstim(item, historico)
  if (q == null || c == null || c <= 0) return null
  return Math.floor(q / c)
}

export function proximaReposicao(item: ItemDespensa, historico: MovDespensa[]): string | null {
  const im = intervaloMedio(historico)
  const ult = item.ultimaCompraEm ?? historico.filter((h) => h.tipo === 'compra').map((h) => h.data).sort().pop()
  if (!im || !ult) return null
  return format(addDays(parseISO(ult), im.dias), 'yyyy-MM-dd')
}

export function confiancaDe(item: ItemDespensa, historico: MovDespensa[]): Confianca {
  const nCompras = historico.filter((h) => h.tipo === 'compra').length
  if (item.consumoDia && item.tamanhoEmbalagem) return nCompras >= 2 ? 'alta' : 'moderada'
  if (nCompras >= 3) return 'alta'
  if (nCompras === 2) return 'moderada'
  return 'poucos'
}

export interface Sugestao {
  item: ItemDespensa
  diasRestantes: number | null
  reposicao: string | null
  confianca: Confianca
  texto: string
}

/** Itens que provavelmente estão acabando — com linguagem cuidadosa. */
export function gerarSugestoes(itens: ItemDespensa[], historicos: Record<string, MovDespensa[]>): Sugestao[] {
  const out: Sugestao[] = []
  for (const item of itens) {
    if (item.monitorarIA === false) continue
    const h = historicos[item.id] ?? []
    const dias = diasRestantes(item, h)
    const rep = proximaReposicao(item, h)
    const conf = confiancaDe(item, h)
    const baixoNivel = item.nivelAprox === 'pouco' || item.nivelAprox === 'quase_vazio'
    let texto: string | null = null
    if (dias != null && dias <= 7) {
      texto = conf === 'poucos'
        ? `Com base nos poucos dados, pode estar perto do fim (~${dias} ${dias === 1 ? 'dia' : 'dias'}).`
        : `Aproximadamente ${dias} ${dias === 1 ? 'dia' : 'dias'} restantes.`
    } else if (baixoNivel) {
      texto = 'Estoque provavelmente baixo, segundo o último ajuste.'
    } else if (rep) {
      const d = differenceInCalendarDays(parseISO(rep), parseISO(hojeISO()))
      if (d <= 7) texto = `Pela sua rotina de compras, pode terminar em ~${Math.max(0, d)} dias.`
    }
    if (texto) out.push({ item, diasRestantes: dias, reposicao: rep, confianca: conf, texto })
  }
  // mais urgentes primeiro
  return out.sort((a, b) => (a.diasRestantes ?? 99) - (b.diasRestantes ?? 99))
}

/** Rótulos de validade para filtros/alertas. */
export function statusValidade(item: ItemDespensa): 'vencido' | 'hoje' | 'semana' | 'mes' | 'ok' | 'sem' {
  if (!item.validade) return 'sem'
  const d = differenceInCalendarDays(parseISO(item.validade), parseISO(hojeISO()))
  if (d < 0) return 'vencido'
  if (d === 0) return 'hoje'
  if (d <= 7) return 'semana'
  if (d <= 31) return 'mes'
  return 'ok'
}

/* --------------------------------- seed ----------------------------------- */

const CHAVE_SEED = 'lume-compras-semeado'

export async function semearComprasSePreciso(): Promise<void> {
  if (!SEMEAR_EXEMPLOS) return
  if (typeof localStorage !== 'undefined' && localStorage.getItem(CHAVE_SEED)) return
  const nListas = await db.comprasListas.count()
  if (nListas > 0) {
    localStorage?.setItem(CHAVE_SEED, '1')
    return
  }
  const hoje = new Date()
  const iso = (off: number) => format(addDays(hoje, off), 'yyyy-MM-dd')
  await getConfig()
  // Listas
  const listas: Record<string, string> = {}
  for (const l of LISTAS_SEMENTE) listas[l.nome] = await criarLista({ nome: l.nome, icone: l.icone })
  // Despensa com histórico para previsões
  const pet = await db.pets.orderBy('ordem').first()
  const cafe = await criarDespensa({ nome: 'Café', marca: 'Pilão', categoria: 'graos', unidade: 'g', local: 'Despensa', tamanhoEmbalagem: 500, emUso: true, fracaoEmUso: 0.2, consumoDia: 25, ultimaCompraEm: iso(-24) })
  await logMov(cafe, 'compra', { data: iso(-52), quantidade: 1 })
  await logMov(cafe, 'compra', { data: iso(-24), quantidade: 1, precoCentavos: 1890, loja: 'Mercado' })
  const papel = await criarDespensa({ nome: 'Papel higiênico', categoria: 'higiene', unidade: 'rolo', local: 'Banheiro', nivelAprox: 'pouco', quantidadeFechados: 0, tamanhoEmbalagem: 12 })
  await logMov(papel, 'compra', { data: iso(-40), quantidade: 1 })
  const arroz = await criarDespensa({ nome: 'Arroz', marca: 'Tio João', categoria: 'graos', unidade: 'kg', local: 'Despensa', quantidadeFechados: 1, tamanhoEmbalagem: 5, consumoDia: 0.35, ultimaCompraEm: iso(-14) })
  await logMov(arroz, 'compra', { data: iso(-46), quantidade: 1 })
  await logMov(arroz, 'compra', { data: iso(-14), quantidade: 1, precoCentavos: 2790 })
  const shampoo = await criarDespensa({ nome: 'Shampoo Elseve', marca: "L'Oréal", categoria: 'higiene', unidade: 'ml', local: 'Banheiro', tamanhoEmbalagem: 400, emUso: true, fracaoEmUso: 0.3, quantidadeFechados: 2, consumoDia: 20, ultimaCompraEm: iso(-30) })
  await logMov(shampoo, 'compra', { data: iso(-73), quantidade: 1 })
  await logMov(shampoo, 'compra', { data: iso(-30), quantidade: 3, precoCentavos: 5970 })
  if (pet) {
    const racao = await criarDespensa({ nome: `Ração do ${pet.nome}`, categoria: 'pet', unidade: 'kg', local: 'Área do pet', tamanhoEmbalagem: 15, emUso: true, fracaoEmUso: 0.6, consumoDia: 1.0, petId: pet.id, ultimaCompraEm: iso(-6) })
    await logMov(racao, 'compra', { data: iso(-6), quantidade: 1, precoCentavos: 19890, loja: 'Pet Shop' })
  }
  // Um item já na lista do Mercado
  await criarItemCompra({ listaId: listas['Mercado'], nome: 'Ovos', quantidade: 12, unidade: 'un', categoria: 'hortifruti', origem: 'manual' })
  // Uma aquisição planejada de exemplo
  await criarAquisicao({ nome: 'Notebook novo', categoria: 'escritorio', status: 'pesquisando', prioridade: 'media', valorEsperadoCentavos: 450000, necessidade: 'Trabalho e projetos' })
  localStorage?.setItem(CHAVE_SEED, '1')
}
