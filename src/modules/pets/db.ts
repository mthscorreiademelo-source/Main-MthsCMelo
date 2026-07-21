import { addDays, differenceInCalendarDays, differenceInMonths, differenceInYears, format, parseISO } from 'date-fns'
import { nanoid } from 'nanoid'
import { db } from '../../core/db/db'
import { criarMovimento } from '../financas/db'
import { hojeISO } from '../../core/dates'
import type {
  CategoriaDoc,
  CategoriaItem,
  Especie,
  ModuloWorkspace,
  Pet,
  PetAlimento,
  PetCondicao,
  PetConsulta,
  PetCuidado,
  PetItem,
  PetMedicamento,
  PetPeso,
  PetVacina,
  TipoHistorico,
} from './types'

/* ------------------------------- catálogos -------------------------------- */

export const ESPECIES: { valor: Especie; nome: string; emoji: string }[] = [
  { valor: 'cachorro', nome: 'Cachorro', emoji: '🐶' },
  { valor: 'gato', nome: 'Gato', emoji: '🐱' },
  { valor: 'ave', nome: 'Ave', emoji: '🐦' },
  { valor: 'coelho', nome: 'Coelho', emoji: '🐰' },
  { valor: 'reptil', nome: 'Réptil', emoji: '🐢' },
  { valor: 'peixe', nome: 'Aquário', emoji: '🐠' },
  { valor: 'outro', nome: 'Outro', emoji: '⭐' },
]

export function emojiEspecie(e: Especie): string {
  return ESPECIES.find((x) => x.valor === e)?.emoji ?? '🐾'
}
export function nomeEspecie(e: Especie): string {
  return ESPECIES.find((x) => x.valor === e)?.nome ?? 'Pet'
}

/** Cards do workspace, na ordem padrão. Nenhum é obrigatório. */
export const CARDS_WORKSPACE: { id: string; nome: string; emoji: string }[] = [
  { id: 'cuidados', nome: 'Cuidados de hoje', emoji: '✅' },
  { id: 'compromissos', nome: 'Próximos compromissos', emoji: '📅' },
  { id: 'vacinacao', nome: 'Carteira de vacinação', emoji: '💉' },
  { id: 'historico', nome: 'Histórico veterinário', emoji: '🩺' },
  { id: 'alimentacao', nome: 'Alimentação e estoque', emoji: '🍖' },
  { id: 'saude', nome: 'Saúde', emoji: '📈' },
  { id: 'documentos', nome: 'Documentos', emoji: '📄' },
  { id: 'gastos', nome: 'Gastos', emoji: '💰' },
  { id: 'fotos', nome: 'Fotos', emoji: '📸' },
  { id: 'insights', nome: 'Insights', emoji: '✨' },
]

/** Cuidados diários sugeridos por espécie (template inicial). */
const CUIDADOS_TEMPLATE: Record<Especie, { nome: string; icone: string; horario?: string }[]> = {
  cachorro: [
    { nome: 'Alimentação', icone: '🍖', horario: '08:00' },
    { nome: 'Água fresca', icone: '💧' },
    { nome: 'Passeio', icone: '🦮', horario: '18:00' },
    { nome: 'Escovar dentes', icone: '🪥' },
  ],
  gato: [
    { nome: 'Alimentação', icone: '🍗', horario: '08:00' },
    { nome: 'Água fresca', icone: '💧' },
    { nome: 'Caixa de areia', icone: '🧹' },
    { nome: 'Escovação', icone: '🧴' },
  ],
  ave: [
    { nome: 'Alimentação', icone: '🌾' },
    { nome: 'Água fresca', icone: '💧' },
    { nome: 'Limpar gaiola', icone: '🧽' },
  ],
  coelho: [
    { nome: 'Alimentação', icone: '🥬' },
    { nome: 'Água fresca', icone: '💧' },
    { nome: 'Feno', icone: '🌿' },
  ],
  reptil: [
    { nome: 'Alimentação', icone: '🦗' },
    { nome: 'Água / borrifar', icone: '💧' },
    { nome: 'Conferir temperatura', icone: '🌡️' },
  ],
  peixe: [
    { nome: 'Alimentação', icone: '🐟' },
    { nome: 'Conferir filtro', icone: '🫧' },
    { nome: 'Conferir temperatura', icone: '🌡️' },
  ],
  outro: [
    { nome: 'Alimentação', icone: '🍽️' },
    { nome: 'Água fresca', icone: '💧' },
  ],
}

