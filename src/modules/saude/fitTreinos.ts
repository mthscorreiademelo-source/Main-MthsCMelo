import { format } from 'date-fns'
import FitParser from 'fit-file-parser'
import { db } from '../../core/db/db'
import type { Atividade } from './types'

/* ------------------------------------------------------------------ *
 * Importador de treinos em .FIT (relógio Amazfit/Zepp) → Atividade.
 *
 * O relógio exporta cada treino num arquivo .FIT (formato padrão de
 * fitness). Aqui lemos o arquivo no próprio aparelho (sem servidor),
 * pegamos o RESUMO de cada treino (tipo, duração, distância, calorias,
 * ritmo, FC média) e viramos uma Atividade. A rota detalhada de GPS
 * (que pode ter milhares de pontos) NÃO é guardada nesta versão — só o
 * resumo, que é o que sincroniza pra nuvem sem pesar.
 * ------------------------------------------------------------------ */

/** Tipos derivados do próprio parser (o pacote só expõe o entrypoint '.'). */
type ParsedFit = Awaited<ReturnType<InstanceType<typeof FitParser>['parseAsync']>>
type ParsedSession = NonNullable<ParsedFit['sessions']>[number]

/** Uma atividade pronta pra gravar (o `criadoEm` é posto na hora de salvar). */
export type AtividadeImportada = Omit<Atividade, 'criadoEm' | 'atualizadoEm'>

export interface ResultadoImportFit {
  /** Treinos novos que entraram no LUME. */
  importados: number
  /** Treinos que já existiam (reimportar o mesmo arquivo não duplica). */
  jaExistiam: number
  /** Arquivos que não deu pra ler (não eram .FIT válidos / sem treino). */
  arquivosComErro: number
  /** Nome dos arquivos com problema, pra mostrar ao usuário. */
  nomesComErro: string[]
}

/** Fonte gravada em `origem` — também serve de filtro/《de onde veio》. */
export const ORIGEM_FIT = 'Zepp .FIT'

/**
 * Esporte do .FIT → nome amigável em português. O que não estiver aqui vira
 * uma versão "bonitinha" do próprio nome (ex.: "kitesurfing" → "Kitesurfing").
 */
const ESPORTE_PT: Record<string, string> = {
  generic: 'Treino',
  running: 'Corrida',
  cycling: 'Ciclismo',
  e_biking: 'Ciclismo',
  walking: 'Caminhada',
  swimming: 'Natação',
  hiking: 'Trilha',
  mountaineering: 'Montanhismo',
  fitness_equipment: 'Treino',
  training: 'Treino',
  rowing: 'Remo',
  basketball: 'Basquete',
  soccer: 'Futebol',
  american_football: 'Futebol americano',
  tennis: 'Tênis',
  golf: 'Golfe',
  boxing: 'Boxe',
  rock_climbing: 'Escalada',
  floor_climbing: 'Escalada',
  sailing: 'Vela',
  surfing: 'Surfe',
  paddling: 'Canoagem',
  kayaking: 'Caiaque',
  stand_up_paddleboarding: 'Stand up paddle',
  inline_skating: 'Patinação',
  ice_skating: 'Patinação no gelo',
  snowboarding: 'Snowboard',
  alpine_skiing: 'Esqui',
  cross_country_skiing: 'Esqui',
  horseback_riding: 'Equitação',
}

/** Sub-esporte que "ganha" do esporte principal, quando presente. */
const SUB_ESPORTE_PT: Record<string, string> = {
  strength_training: 'Treino de força',
  yoga: 'Yoga',
  pilates: 'Pilates',
  flexibility_training: 'Alongamento',
  cardio_training: 'Cardio',
  treadmill: 'Corrida (esteira)',
  indoor_running: 'Corrida (esteira)',
  trail: 'Corrida (trilha)',
  indoor_walking: 'Caminhada (esteira)',
  indoor_cycling: 'Ciclismo indoor',
  spin: 'Ciclismo indoor',
  elliptical: 'Elíptico',
  stair_climbing: 'Escada',
  lap_swimming: 'Natação',
  open_water: 'Natação (águas abertas)',
}

/** Esportes "a pé" onde faz sentido calcular ritmo (min/km). */
const A_PE = new Set(['running', 'walking', 'hiking'])

function prettify(bruto: string): string {
  const s = bruto.replace(/_/g, ' ').trim()
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Treino'
}

/** Nome do treino a partir do esporte + sub-esporte. */
export function tipoDoEsporte(sport: unknown, subSport?: unknown): string {
  const sub = typeof subSport === 'string' ? subSport : ''
  if (sub && SUB_ESPORTE_PT[sub]) return SUB_ESPORTE_PT[sub]
  const esp = typeof sport === 'string' ? sport : String(sport ?? '')
  return ESPORTE_PT[esp] ?? (esp ? prettify(esp) : 'Treino')
}

/** Segundos por km → "m:ss /km" (arredonda os segundos com carry). */
export function ritmoMinKm(segundos: number, km: number): string | undefined {
  if (!segundos || !km || km <= 0) return undefined
  const sPerKm = segundos / km
  if (!Number.isFinite(sPerKm) || sPerKm <= 0) return undefined
  let m = Math.floor(sPerKm / 60)
  let s = Math.round(sPerKm % 60)
  if (s === 60) {
    m += 1
    s = 0
  }
  return `${m}:${String(s).padStart(2, '0')} /km`
}

