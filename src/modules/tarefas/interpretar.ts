/**
 * Interpretador de linguagem natural do "Nova tarefa" (Item 1 do plano).
 *
 * Lê uma frase digitada em pt-BR e devolve os campos reconhecidos (prazo,
 * horário, duração, prioridade, projeto, bloco de tempo) junto com o título
 * já limpo (sem os trechos reconhecidos nem palavras de intenção redundantes
 * como "preciso"/"tenho que"). Tudo determinístico (regex + calendário), sem
 * IA — o usuário sempre pode corrigir os campos abaixo da linha digitada.
 *
 * Inspirado na heurística mais completa do ecossistema LUME
 * (`watch/pulso/utils/heuristica.js`, função `interpretarHeuristico`), mas
 * reescrito para TypeScript/o modelo de `Task` daqui — não depende daquele
 * arquivo (projeto separado, QuickJS-only).
 *
 * TÉCNICA (mesma do arquivo de referência): casamos os padrões sobre uma
 * versão minúscula/sem acento do texto (`plano`), que preserva o MESMO
 * comprimento/posições do texto original (`bruto`) — cada trecho reconhecido
 * é apagado (virando espaços) nas MESMAS posições dos dois textos em
 * paralelo. Isso deixa `\b` funcionando normalmente (não reconhece letra
 * acentuada como borda) e ainda preserva acentos/maiúsculas do que sobra no
 * título.
 */
import { addDays, format } from 'date-fns'
import type { Prioridade, Projeto } from './types'

/** Duração padrão (min) de um bloco criado a partir de um horário reconhecido, sem duração explícita na frase. */
export const DURACAO_BLOCO_PADRAO = 30

export interface BlocoReconhecido {
  data: string
  inicio: string
  duracaoMin: number
}

export interface TarefaInterpretada {
  /** Título já limpo (sem data/hora/duração/prioridade/#projeto/palavras de intenção). */
  titulo: string
  /** Prazo (dia). */
  data?: string
  /** Horário-limite (prazo), no dia `data` — reconhecido só quando havia palavra de limite ("até"/"antes de"). */
  horario?: string
  /** Duração da tarefa (min) — só quando NÃO virou um bloco (ver `bloco`). */
  duracaoMin?: number
  prioridade?: Prioridade
  projetoId?: string
  /** Bloco de tempo (dia+hora) reconhecido quando a frase tem um horário SEM palavra de limite. Sempre "fixado". */
  bloco?: BlocoReconhecido
}

/* ---------- utilitários de texto (posição-preservando) ---------- */

/** Minúsculas e sem diacríticos, preservando o comprimento (1 char -> 1 char). */
function semAcentoLower(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function normalizarBordas(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.;:–-]+|[\s,.;:–-]+$/g, '')
    .trim()
}

function capitalizar(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

/* ---------- datas ---------- */

const DIAS_SEMANA: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
}

const MESES: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
}

function iso(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

/** Base "meio-dia" (blinda contra horário de verão) só com ano/mês/dia de `d`. */
function baseDoDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0)
}

function proximoDiaSemana(agora: Date, alvo: number): Date {
  const base = baseDoDia(agora)
  let delta = (alvo - base.getDay() + 7) % 7
  if (delta === 0) delta = 7 // hoje é o mesmo dia da semana citado -> próxima ocorrência
  return addDays(base, delta)
}

function proximoDiaDoMes(agora: Date, dia: number): Date {
  const mesOffset = dia <= agora.getDate() ? 1 : 0
  return new Date(agora.getFullYear(), agora.getMonth() + mesOffset, dia, 12, 0, 0, 0)
}

function normalizarAno(a: string): number {
  return a.length === 2 ? 2000 + Number(a) : Number(a)
}

interface Achado<T> {
  valor: T
  match: RegExpMatchArray
}