export const CATEGORIAS_ITEM: { valor: CategoriaItem; nome: string; icone: string }[] = [
  { valor: 'racao', nome: 'Ração', icone: '🥣' },
  { valor: 'petisco', nome: 'Petiscos', icone: '🦴' },
  { valor: 'medicamento', nome: 'Medicamento', icone: '💊' },
  { valor: 'antipulgas', nome: 'Antipulgas', icone: '🐜' },
  { valor: 'shampoo', nome: 'Shampoo', icone: '🧴' },
  { valor: 'areia', nome: 'Areia', icone: '🪣' },
  { valor: 'outro', nome: 'Outro', icone: '📦' },
]

export const TIPOS_HISTORICO: { valor: TipoHistorico; nome: string; icone: string }[] = [
  { valor: 'consulta', nome: 'Consulta', icone: '🩺' },
  { valor: 'exame', nome: 'Exame', icone: '🔬' },
  { valor: 'cirurgia', nome: 'Cirurgia', icone: '🏥' },
  { valor: 'diagnostico', nome: 'Diagnóstico', icone: '📋' },
  { valor: 'receita', nome: 'Receita', icone: '📝' },
  { valor: 'observacao', nome: 'Observação', icone: '💬' },
]

export const CATEGORIAS_DOC: { valor: CategoriaDoc; nome: string }[] = [
  { valor: 'vacinacao', nome: 'Carteira de vacinação' },
  { valor: 'receita', nome: 'Receita' },
  { valor: 'exame', nome: 'Exame' },
  { valor: 'plano', nome: 'Plano de saúde' },
  { valor: 'pedigree', nome: 'Pedigree' },
  { valor: 'nota', nome: 'Nota fiscal' },
  { valor: 'outro', nome: 'Outro' },
]

/* ------------------------------ workspace --------------------------------- */

export function modulosPadrao(): ModuloWorkspace[] {
  return CARDS_WORKSPACE.map((c, i) => ({ id: c.id, visivel: true, recolhido: false, ordem: i }))
}

/**
 * Layout efetivo do workspace: mescla o que está salvo no pet com o catálogo
 * (assim cards novos aparecem para pets antigos), ordenado.
 */
export function modulosDoPet(pet: Pet): ModuloWorkspace[] {
  const salvos = pet.modulos ?? []
  const mapa = new Map(salvos.map((m) => [m.id, m]))
  const merge = CARDS_WORKSPACE.map((c, i) => mapa.get(c.id) ?? { id: c.id, visivel: true, recolhido: false, ordem: i })
  return merge.sort((a, b) => a.ordem - b.ordem)
}

export async function salvarModulos(petId: string, modulos: ModuloWorkspace[]): Promise<void> {
  await db.pets.update(petId, { modulos })
}

/* --------------------------------- pets ----------------------------------- */

export async function criarPet(dados: Partial<Pet> & { nome: string; especie: Especie }): Promise<string> {
  const id = dados.id ?? nanoid()
  const max = await db.pets.orderBy('ordem').last()
  const pet: Pet = {
    id,
    nome: dados.nome.trim() || 'Novo pet',
    especie: dados.especie,
    raca: dados.raca,
    sexo: dados.sexo ?? 'indefinido',
    nascimento: dados.nascimento,
    adotadoEm: dados.adotadoEm,
    corPelagem: dados.corPelagem,
    microchip: dados.microchip,
    castrado: dados.castrado,
    pesoIdealMin: dados.pesoIdealMin,
    pesoIdealMax: dados.pesoIdealMax,
    fotoId: dados.fotoId,
    capaId: dados.capaId,
    emoji: dados.emoji ?? emojiEspecie(dados.especie),
    obs: dados.obs,
    modulos: dados.modulos ?? modulosPadrao(),
    status: dados.status ?? 'ativo',
    ordem: dados.ordem ?? (max ? max.ordem + 1 : 0),
    criadoEm: Date.now(),
  }
  await db.pets.add(pet)
  return id
}

