/**
 * Interpretação HEURÍSTICA de uma captura de texto livre (pt-BR).
 *
 * Tudo aqui é determinístico: expressões regulares e regras de calendário.
 * Não há IA nem chamada de rede. O objetivo é dar um bom PALPITE que o
 * usuário confirma — por isso cada interpretação carrega um rótulo honesto
 * ("por quê") e um nível de confiança. Quando há ambiguidade, devolvemos
 * mais de um candidato em vez de escolher por conta própria.
 *
 * IMPORTANTE: o casamento é feito sobre o texto SEM acentos (`semAcento`),
 * porque `\b` do JavaScript usa só [A-Za-z0-9_] — um acento na borda (ex.:
 * "amanhã", "sábado", "salário") quebra o boundary e o padrão falharia.
 */
import { addDays, format } from 'date-fns'
import type { Confianca, Interpretacao, TipoCaptura } from './types'

/** Minúsculas e sem diacríticos: "Amanhã" → "amanha". */
function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/* --------------------------------- Datas --------------------------------- */

// Chaves SEM acento (o texto é normalizado antes de casar).
const DIAS_SEMANA: Record<string, { dow: number; rotulo: string }> = {
  domingo: { dow: 0, rotulo: 'domingo' },
  segunda: { dow: 1, rotulo: 'segunda' },
  terca: { dow: 2, rotulo: 'terça' },
  quarta: { dow: 3, rotulo: 'quarta' },
  quinta: { dow: 4, rotulo: 'quinta' },
  sexta: { dow: 5, rotulo: 'sexta' },
  sabado: { dow: 6, rotulo: 'sábado' },
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
  const t = semAcento(texto)

  if (/\bdepois de amanha\b/.test(t)) return { data: iso(addDays(agora, 2)), trecho: 'depois de amanhã' }
  if (/\bamanha\b/.test(t)) return { data: iso(addDays(agora, 1)), trecho: 'amanhã' }
  if (/\bhoje\b/.test(t)) return { data: iso(agora), trecho: 'hoje' }
  if (/\bontem\b/.test(t)) return { data: iso(addDays(agora, -1)), trecho: 'ontem' }
  if (/\b(proxima semana|semana que vem)\b/.test(t)) return { data: iso(addDays(agora, 7)), trecho: 'próxima semana' }

  for (const [nome, info] of Object.entries(DIAS_SEMANA)) {
    const re = new RegExp(`\\b(?:na\\s+|nesta\\s+|proxima\\s+)?${nome}(?:-feira)?\\b`)
    if (re.test(t)) return { data: iso(proximoDiaSemana(agora, info.dow)), trecho: info.rotulo }
  }

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
  const t = semAcento(texto)
  const m = t.match(/\b(?:as\s*)?(\d{1,2})(?:[:h](\d{2}))?\s*(?:h|horas)?\b(\s*(da|de)\s*(manha|tarde|noite))?/)
  if (!m) return {}
  let h = +m[1]
  const min = m[2] ? +m[2] : 0
  const periodo = m[6]
  const temMarcador = /as\s|[:h]|\bhoras?\b/.test(m[0]) || !!periodo
  if (!temMarcador) return {}
  if (h > 23 || min > 59) return {}
  if (periodo === 'tarde' && h < 12) h += 12
  if (periodo === 'noite' && h < 12) h += 12
  if (periodo === 'manha' && h === 12) h = 0
  return { hora: `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`, trecho: m[0].trim() }
}

/** Extrai duração em minutos, ou undefined. */
export function extrairDuracao(texto: string): number | undefined {
  const t = semAcento(texto)
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
  const t = semAcento(texto)
  const comCifrao = t.match(/r\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/)
  const comReais = t.match(/\b(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:reais|conto|pila)\b/)
  const perto = t.match(/\b(?:gastei|paguei|custou|comprei|recebi|ganhei|entrou)\s+(?:de\s+)?(\d+(?:[.,]\d{1,2})?)\b/)
  const alvo = comCifrao || comReais || perto
  if (!alvo) return {}
  const bruto = alvo[1]
  let n: number
  if (bruto.includes(',')) n = parseFloat(bruto.replace(/\./g, '').replace(',', '.'))
  else n = parseFloat(bruto)
  if (!isFinite(n)) return {}
  return { centavos: Math.round(n * 100), trecho: alvo[0] }
}

