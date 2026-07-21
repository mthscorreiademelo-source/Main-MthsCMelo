/**
 * Interpretação HEURÍSTICA de uma captura de texto livre (pt-BR).
 *
 * Tudo aqui é determinístico: expressões regulares e regras de calendário.
 * Não há IA nem chamada de rede. O objetivo é dar um bom PALPITE que o
 * usuário confirma — por isso cada interpretação carrega um rótulo honesto
 * ("por quê") e um nível de confiança. Quando há ambiguidade, devolvemos
 * mais de um candidato em vez de escolher por conta própria.
 */
import { addDays, format } from 'date-fns'
import type { CampoInterpretado, Interpretacao, TipoCaptura } from './types'

/* --------------------------------- Datas --------------------------------- */

const DIAS_SEMANA: Record<string, number> = {
  domingo: 0,
  'segunda': 1, 'segunda-feira': 1,
  'terca': 2, 'terça': 2, 'terca-feira': 2, 'terça-feira': 2,
  'quarta': 3, 'quarta-feira': 3,
  'quinta': 4, 'quinta-feira': 4,
  'sexta': 5, 'sexta-feira': 5,
  'sabado': 6, 'sábado': 6,
}

function iso(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function proximoDiaSemana(base: Date, alvo: number): Date {
  const atual = base.getDay()
  let delta = (alvo - atual + 7) % 7
  if (delta === 0) delta = 7 // "sexta" quando hoje é sexta = próxima sexta
  return addDays(base, delta)
}

/** Extrai uma data ISO do texto, ou undefined. `agora` = referência. */
export function extrairData(texto: string, agora: Date): { data?: string; trecho?: string } {
  const t = texto.toLowerCase()

  if (/\bdepois de amanh[aã]\b/.test(t)) return { data: iso(addDays(agora, 2)), trecho: 'depois de amanhã' }
  if (/\bamanh[aã]\b/.test(t)) return { data: iso(addDays(agora, 1)), trecho: 'amanhã' }
  if (/\bhoje\b/.test(t)) return { data: iso(agora), trecho: 'hoje' }
  if (/\bontem\b/.test(t)) return { data: iso(addDays(agora, -1)), trecho: 'ontem' }
  if (/\b(pr[oó]xima semana|semana que vem)\b/.test(t)) return { data: iso(addDays(agora, 7)), trecho: 'próxima semana' }

  // dia da semana (opcionalmente "na próxima X")
  for (const [nome, dow] of Object.entries(DIAS_SEMANA)) {
    const re = new RegExp(`\\b(?:na\\s+|nesta\\s+|pr[oó]xima\\s+)?${nome}\\b`)
    if (re.test(t)) return { data: iso(proximoDiaSemana(agora, dow)), trecho: nome }
  }

  // DD/MM ou DD/MM/AAAA
  const m = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)
  if (m) {
    const dia = +m[1]
    const mes = +m[2] - 1
    const ano = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : agora.getFullYear()
    if (dia >= 1 && dia <= 31 && mes >= 0 && mes <= 11) {
      return { data: iso(new Date(ano, mes, dia)), trecho: m[0] }
    }
  }

  return {}
}

/* --------------------------------- Horas --------------------------------- */

/** Extrai hora de início (HH:mm) do texto, ou undefined. */
export function extrairHora(texto: string): { hora?: string; trecho?: string } {
  const t = texto.toLowerCase()
  // "às 14h", "as 14h30", "14:30", "14h", "9 da manhã", "8 da noite"
  const m = t.match(/\b(?:[àa]s\s*)?(\d{1,2})(?:[:h](\d{2}))?\s*(?:h|horas)?\b(\s*(da|de)\s*(manh[aã]|tarde|noite))?/)
  if (!m) return {}
  let h = +m[1]
  const min = m[2] ? +m[2] : 0
  const periodo = m[6]
  // só aceita como hora se houver marcador (às / h / : / período) — evita
  // confundir com quantidades ("2 cafés").
  const temMarcador = /[àa]s\s|[:h]|\bhoras?\b/.test(m[0]) || !!periodo
  if (!temMarcador) return {}
  if (h > 23 || min > 59) return {}
  if (periodo === 'tarde' && h < 12) h += 12
  if (periodo === 'noite' && h < 12) h += 12
  if (periodo && (periodo === 'manhã' || periodo === 'manha') && h === 12) h = 0
  return { hora: `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`, trecho: m[0].trim() }
}