/** Cria um pet a partir de um template de espécie, semeando os cuidados diários. */
export async function criarPetComTemplate(
  dados: Partial<Pet> & { nome: string; especie: Especie },
  semearCuidados = true,
): Promise<string> {
  const id = await criarPet(dados)
  if (semearCuidados) {
    const modelo = CUIDADOS_TEMPLATE[dados.especie] ?? CUIDADOS_TEMPLATE.outro
    await db.petCuidados.bulkAdd(
      modelo.map((c, i) => ({
        id: nanoid(),
        petId: id,
        nome: c.nome,
        icone: c.icone,
        horario: c.horario,
        ordem: i,
        ativo: true,
        criadoEm: Date.now(),
      })),
    )
  }
  return id
}

export async function atualizarPet(id: string, mudancas: Partial<Pet>): Promise<void> {
  await db.pets.update(id, mudancas)
}

/** Exclui o pet e TUDO relacionado (registros, blobs, eventos e gastos vinculados). */
export async function excluirPet(id: string): Promise<void> {
  const fotos = await db.petFotos.where('petId').equals(id).toArray()
  const docs = await db.petDocumentos.where('petId').equals(id).toArray()
  const eventos = await db.eventos.filter((e) => e.petId === id).toArray()
  const movimentos = await db.movimentos.filter((m) => m.petId === id).toArray()
  // Estoque do pet unificado na Despensa (item com petId).
  const despensaPet = await db.despensa.filter((d) => d.petId === id).toArray()
  const histDespensa = despensaPet.length
    ? await db.despensaHistorico.where('despensaId').anyOf(despensaPet.map((d) => d.id)).primaryKeys()
    : []
  await db.transaction(
    'rw',
    [
      db.pets,
      db.petPesos,
      db.petVacinas,
      db.petConsultas,
      db.petCondicoes,
      db.petMedicamentos,
      db.petAlimentos,
      db.petItens,
      db.petCuidados,
      db.petCuidadoRegistros,
      db.petFotos,
      db.petDocumentos,
      db.petArquivos,
      db.eventos,
      db.movimentos,
      db.despensa,
      db.despensaHistorico,
    ],
    async () => {
      for (const tabela of [
        db.petPesos,
        db.petVacinas,
        db.petConsultas,
        db.petCondicoes,
        db.petMedicamentos,
        db.petAlimentos,
        db.petItens,
        db.petCuidados,
        db.petCuidadoRegistros,
        db.petFotos,
        db.petDocumentos,
      ]) {
        const ids = await tabela.where('petId').equals(id).primaryKeys()
        await tabela.bulkDelete(ids as string[])
      }
      await db.petArquivos.bulkDelete([...fotos, ...docs].map((x) => x.id))
      await db.eventos.bulkDelete(eventos.map((e) => e.id))
      await db.movimentos.bulkDelete(movimentos.map((m) => m.id))
      await db.despensaHistorico.bulkDelete(histDespensa as string[])
      await db.despensa.bulkDelete(despensaPet.map((d) => d.id))
      await db.pets.delete(id)
    },
  )
}

/* ------------------------------- sub-CRUD --------------------------------- */

const carimbo = () => ({ criadoEm: Date.now() })

export const criarPeso = (d: Omit<PetPeso, 'id' | 'criadoEm'>) =>
  db.petPesos.add({ id: nanoid(), ...d, ...carimbo() }).then(String)
export const removerPeso = (id: string) => db.petPesos.delete(id)

export const criarVacina = (d: Omit<PetVacina, 'id' | 'criadoEm'>) =>
  db.petVacinas.add({ id: nanoid(), ...d, ...carimbo() }).then(String)
export const atualizarVacina = (id: string, m: Partial<PetVacina>) => db.petVacinas.update(id, m)
export const removerVacina = (id: string) => db.petVacinas.delete(id)