/** Data reconhecida na frase (hoje/amanhã/anteontem/dia da semana/dd-mm-aaaa/"dia N de mês"…). */
function extrairData(plano: string, agora: Date): Achado<string> | null {
  let m = plano.match(/\bdepois de amanha\b/)
  if (m) return { valor: iso(addDays(baseDoDia(agora), 2)), match: m }
  m = plano.match(/\banteontem\b/)
  if (m) return { valor: iso(addDays(baseDoDia(agora), -2)), match: m }
  m = plano.match(/\bamanha\b/)
  if (m) return { valor: iso(addDays(baseDoDia(agora), 1)), match: m }
  m = plano.match(/\bhoje\b/)
  if (m) return { valor: iso(baseDoDia(agora)), match: m }
  m = plano.match(/\bontem\b/)
  if (m) return { valor: iso(addDays(baseDoDia(agora), -1)), match: m }
  m = plano.match(/\b(?:proxima semana|semana que vem)\b/)
  if (m) return { valor: iso(addDays(baseDoDia(agora), 7)), match: m }

  for (const [nome, dow] of Object.entries(DIAS_SEMANA)) {
    const re = new RegExp(`\\b(?:na |nesta |neste |proxima |proximo |toda |todo )?${nome}(?:-?feira)?\\b`)
    m = plano.match(re)
    if (m) return { valor: iso(proximoDiaSemana(agora, dow)), match: m }
  }

  // dd/mm[/aaaa] ou dd-mm[-aaaa], com "dia " opcional
  m = plano.match(/\b(?:dia\s+)?(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/)
  if (m) {
    const dia = Number(m[1])
    const mes = Number(m[2])
    if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) {
      const ano = m[3] ? normalizarAno(m[3]) : agora.getFullYear()
      return { valor: iso(new Date(ano, mes - 1, dia, 12, 0, 0, 0)), match: m }
    }
  }

  // "dia N de <mês> [de AAAA]" ou "N de <mês>"
  m = plano.match(/\b(?:dia\s+)?(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{2,4}))?\b/)
  if (m && MESES[m[2]]) {
    const dia = Number(m[1])
    const mes = MESES[m[2]]
    if (dia >= 1 && dia <= 31) {
      const ano = m[3] ? normalizarAno(m[3]) : agora.getFullYear()
      return { valor: iso(new Date(ano, mes - 1, dia, 12, 0, 0, 0)), match: m }
    }
  }

  // "dia N" puro -> próxima ocorrência do dia N do mês
  m = plano.match(/\bdia\s+(\d{1,2})\b/)
  if (m) {
    const dnum = Number(m[1])
    if (dnum >= 1 && dnum <= 31) return { valor: iso(proximoDiaDoMes(agora, dnum)), match: m }
  }

  return null
}

/* ---------- horário-limite (prazo) ---------- */

/**
 * Horário com palavra de LIMITE antes ("até as 23h", "até 9h", "antes das
 * 18h") -> vira o prazo-horário (`Task.horario`), não um bloco.
 */
function extrairHoraLimite(plano: string): Achado<string> | null {
  const m = plano.match(
    /\b(?:ate|antes)\s+(?:de\s+|da\s+|das\s+|do\s+|dos\s+)?(?:as\s+)?(\d{1,2})(?:[:h](\d{2}))?\s*(?:h|hs|horas)?\b/,
  )
  if (!m) return null
  const h = Number(m[1])
  const min = m[2] ? Number(m[2]) : 0
  if (Number.isNaN(h) || h > 23 || min > 59) return null
  return { valor: `${pad2(h)}:${pad2(min)}`, match: m }
}

/* ---------- horário (bloco planejado) ---------- */

const PERIODO_PADRAO: Record<string, string> = {
  madrugada: '05:00',
  manha: '08:00',
  tarde: '14:00',
  noite: '20:00',
}