/** Extrai duração em minutos, ou undefined. */
export function extrairDuracao(texto: string): number | undefined {
  const t = texto.toLowerCase()
  // "por 1h30", "por 90 minutos", "por 2 horas", "30 min"
  const mh = t.match(/\bpor\s+(\d{1,2})\s*h(?:oras?)?(?:\s*(\d{1,2})\s*m(?:in(?:utos?)?)?)?\b/)
  if (mh) return (+mh[1]) * 60 + (mh[2] ? +mh[2] : 0)
  const combo = t.match(/\b(\d{1,2})h(\d{2})\b/)
  if (combo && /\bpor\b/.test(t)) return (+combo[1]) * 60 + +combo[2]
  const mm = t.match(/\b(?:por\s+)?(\d{1,3})\s*(?:min(?:utos?)?)\b/)
  if (mm) return +mm[1]
  const so = t.match(/\bpor\s+(\d{1,2})\s*(?:h|horas?)\b/)
  if (so) return (+so[1]) * 60
  return undefined
}

/* -------------------------------- Valores -------------------------------- */

/** Extrai valor monetário em centavos, ou undefined. */
export function extrairValor(texto: string): { centavos?: number; trecho?: string } {
  const t = texto.toLowerCase()
  // "R$ 48", "R$ 1.234,56", "48 reais", "gastei 48"
  const comCifrao = t.match(/r\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/)
  const comReais = t.match(/\b(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:reais|conto|pila)\b/)
  const perto = t.match(/\b(?:gastei|paguei|custou|comprei|recebi|ganhei|entrou)\s+(?:de\s+)?(\d+(?:[.,]\d{1,2})?)\b/)
  const alvo = comCifrao || comReais || perto
  if (!alvo) return {}
  const bruto = alvo[1]
  // normaliza 1.234,56 → 1234.56 ; 48,90 → 48.90 ; 48 → 48
  let n: number
  if (bruto.includes(',')) n = parseFloat(bruto.replace(/\./g, '').replace(',', '.'))
  else n = parseFloat(bruto)
  if (!isFinite(n)) return {}
  return { centavos: Math.round(n * 100), trecho: alvo[0] }
}

/* ------------------------------ Categorias ------------------------------- */

const CATEGORIAS: { cat: string; palavras: RegExp }[] = [
  { cat: 'Mercado', palavras: /\b(mercado|supermercado|feira|hortifruti|padaria|a[çc]ougue)\b/ },
  { cat: 'Alimentação', palavras: /\b(ifood|lanche|almo[çc]o|jantar|restaurante|caf[eé]|pizza|delivery)\b/ },
  { cat: 'Transporte', palavras: /\b(uber|99|gasolina|combust[ií]vel|[oô]nibus|metr[oô]|estacionamento|pedagio|ped[aá]gio)\b/ },
  { cat: 'Saúde', palavras: /\b(farm[aá]cia|rem[eé]dio|consulta|exame|m[eé]dico|dentista)\b/ },
  { cat: 'Casa', palavras: /\b(aluguel|luz|[aá]gua|internet|condom[ií]nio|g[aá]s|energia)\b/ },
  { cat: 'Lazer', palavras: /\b(cinema|show|netflix|spotify|jogo|bar|balada)\b/ },
]

function categoriaDe(texto: string): string | undefined {
  const t = texto.toLowerCase()
  for (const c of CATEGORIAS) if (c.palavras.test(t)) return c.cat
  return undefined
}

/* ------------------------------- Pessoas --------------------------------- */

function pessoaDe(texto: string): string | undefined {
  // "com Dr. Lucas", "para Marcos", "com a Ana"
  const m = texto.match(/\b(?:com|para|pra)\s+(?:o\s+|a\s+|dr\.?\s*|dra\.?\s*)?([A-ZÀ-Þ][\wÀ-ÿ]+(?:\s+[A-ZÀ-Þ][\wÀ-ÿ]+)?)/)
  return m ? m[1].trim() : undefined
}

function localDe(texto: string): string | undefined {
  const m = texto.match(/\b(?:no|na|em)\s+([A-ZÀ-Þ][\wÀ-ÿ]+(?:\s+[A-ZÀ-Þ][\wÀ-ÿ]+)?)/)
  return m ? m[1].trim() : undefined
}

/* ------------------------------ Classificação ---------------------------- */

const VERBOS_TAREFA = /\b(ligar|enviar|mandar|revisar|marcar|fazer|terminar|escrever|responder|comprar|pagar|agendar|estudar|ler|organizar|limpar|arrumar|levar|buscar|entregar)\b/
const VERBOS_LEMBRETE = /\b(lembrar|n[aã]o esquecer|lembrete)\b/
const PALAVRAS_EVENTO = /\b(consulta|reuni[aã]o|encontro|compromisso|anivers[aá]rio|entrevista|apresenta[çc][aã]o|call|treino|aula)\b/
const VERBOS_RECEITA = /\b(recebi|ganhei|sal[aá]rio|entrou|rendimento|reembolso)\b/
const IDEIA = /\b(ideia|pensei|e se|talvez|conceito)\b/

function limparTitulo(texto: string): string {
  return texto.trim().replace(/\s+/g, ' ')
}