/* ------------------------------ Categorias ------------------------------- */

const CATEGORIAS: { cat: string; palavras: RegExp }[] = [
  { cat: 'Mercado', palavras: /\b(mercado|supermercado|feira|hortifruti|padaria|acougue)\b/ },
  { cat: 'Alimentação', palavras: /\b(ifood|lanche|almoco|jantar|restaurante|cafe|pizza|delivery)\b/ },
  { cat: 'Transporte', palavras: /\b(uber|99|gasolina|combustivel|onibus|metro|estacionamento|pedagio)\b/ },
  { cat: 'Saúde', palavras: /\b(farmacia|remedio|consulta|exame|medico|dentista)\b/ },
  { cat: 'Casa', palavras: /\b(aluguel|luz|agua|internet|condominio|gas|energia)\b/ },
  { cat: 'Lazer', palavras: /\b(cinema|show|netflix|spotify|jogo|bar|balada)\b/ },
]

function categoriaDe(texto: string): string | undefined {
  const t = semAcento(texto)
  for (const c of CATEGORIAS) if (c.palavras.test(t)) return c.cat
  return undefined
}

/* ------------------------- Pessoas / lugares ----------------------------- */

function pessoaDe(texto: string): string | undefined {
  // Mantém o texto original (com acentos) para preservar o nome.
  const m = texto.match(/\b(?:com|para|pra)\s+(?:o\s+|a\s+|dr\.?\s*|dra\.?\s*)?([A-ZÀ-Þ][\wÀ-ÿ]+(?:\s+[A-ZÀ-Þ][\wÀ-ÿ]+)?)/)
  return m ? m[1].trim() : undefined
}

function localDe(texto: string): string | undefined {
  const m = texto.match(/\b(?:no|na|em)\s+([A-ZÀ-Þ][\wÀ-ÿ]+(?:\s+[A-ZÀ-Þ][\wÀ-ÿ]+)?)/)
  return m ? m[1].trim() : undefined
}

/* ------------------------------ Classificação ---------------------------- */

// Padrões SEM acento (casados sobre o texto normalizado).
const VERBOS_TAREFA = /\b(ligar|enviar|mandar|revisar|marcar|fazer|terminar|escrever|responder|comprar|pagar|agendar|estudar|ler|organizar|limpar|arrumar|levar|buscar|entregar|resolver|separar|imprimir)\b/
const VERBOS_LEMBRETE = /\b(lembrar|nao esquecer|lembrete)\b/
const PALAVRAS_EVENTO = /\b(consulta|reuniao|encontro|compromisso|aniversario|entrevista|apresentacao|call|treino|aula|jantar|almoco|festa|viagem|prova|show)\b/
const VERBOS_RECEITA = /\b(recebi|ganhei|salario|entrou|rendimento|reembolso|freela|pix recebido)\b/
const IDEIA = /\b(ideia|pensei|e se|talvez|conceito|anotar)\b/

function limparTitulo(texto: string): string {
  return texto.trim().replace(/\s+/g, ' ')
}

function tituloCompra(texto: string): string {
  let t = texto.replace(/\bcomprar\b/i, '').trim()
  t = t.replace(/\b(hoje|amanh[aã]|depois de amanh[aã]|ontem|pr[oó]xima semana|semana que vem)\b/gi, '').trim()
  for (const nome of Object.keys(DIAS_SEMANA)) t = t.replace(new RegExp(`\\b${nome}(?:-feira)?\\b`, 'gi'), '').trim()
  t = t.replace(/\s+/g, ' ').replace(/^[,.\s]+|[,.\s]+$/g, '')
  return t ? t[0].toUpperCase() + t.slice(1) : texto.trim()
}

function confDe(score: number): Confianca {
  if (score >= 2.5) return 'alta'
  if (score >= 1) return 'media'
  return 'baixa'
}