/** Horário SEM palavra de limite -> vira um bloco planejado (dia+hora), fixado. */
function extrairHora(plano: string): Achado<string> | null {
  let m = plano.match(/\bmeio[\s-]?dia\b/)
  if (m) return { valor: '12:00', match: m }
  m = plano.match(/\bmeia[\s-]?noite\b/)
  if (m) return { valor: '00:00', match: m }

  let periodo: string | undefined
  let mm: RegExpMatchArray | null = plano.match(/\b(\d{1,2})(?:[:h](\d{2}))?\s*(?:da|de)\s+(manha|tarde|noite|madrugada)\b/)
  if (mm) periodo = mm[3]
  if (!mm) mm = plano.match(/\b(?:as\s+)?(\d{1,2})[:h](\d{2})\b/)
  if (!mm) mm = plano.match(/\b(?:as\s+)?(\d{1,2})\s*(?:h|hs|horas)\b/)
  if (!mm) mm = plano.match(/\bas\s+(\d{1,2})\b/)
  if (mm) {
    let h = Number(mm[1])
    const min = mm[2] ? Number(mm[2]) : 0
    if (!Number.isNaN(h) && min <= 59) {
      if (periodo === 'tarde' && h < 12) h += 12
      else if (periodo === 'noite' && h < 12) h += 12
      else if (periodo === 'madrugada' && h === 12) h = 0
      else if (periodo === 'manha' && h === 12) h = 0
      if (h <= 23) return { valor: `${pad2(h)}:${pad2(min)}`, match: mm }
    }
  }

  // período isolado, sem número (ex.: "estudar de madrugada")
  const mPeriodo = plano.match(/\bde\s+(madrugada|manha|tarde|noite)\b/)
  if (mPeriodo) return { valor: PERIODO_PADRAO[mPeriodo[1]], match: mPeriodo }

  return null
}

/* ---------- duração ---------- */

function extrairDuracao(plano: string): Achado<number> | null {
  let m = plano.match(/\bmeia\s+hora\b/)
  if (m) return { valor: 30, match: m }

  const mMeia = plano.match(/\b(uma?|\d{1,2})\s*horas?\s+e\s+meia\b/)
  if (mMeia) {
    const h1 = /^\d+$/.test(mMeia[1]) ? Number(mMeia[1]) : 1
    return { valor: h1 * 60 + 30, match: mMeia }
  }

  const temCue = /\b(por|durante|dura|duracao|leva|levar|gasta|gastar)\b/.test(plano)

  // combo horas+minutos: "2h30", "2h 30min", "2 horas e 30 minutos", "2 horas 30"
  const mC = plano.match(/\b(\d{1,2})\s*h(?:oras?)?\s*(?:e\s*)?(\d{1,2})\s*(?:m|min|minutos?)?\b/)
  if (mC && mC.index != null) {
    const antes = plano.slice(Math.max(0, mC.index - 4), mC.index)
    const precedidoPorAs = /\bas\s*$/.test(antes)
    const pareceHorarioCurto = /^\d{1,2}h\d{2}$/.test(mC[0].trim())
    if (!precedidoPorAs && (temCue || /min/.test(mC[0]) || /hora/.test(mC[0]) || pareceHorarioCurto)) {
      return { valor: Number(mC[1]) * 60 + Number(mC[2]), match: mC }
    }
  }

  // só minutos: "30 min", "por 45 minutos", "90min"
  const mMin = plano.match(/\b(\d{1,3})\s*(?:m|min|minutos?)\b/)
  if (mMin) return { valor: Number(mMin[1]), match: mMin }

  // só horas (palavra completa): "2 horas", "por 2 horas"
  const mHoras = plano.match(/\b(\d{1,2})\s*horas?\b/)
  if (mHoras) return { valor: Number(mHoras[1]) * 60, match: mHoras }

  // "Nh" isolado só vira duração com palavra-pista ("por 2h", "dura 1h")
  if (temCue) {
    const mH = plano.match(/\b(\d{1,2})\s*h\b/)
    if (mH) return { valor: Number(mH[1]) * 60, match: mH }
  }

  return null
}