function tituloCompra(texto: string): string {
  // "comprar café amanhã" → "Café"
  let t = texto.replace(/\bcomprar\b/i, '').trim()
  t = t.replace(/\b(hoje|amanh[aã]|depois de amanh[aã]|ontem|pr[oó]xima semana|semana que vem)\b/gi, '').trim()
  for (const nome of Object.keys(DIAS_SEMANA)) t = t.replace(new RegExp(`\\b${nome}\\b`, 'gi'), '').trim()
  t = t.replace(/\s+/g, ' ').replace(/^[,.\s]+|[,.\s]+$/g, '')
  return t ? t[0].toUpperCase() + t.slice(1) : texto.trim()
}

/**
 * Interpreta um texto livre e devolve candidatos ordenados (melhor primeiro).
 * Sempre inclui "nota" como saída segura de baixa confiança.
 */
export function interpretar(texto: string, agora: Date = new Date()): Interpretacao[] {
  const bruto = limparTitulo(texto)
  if (!bruto) return []
  const t = bruto.toLowerCase()

  const { data, trecho: trechoData } = extrairData(bruto, agora)
  const { hora } = extrairHora(bruto)
  const duracaoMin = extrairDuracao(bruto)
  const { centavos } = extrairValor(bruto)
  const categoria = categoriaDe(bruto)
  const pessoa = pessoaDe(bruto)

  const out: Interpretacao[] = []
  const partes: string[] = []
  if (trechoData) partes.push(trechoData)
  if (hora) partes.push(`às ${hora}`)
  if (duracaoMin) partes.push(`${duracaoMin} min`)

  // 1) Dinheiro → despesa/receita (alta confiança quando há valor)
  if (centavos != null) {
    const ehReceita = VERBOS_RECEITA.test(t)
    const tipo: TipoCaptura = ehReceita ? 'receita' : 'despesa'
    const campos: CampoInterpretado = { titulo: bruto, valorCentavos: centavos, categoria, data: data ?? iso(agora), pessoa }
    out.push({
      tipo,
      campos,
      confianca: 'alta',
      rotulo: `Valor identificado (${(centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})${categoria ? ` · ${categoria}` : ''} → ${ehReceita ? 'receita' : 'despesa'}`,
    })
  }

  // 2) Evento (palavra de compromisso ou data+hora)
  const pareceEvento = PALAVRAS_EVENTO.test(t) || (!!data && !!hora)
  if (pareceEvento && centavos == null) {
    const campos: CampoInterpretado = { titulo: bruto, data, horaInicio: hora, duracaoMin, pessoa, local: localDe(bruto) }
    out.push({
      tipo: 'evento',
      campos,
      confianca: PALAVRAS_EVENTO.test(t) && hora ? 'alta' : 'media',
      rotulo: `Parece um compromisso${partes.length ? ` (${partes.join(', ')})` : ''}`,
    })
  }

  // 3) Compra ("comprar X" sem valor, ou item curto)
  const pareceCompra = /\bcomprar\b/.test(t) && centavos == null
  if (pareceCompra) {
    out.push({
      tipo: 'compra',
      campos: { titulo: tituloCompra(bruto), data },
      confianca: 'media',
      rotulo: 'Item para a lista de compras',
    })
  }

  // 4) Tarefa / lembrete (verbos de ação)
  const pareceTarefa = VERBOS_TAREFA.test(t) && centavos == null && !PALAVRAS_EVENTO.test(t)
  const pareceLembrete = VERBOS_LEMBRETE.test(t)
  if (pareceLembrete) {
    out.push({
      tipo: 'lembrete',
      campos: { titulo: bruto.replace(/\blembrar de\b/i, '').trim() || bruto, data, horaInicio: hora },
      confianca: 'media',
      rotulo: `Lembrete${partes.length ? ` (${partes.join(', ')})` : ''}`,
    })
  }
  if (pareceTarefa) {
    out.push({
      tipo: 'tarefa',
      campos: { titulo: bruto, data, horaInicio: hora, duracaoMin },
      confianca: data || hora ? 'alta' : 'media',
      rotulo: `Ação a fazer${partes.length ? ` (${partes.join(', ')})` : ''}`,
    })
  }

  // 5) Nota — sempre disponível como saída segura
  out.push({
    tipo: 'nota',
    campos: { titulo: bruto },
    confianca: IDEIA.test(t) ? 'media' : 'baixa',
    rotulo: IDEIA.test(t) ? 'Ideia para guardar como nota' : 'Guardar o texto como nota',
  })

  // Remove duplicatas de tipo mantendo a de maior confiança (já em ordem).
  const vistos = new Set<TipoCaptura>()
  return out.filter((i) => (vistos.has(i.tipo) ? false : (vistos.add(i.tipo), true)))
}

/** Há ambiguidade real? (mais de um candidato forte, fora a nota de reserva). */
export function ehAmbiguo(cands: Interpretacao[]): boolean {
  const fortes = cands.filter((c) => c.tipo !== 'nota' && c.confianca !== 'baixa')
  return fortes.length >= 2 || fortes.length === 0
}