/**
 * Interpreta um texto livre e devolve candidatos ordenados (melhor primeiro).
 *
 * Cada tipo recebe uma pontuação a partir de sinais determinísticos (data,
 * hora, pessoa, palavras de ação/compromisso). Quando há sinais mas o tipo é
 * ambíguo — ex.: "amanhã tem X" tem data mas nenhum verbo — devolvemos mais de
 * um candidato para o usuário escolher. "Nota" é sempre a saída segura.
 */
export function interpretar(texto: string, agora: Date = new Date()): Interpretacao[] {
  const bruto = limparTitulo(texto)
  if (!bruto) return []
  const t = semAcento(bruto)

  const { data, trecho: trechoData } = extrairData(bruto, agora)
  const { hora } = extrairHora(bruto)
  const duracaoMin = extrairDuracao(bruto)
  const { centavos } = extrairValor(bruto)
  const categoria = categoriaDe(bruto)
  const pessoa = pessoaDe(bruto)

  const partes: string[] = []
  if (trechoData) partes.push(trechoData)
  if (hora) partes.push(`às ${hora}`)
  if (duracaoMin) partes.push(`${duracaoMin} min`)
  const ctx = partes.length ? ` (${partes.join(', ')})` : ''

  const out: (Interpretacao & { score: number })[] = []

  if (centavos != null) {
    const ehReceita = VERBOS_RECEITA.test(t)
    out.push({
      tipo: ehReceita ? 'receita' : 'despesa',
      score: 5,
      confianca: 'alta',
      campos: { titulo: bruto, valorCentavos: centavos, categoria, data: data ?? iso(agora), pessoa },
      rotulo: `Valor identificado (${(centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})${categoria ? ` · ${categoria}` : ''} → ${ehReceita ? 'receita' : 'despesa'}`,
    })
  } else {
    const hasVerbo = VERBOS_TAREFA.test(t)
    const hasEvento = PALAVRAS_EVENTO.test(t)
    const hasLembrete = VERBOS_LEMBRETE.test(t)
    const hasCompra = /\bcomprar\b/.test(t)

    const eScore = (hasEvento ? 2 : 0) + (hora ? 1.5 : 0) + (pessoa ? 1 : 0) + (data ? 1 : 0)
    if (eScore > 0) {
      out.push({
        tipo: 'evento',
        score: eScore,
        confianca: confDe(eScore),
        campos: { titulo: bruto, data, horaInicio: hora, duracaoMin, pessoa, local: localDe(bruto) },
        rotulo: `Parece um compromisso${ctx}`,
      })
    }

    if (hasVerbo) {
      const tScore = 2 + (data ? 0.6 : 0) + (hora ? 0.6 : 0)
      out.push({
        tipo: 'tarefa',
        score: tScore,
        confianca: confDe(tScore),
        campos: { titulo: bruto, data, horaInicio: hora, duracaoMin },
        rotulo: `Ação a fazer${ctx}`,
      })
    }

    if (hasLembrete) {
      out.push({
        tipo: 'lembrete',
        score: 1.6,
        confianca: 'media',
        campos: { titulo: bruto.replace(/\blembrar de\b/i, '').trim() || bruto, data, horaInicio: hora },
        rotulo: `Lembrete${ctx}`,
      })
    }

    if (hasCompra) {
      out.push({
        tipo: 'compra',
        score: 1.6,
        confianca: 'media',
        campos: { titulo: tituloCompra(bruto), data },
        rotulo: 'Item para a lista de compras',
      })
    }
  }

  out.push({
    tipo: 'nota',
    score: 0.2,
    confianca: IDEIA.test(t) ? 'media' : 'baixa',
    campos: { titulo: bruto },
    rotulo: IDEIA.test(t) ? 'Ideia para guardar como nota' : 'Guardar o texto como nota',
  })

  out.sort((a, b) => b.score - a.score)
  const vistos = new Set<TipoCaptura>()
  return out
    .filter((i) => (vistos.has(i.tipo) ? false : (vistos.add(i.tipo), true)))
    .map(({ score: _score, ...i }) => i)
}