export const criarConsulta = (d: Omit<PetConsulta, 'id' | 'criadoEm'>) =>
  db.petConsultas.add({ id: nanoid(), ...d, ...carimbo() }).then(String)
export const atualizarConsulta = (id: string, m: Partial<PetConsulta>) => db.petConsultas.update(id, m)
export const removerConsulta = (id: string) => db.petConsultas.delete(id)

export const criarCondicao = (d: Omit<PetCondicao, 'id' | 'criadoEm'>) =>
  db.petCondicoes.add({ id: nanoid(), ...d, ...carimbo() }).then(String)
export const removerCondicao = (id: string) => db.petCondicoes.delete(id)

export const criarMedicamentoPet = (d: Omit<PetMedicamento, 'id' | 'criadoEm'>) =>
  db.petMedicamentos.add({ id: nanoid(), ...d, ...carimbo() }).then(String)
export const removerMedicamentoPet = (id: string) => db.petMedicamentos.delete(id)

export const criarAlimento = (d: Omit<PetAlimento, 'id' | 'criadoEm'>) =>
  db.petAlimentos.add({ id: nanoid(), ...d, ...carimbo() }).then(String)
export const atualizarAlimento = (id: string, m: Partial<PetAlimento>) => db.petAlimentos.update(id, m)
export const removerAlimento = (id: string) => db.petAlimentos.delete(id)

export const criarItem = (d: Omit<PetItem, 'id' | 'criadoEm'>) =>
  db.petItens.add({ id: nanoid(), ...d, ...carimbo() }).then(String)
export const atualizarItem = (id: string, m: Partial<PetItem>) => db.petItens.update(id, m)
export const removerItem = (id: string) => db.petItens.delete(id)

export async function criarCuidado(d: Omit<PetCuidado, 'id' | 'criadoEm' | 'ordem' | 'ativo'> & { ordem?: number }) {
  const max = await db.petCuidados.where('petId').equals(d.petId).count()
  return db.petCuidados.add({ id: nanoid(), ativo: true, ordem: d.ordem ?? max, ...d, ...carimbo() }).then(String)
}
export const atualizarCuidado = (id: string, m: Partial<PetCuidado>) => db.petCuidados.update(id, m)
export const removerCuidado = (id: string) => db.petCuidados.delete(id)

/** Marca/desmarca um cuidado num dia (id determinístico cuidado:data). */
export async function alternarCuidado(petId: string, cuidadoId: string, data: string): Promise<void> {
  const id = `${cuidadoId}:${data}`
  const atual = await db.petCuidadoRegistros.get(id)
  if (atual) {
    await db.petCuidadoRegistros.update(id, { feito: !atual.feito })
  } else {
    await db.petCuidadoRegistros.add({ id, petId, cuidadoId, data, feito: true, criadoEm: Date.now() })
  }
}

/* ------------------------------- arquivos --------------------------------- */

export async function guardarPetArquivo(blob: Blob, nome: string, tipo: string): Promise<string> {
  const id = nanoid()
  await db.petArquivos.add({ id, blob, nome, tipo, tamanho: blob.size, criadoEm: Date.now() })
  return id
}
export const obterPetArquivo = (id: string) => db.petArquivos.get(id).then((a) => a?.blob)

export async function adicionarFoto(petId: string, blob: Blob, legenda?: string): Promise<string> {
  const id = await guardarPetArquivo(blob, legenda ?? 'foto', blob.type || 'image/jpeg')
  await db.petFotos.add({ id, petId, legenda, data: hojeISO(), criadoEm: Date.now() })
  return id
}
export async function removerFoto(id: string): Promise<void> {
  await db.petFotos.delete(id)
  await db.petArquivos.delete(id)
}

export async function adicionarDocumento(
  petId: string,
  blob: Blob,
  nome: string,
  categoria: CategoriaDoc,
): Promise<string> {
  const id = await guardarPetArquivo(blob, nome, blob.type || 'application/octet-stream')
  await db.petDocumentos.add({ id, petId, nome, tipo: blob.type, categoria, tamanho: blob.size, criadoEm: Date.now() })
  return id
}
export async function removerDocumento(id: string): Promise<void> {
  await db.petDocumentos.delete(id)
  await db.petArquivos.delete(id)
}