/* ---------- limpeza de título ---------- */

const LIXO_INTENCAO: RegExp[] = [
  /\bnao\s+esquecer\s+de\b/,
  /\bnao\s+esqueca\s+de\b/,
  /\bme\s+lembrar\s+de\b/,
  /\blembrar\s+de\b/,
  /\btenho\s+que\b/,
  /\btenho\s+de\b/,
  /\bpreciso\s+de\b/,
  /\bpreciso\b/,
  /\bantes\s+d(?:e|as|os|o)\b/,
  /\bantes\b/,
  /\bate\b/,
]

/* ---------- função pública ---------- */

/**
 * Interpreta a frase do "Nova tarefa" e devolve os campos reconhecidos +
 * título limpo. `agora` é a referência temporal (default: `new Date()`,
 * injetável em teste via `vi.setSystemTime`).
 */
export function interpretarTarefa(texto: string, projetos: Projeto[], agora: Date = new Date()): TarefaInterpretada {
  let bruto = texto
  let plano = semAcentoLower(texto)

  /** Apaga o trecho casado (mesma posição em `bruto` e `plano`, preservando comprimento). */
  function cortar(m: RegExpMatchArray | null): void {
    if (!m || m.index == null) return
    const inicio = m.index
    const fim = inicio + m[0].length
    const vazio = ' '.repeat(fim - inicio)
    bruto = bruto.slice(0, inicio) + vazio + bruto.slice(fim)
    plano = plano.slice(0, inicio) + vazio + plano.slice(fim)
  }

  let prioridade: Prioridade | undefined
  let projetoId: string | undefined

  // #Projeto (uma palavra, casa pelo nome sem acento/caixa — com ou sem espaços)
  const mProj = plano.match(/(?:^|\s)#([a-z0-9_-]+)/)
  if (mProj) {
    const alvo = mProj[1]
    const p = projetos.find((x) => {
      const nome = semAcentoLower(x.nome)
      return nome === alvo || nome.replace(/\s+/g, '') === alvo
    })
    if (p) {
      projetoId = p.id
      cortar(mProj)
    }
  }

  // p1..p4
  const mPri = plano.match(/(?:^|\s)!?p([1-4])\b/)
  if (mPri) {
    prioridade = Number(mPri[1]) as Prioridade
    cortar(mPri)
  }

  // data (prazo)
  const achData = extrairData(plano, agora)
  const data = achData?.valor
  cortar(achData?.match ?? null)

  // duração (antes do horário, pra não sobrar dígito solto pro horário reconhecer)
  const achDuracao = extrairDuracao(plano)
  cortar(achDuracao?.match ?? null)

  // horário: com palavra de limite -> prazo-horário; senão -> bloco planejado
  let horario: string | undefined
  let bloco: BlocoReconhecido | undefined
  const achLimite = extrairHoraLimite(plano)
  if (achLimite) {
    horario = achLimite.valor
    cortar(achLimite.match)
  } else {
    const achHora = extrairHora(plano)
    if (achHora) {
      cortar(achHora.match)
      bloco = {
        data: data ?? iso(baseDoDia(agora)),
        inicio: achHora.valor,
        duracaoMin: achDuracao?.valor ?? DURACAO_BLOCO_PADRAO,
      }
    }
  }

  // palavras de intenção redundantes ("preciso", "tenho que", "não esquecer de"…)
  for (const re of LIXO_INTENCAO) {
    cortar(plano.match(re))
  }

  const titulo = capitalizar(normalizarBordas(bruto)) || texto.trim()

  return {
    titulo,
    data,
    horario,
    // duracaoMin só fica na tarefa quando NÃO virou bloco (o bloco já carrega sua própria duração).
    duracaoMin: bloco ? undefined : achDuracao?.valor,
    prioridade,
    projetoId,
    bloco,
  }
}