function comoData(v: unknown): Date | undefined {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : v
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? undefined : d
  }
  return undefined
}

/**
 * Mapeia UMA sessão do .FIT para uma Atividade (resumo). Retorna null se a
 * sessão não tem nem horário de início — sem isso não dá pra situar o treino.
 *
 * O `id` deriva do instante de início (segundos), então reimportar o mesmo
 * treino gera o mesmo id: não duplica.
 */
export function sessaoParaAtividade(s: ParsedSession): AtividadeImportada | null {
  const inicio = comoData(s.start_time) ?? comoData(s.timestamp)
  if (!inicio) return null

  const esporte = typeof s.sport === 'string' ? s.sport : ''
  const tipo = tipoDoEsporte(s.sport, s.sub_sport)

  const seg = s.total_timer_time || s.total_elapsed_time || 0
  const duracaoMin = seg > 0 ? Math.round(seg / 60) : undefined

  const distanciaKm =
    typeof s.total_distance === 'number' && s.total_distance > 0
      ? Math.round(s.total_distance * 100) / 100
      : undefined

  const calorias =
    typeof s.total_calories === 'number' && s.total_calories > 0 ? Math.round(s.total_calories) : undefined

  const fcMediaTreino =
    typeof s.avg_heart_rate === 'number' && s.avg_heart_rate > 0 ? Math.round(s.avg_heart_rate) : undefined

  const ritmo = A_PE.has(esporte) && distanciaKm ? ritmoMinKm(seg, s.total_distance as number) : undefined

  const epochSeg = Math.floor(inicio.getTime() / 1000)

  return {
    id: `zepp-${epochSeg}`,
    data: format(inicio, 'yyyy-MM-dd'),
    hora: format(inicio, 'HH:mm'),
    tipo,
    duracaoMin,
    calorias,
    distanciaKm,
    ritmo,
    fcMediaTreino,
    origem: ORIGEM_FIT,
  }
}

/**
 * Confere, de forma barata, se os bytes parecem mesmo um .FIT antes de entregar
 * ao parser. Um .FIT começa com um cabeçalho de 12/14 bytes e traz a marca
 * ".FIT" nos bytes 8–11, além do tamanho do bloco de dados. Sem essa checagem,
 * um arquivo errado (uma foto, um CSV) poderia fazer o parser varrer lixo num
 * laço longo e travar o app. Aqui a gente barra na hora.
 */
function pareceFit(bytes: Uint8Array): boolean {
  if (bytes.length < 14) return false
  const headerLen = bytes[0]
  if (headerLen !== 12 && headerLen !== 14) return false
  // bytes 8..11 = ".FIT"
  if (bytes[8] !== 0x2e || bytes[9] !== 0x46 || bytes[10] !== 0x49 || bytes[11] !== 0x54) return false
  // tamanho declarado do bloco de dados tem que caber no arquivo.
  const dataLen = bytes[4] + bytes[5] * 0x100 + bytes[6] * 0x10000 + bytes[7] * 0x1000000
  return dataLen > 0 && headerLen + dataLen <= bytes.length
}

/**
 * Lê UM arquivo .FIT (como ArrayBuffer) e devolve as atividades (uma por
 * sessão — normalmente 1). Lança se o arquivo não for um .FIT válido.
 */
export async function lerTreinosFit(buffer: ArrayBuffer): Promise<AtividadeImportada[]> {
  if (!pareceFit(new Uint8Array(buffer))) throw new Error('Arquivo não parece um .FIT válido')
  const parser = new FitParser({ mode: 'list', lengthUnit: 'km', speedUnit: 'km/h', force: true })
  const dados = await parser.parseAsync(buffer)
  const sessoes = dados.sessions ?? []
  const atividades: AtividadeImportada[] = []
  for (const s of sessoes) {
    const a = sessaoParaAtividade(s)
    if (a) atividades.push(a)
  }
  return atividades
}

/**
 * Importa vários arquivos .FIT de uma vez (histórico ou o treino do dia).
 * Grava só os treinos novos; os que já existem são contados como "já existiam".
 */
export async function importarTreinosFit(arquivos: File[] | FileList): Promise<ResultadoImportFit> {
  const lista = Array.from(arquivos)
  const res: ResultadoImportFit = { importados: 0, jaExistiam: 0, arquivosComErro: 0, nomesComErro: [] }

  for (const arquivo of lista) {
    let atividades: AtividadeImportada[]
    try {
      atividades = await lerTreinosFit(await arquivo.arrayBuffer())
    } catch {
      res.arquivosComErro++
      res.nomesComErro.push(arquivo.name)
      continue
    }
    if (atividades.length === 0) {
      // .FIT lido, mas sem sessão de treino (ex.: só monitoramento diário).
      res.arquivosComErro++
      res.nomesComErro.push(arquivo.name)
      continue
    }
    for (const a of atividades) {
      const existente = await db.atividades.get(a.id)
      if (existente) {
        res.jaExistiam++
        continue
      }
      await db.atividades.add({ ...a, criadoEm: Date.now() })
      res.importados++
    }
  }

  return res
}