/* ------------------------------- derivados -------------------------------- */

/** Idade legível a partir do nascimento (ex.: "4 anos e 2 meses"). */
export function idadeLegivel(nascimento?: string): string | null {
  if (!nascimento) return null
  const d = parseISO(nascimento)
  const hoje = new Date()
  const anos = differenceInYears(hoje, d)
  const meses = differenceInMonths(hoje, d) - anos * 12
  if (anos <= 0 && meses <= 0) {
    const dias = Math.max(0, differenceInCalendarDays(hoje, d))
    return dias <= 1 ? 'recém-chegado' : `${dias} dias`
  }
  const pa = anos > 0 ? `${anos} ${anos === 1 ? 'ano' : 'anos'}` : ''
  const pm = meses > 0 ? `${meses} ${meses === 1 ? 'mês' : 'meses'}` : ''
  return [pa, pm].filter(Boolean).join(' e ')
}

export function pesoAtual(pesos: PetPeso[]): PetPeso | null {
  if (pesos.length === 0) return null
  return [...pesos].sort((a, b) => b.data.localeCompare(a.data))[0]
}

/** Próxima vacina agendada (menor proximaDose >= hoje). */
export function proximaVacina(vacinas: PetVacina[]): { vacina: PetVacina; dias: number } | null {
  const hoje = hojeISO()
  const futuras = vacinas
    .filter((v) => v.proximaDose && v.proximaDose >= hoje)
    .sort((a, b) => (a.proximaDose ?? '').localeCompare(b.proximaDose ?? ''))
  if (futuras.length === 0) return null
  const v = futuras[0]
  return { vacina: v, dias: differenceInCalendarDays(parseISO(v.proximaDose!), parseISO(hoje)) }
}

export function ultimaConsulta(consultas: PetConsulta[]): PetConsulta | null {
  if (consultas.length === 0) return null
  return [...consultas].sort((a, b) => b.data.localeCompare(a.data))[0]
}

/**
 * Estimativa de quantos dias uma comida (pacote aberto) ainda dura.
 * Precisa de pacoteGramas + gramasPorDia + abertoEm. Puramente aritmético.
 */
export function diasRestantesAlimento(a: PetAlimento): { dias: number; fracao: number } | null {
  if (!a.pacoteGramas || !a.gramasPorDia || a.gramasPorDia <= 0) return null
  const desde = a.abertoEm ? Math.max(0, differenceInCalendarDays(new Date(), parseISO(a.abertoEm))) : 0
  const consumido = desde * a.gramasPorDia
  const restante = Math.max(0, a.pacoteGramas - consumido)
  const dias = Math.floor(restante / a.gramasPorDia)
  return { dias, fracao: Math.max(0, Math.min(1, restante / a.pacoteGramas)) }
}

/** Estimativa genérica de esgotamento de um item de estoque. */
export function diasRestantesItem(i: PetItem): number | null {
  if (!i.consumoDia || i.consumoDia <= 0) return null
  return Math.floor(i.quantidade / i.consumoDia)
}

export interface InsightPet {
  icone: string
  texto: string
  tom: 'neutro' | 'atencao' | 'bom'
}

/**
 * Insights heurísticos — leituras honestas do que foi registrado.
 * NUNCA diagnostica; apenas interpreta datas, pesos e estoques.
 */
export function gerarInsights(
  pet: Pet,
  dados: { pesos: PetPeso[]; vacinas: PetVacina[]; consultas: PetConsulta[]; alimentos: PetAlimento[] },
): InsightPet[] {
  const out: InsightPet[] = []
  const { pesos, vacinas, consultas, alimentos } = dados

  // Ração / comida principal
  const principal = alimentos.find((a) => a.principal) ?? alimentos.find((a) => a.tipo === 'racao')
  if (principal) {
    const est = diasRestantesAlimento(principal)
    if (est) {
      if (est.dias <= 0) out.push({ icone: '🥣', texto: `A ${principal.nome} pode ter acabado — hora de repor.`, tom: 'atencao' })
      else if (est.dias <= 5) out.push({ icone: '🥣', texto: `A ${principal.nome} dura aproximadamente mais ${est.dias} dias. Considere repor.`, tom: 'atencao' })
      else out.push({ icone: '🥣', texto: `A ${principal.nome} dura aproximadamente mais ${est.dias} dias.`, tom: 'neutro' })
    }
  }

  // Próxima vacina
  const pv = proximaVacina(vacinas)
  if (pv) {
    const q = pv.dias
    out.push({
      icone: '💉',
      texto: q <= 0 ? `A vacina ${pv.vacina.nome} está prevista para hoje.` : `Próxima vacina (${pv.vacina.nome}) em ${q} ${q === 1 ? 'dia' : 'dias'}. Agende com antecedência.`,
      tom: q <= 7 ? 'atencao' : 'neutro',
    })
  }

  // Última consulta
  const uc = ultimaConsulta(consultas)
  if (uc) {
    const meses = differenceInMonths(new Date(), parseISO(uc.data))
    if (meses >= 6) out.push({ icone: '🩺', texto: `Faz ${meses} meses desde a última consulta. Pode ser hora de uma revisão.`, tom: 'atencao' })
    else if (meses >= 1) out.push({ icone: '🩺', texto: `Última consulta há ${meses} ${meses === 1 ? 'mês' : 'meses'}.`, tom: 'neutro' })
  }

  // Peso: estabilidade / tendência sobre os últimos registros
  if (pesos.length >= 2) {
    const ord = [...pesos].sort((a, b) => a.data.localeCompare(b.data))
    const primeiro = ord[0]
    const ultimo = ord[ord.length - 1]
    const dias = Math.max(1, differenceInCalendarDays(parseISO(ultimo.data), parseISO(primeiro.data)))
    const variacao = ultimo.kg - primeiro.kg
    const pct = primeiro.kg > 0 ? (variacao / primeiro.kg) * 100 : 0
    const meses = Math.max(1, Math.round(dias / 30))
    if (Math.abs(pct) < 3) {
      out.push({ icone: '⚖️', texto: `O peso permanece estável (${ultimo.kg} kg) ${meses >= 1 ? `há cerca de ${meses} ${meses === 1 ? 'mês' : 'meses'}` : 'nas últimas medições'}.`, tom: 'bom' })
    } else if (variacao > 0) {
      out.push({ icone: '⚖️', texto: `O peso subiu ${variacao.toFixed(1)} kg (${pct.toFixed(0)}%) desde ${meses >= 1 ? `${meses} ${meses === 1 ? 'mês' : 'meses'} atrás` : 'a primeira medição'}.`, tom: 'atencao' })
    } else {
      out.push({ icone: '⚖️', texto: `O peso caiu ${Math.abs(variacao).toFixed(1)} kg (${Math.abs(pct).toFixed(0)}%) no período registrado.`, tom: 'atencao' })
    }
    // Faixa ideal
    if (pet.pesoIdealMin && pet.pesoIdealMax && ultimo.kg >= pet.pesoIdealMin && ultimo.kg <= pet.pesoIdealMax) {
      out.push({ icone: '🎯', texto: `O peso está dentro da faixa ideal (${pet.pesoIdealMin}–${pet.pesoIdealMax} kg). Continue a rotina.`, tom: 'bom' })
    }
  }

  if (out.length === 0) {
    out.push({ icone: '✨', texto: 'Registre peso, vacinas e alimentação para receber leituras automáticas por aqui.', tom: 'neutro' })
  }
  return out
}

/* --------------------------------- seed ----------------------------------- */

const CHAVE_SEED = 'lume-pets-semeado'

/** Cria um pet de exemplo (Oli) na primeira visita, para o módulo não nascer vazio. */
export async function semearPetsSePreciso(): Promise<void> {
  if (typeof localStorage !== 'undefined' && localStorage.getItem(CHAVE_SEED)) return
  const total = await db.pets.count()
  if (total > 0) {
    localStorage?.setItem(CHAVE_SEED, '1')
    return
  }
  const hoje = new Date()
  const iso = (d: Date) => format(d, 'yyyy-MM-dd')
  const id = await criarPetComTemplate({
    nome: 'Oli',
    especie: 'cachorro',
    raca: 'Golden Retriever',
    sexo: 'macho',
    nascimento: iso(addDays(hoje, -(4 * 365 + 60))),
    castrado: true,
    pesoIdealMin: 24,
    pesoIdealMax: 26,
  })
  // Histórico de peso (últimos ~6 meses, estável perto de 25,4 kg)
  const pesos = [
    [-165, 23.1],
    [-135, 23.8],
    [-105, 24.3],
    [-75, 24.6],
    [-45, 25.1],
    [-15, 25.4],
  ] as const
  await db.petPesos.bulkAdd(
    pesos.map(([off, kg]) => ({ id: nanoid(), petId: id, data: iso(addDays(hoje, off)), kg, criadoEm: Date.now() })),
  )
  // Vacinas — próxima V8 em 18 dias
  await db.petVacinas.bulkAdd([
    { id: nanoid(), petId: id, nome: 'V8 (óctupla)', data: iso(addDays(hoje, -347)), veterinario: 'Dr. André', proximaDose: iso(addDays(hoje, 18)), criadoEm: Date.now() },
    { id: nanoid(), petId: id, nome: 'Antirrábica', data: iso(addDays(hoje, -347)), veterinario: 'Dr. André', criadoEm: Date.now() },
    { id: nanoid(), petId: id, nome: 'Gripe canina', data: iso(addDays(hoje, -347)), veterinario: 'Dr. André', criadoEm: Date.now() },
  ])
  // Histórico veterinário
  await db.petConsultas.bulkAdd([
    { id: nanoid(), petId: id, tipo: 'consulta', data: iso(addDays(hoje, -40)), titulo: 'Consulta de rotina', veterinario: 'Dr. André', local: 'Vet Care', descricao: 'Tudo normal.', criadoEm: Date.now() },
    { id: nanoid(), petId: id, tipo: 'exame', data: iso(addDays(hoje, -95)), titulo: 'Exame de sangue', veterinario: 'Dr. André', descricao: 'Resultados dentro do esperado.', criadoEm: Date.now() },
  ])
  // Alimentação principal (ração aberta hoje, ~9 dias)
  await db.petAlimentos.add({
    id: nanoid(),
    petId: id,
    tipo: 'racao',
    nome: 'Ração Premier Seleção',
    sabor: 'Frango e Arroz',
    gramasPorDia: 1650,
    refeicoesPorDia: 2,
    horarios: ['08:00', '18:00'],
    pacoteGramas: 15000,
    abertoEm: hojeISO(),
    principal: true,
    criadoEm: Date.now(),
  })
  // Estoque de itens — fonte única: a Despensa (módulo Compras), com petId.
  await db.despensa.bulkAdd([
    { id: nanoid(), petId: id, categoria: 'pet', local: 'Área do pet', nome: 'Biscoitos', quantidadeFechados: 20, unidade: 'un', consumoDia: 2, monitorarIA: true, criadoEm: Date.now() },
    { id: nanoid(), petId: id, categoria: 'pet', local: 'Área do pet', nome: 'Bravecto', quantidadeFechados: 1, unidade: 'un', monitorarIA: true, criadoEm: Date.now() },
  ])
  // Gastos vinculados do mês (aparecem também em Finanças)
  const mes = format(hoje, 'yyyy-MM')
  await Promise.all([
    criarMovimento({ tipo: 'saida', valorCentavos: 19890, descricao: 'Ração Premier 15kg', data: `${mes}-03`, categoria: 'Ração', petId: id }),
    criarMovimento({ tipo: 'saida', valorCentavos: 15000, descricao: 'Consulta de rotina', data: `${mes}-05`, categoria: 'Veterinário', petId: id }),
    criarMovimento({ tipo: 'saida', valorCentavos: 4590, descricao: 'Biscoitos e brinquedo', data: `${mes}-08`, categoria: 'Petiscos', petId: id }),
  ])
  localStorage?.setItem(CHAVE_SEED, '1')
}
