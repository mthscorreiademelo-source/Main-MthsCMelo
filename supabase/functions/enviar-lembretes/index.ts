// Supabase Edge Function: enviar-lembretes (Web Push / VAPID)
//
// Dois modos:
//  1) { teste: true }  — chamada pelo app com o JWT do usuário. Manda UMA
//     notificação de teste para os dispositivos daquele usuário. Serve para
//     validar toda a corrente (permissão → assinatura → push → espelho no relógio).
//  2) Agendado (cron)  — exige o header `x-cron-secret` = segredo CRON_SECRET.
//     Percorre as assinaturas e, para quem pediu resumo diário naquela hora
//     (fuso America/Sao_Paulo), monta "Hoje: N tarefas, N eventos, N hábitos"
//     a partir dos `documentos` e dispara.
//
// Segredos necessários: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
// (ex.: mailto:voce@email.com), CRON_SECRET. SUPABASE_URL e
// SUPABASE_SERVICE_ROLE_KEY já vêm por padrão no ambiente das Edge Functions.

import webpush from 'npm:web-push@3.6.7'

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL = Deno.env.get('APP_URL') ?? 'https://mthscorreiademelo-source.github.io/Main-MthsCMelo/'

interface Prefs {
  resumoDiario?: boolean
  hora?: string
  tarefas?: boolean
  eventos?: boolean
  habitos?: boolean
}
interface Assinatura {
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  prefs: Prefs
}

/** REST do Supabase com a service role (ignora RLS; uso interno da função). */
async function rest(caminho: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${caminho}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
}

/** Data de hoje (yyyy-MM-dd) e hora (HH) no fuso de Brasília. */
function agoraBrasilia(): { hoje: string; hora: string } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false,
  })
  const partes = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]))
  return { hoje: `${partes.year}-${partes.month}-${partes.day}`, hora: partes.hour }
}

/** Envia um payload para uma assinatura; remove a linha se ela expirou (404/410). */
async function enviar(a: Assinatura, payload: object): Promise<boolean> {
  const sub = { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload))
    return true
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode
    if (status === 404 || status === 410) {
      await rest(`push_assinaturas?endpoint=eq.${encodeURIComponent(a.endpoint)}`, { method: 'DELETE' })
    }
    return false
  }
}

/** Resumo do dia de um usuário a partir dos documentos sincronizados. */
async function resumoDoDia(userId: string, prefs: Prefs, hoje: string): Promise<string | null> {
  const resp = await rest(
    `documentos?user_id=eq.${userId}&deleted=eq.false&colecao=in.(tasks,eventos,habitos,habitoRegistros)&select=colecao,doc`,
  )
  if (!resp.ok) return null
  const linhas = (await resp.json()) as { colecao: string; doc: Record<string, unknown> }[]

  let tarefas = 0
  let eventos = 0
  let habitosAtivos = 0
  let habitosFeitos = 0
  for (const { colecao, doc } of linhas) {
    if (colecao === 'tasks' && doc.data === hoje && !doc.concluidaEm) tarefas++
    else if (colecao === 'eventos' && doc.data === hoje) eventos++
    else if (colecao === 'habitos' && !doc.arquivado) habitosAtivos++
    else if (colecao === 'habitoRegistros' && doc.data === hoje) habitosFeitos++
  }
  const habitos = Math.max(0, habitosAtivos - habitosFeitos)

  const partes: string[] = []
  if (prefs.tarefas !== false && tarefas > 0) partes.push(`${tarefas} tarefa${tarefas > 1 ? 's' : ''}`)
  if (prefs.eventos !== false && eventos > 0) partes.push(`${eventos} evento${eventos > 1 ? 's' : ''}`)
  if (prefs.habitos !== false && habitos > 0) partes.push(`${habitos} hábito${habitos > 1 ? 's' : ''}`)
  if (partes.length === 0) return null
  return `☀️ Hoje: ${partes.join(' · ')} pra dar conta.`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

  const pub = Deno.env.get('VAPID_PUBLIC_KEY')
  const priv = Deno.env.get('VAPID_PRIVATE_KEY')
  const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:lume@example.com'
  if (!pub || !priv) return json({ erro: 'VAPID não configurado' }, 500)
  webpush.setVapidDetails(subject, pub, priv)

  let corpo: { teste?: boolean } = {}
  try { corpo = await req.json() } catch { /* corpo vazio = execução agendada */ }

  // ---- Modo teste: manda para os dispositivos do próprio usuário (via JWT) ----
  if (corpo.teste) {
    const auth = req.headers.get('Authorization') ?? ''
    const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_KEY, Authorization: auth },
    })
    if (!u.ok) return json({ erro: 'não autenticado' }, 401)
    const userId = (await u.json())?.id
    if (!userId) return json({ erro: 'sem usuário' }, 401)

    const resp = await rest(`push_assinaturas?user_id=eq.${userId}&select=*`)
    const assinaturas = (await resp.json()) as Assinatura[]
    let enviados = 0
    for (const a of assinaturas) {
      const ok = await enviar(a, {
        title: 'Lume 🔔',
        body: 'Notificações ligadas! É assim que os lembretes vão chegar — no celular e espelhados no relógio.',
        url: APP_URL,
        tag: 'lume-teste',
      })
      if (ok) enviados++
    }
    return json({ enviados })
  }

  // ---- Modo agendado: exige o segredo do cron ----
  const segredo = Deno.env.get('CRON_SECRET')
  if (!segredo || req.headers.get('x-cron-secret') !== segredo) {
    return json({ erro: 'proibido' }, 403)
  }

  const { hoje, hora } = agoraBrasilia()
  const resp = await rest(`push_assinaturas?select=*`)
  const assinaturas = (await resp.json()) as Assinatura[]
  let enviados = 0
  // Agrupa por usuário para calcular o resumo uma vez só por pessoa/hora.
  const cache = new Map<string, string | null>()
  for (const a of assinaturas) {
    const prefs = a.prefs ?? {}
    if (prefs.resumoDiario === false) continue
    const horaPref = (prefs.hora ?? '08:00').slice(0, 2)
    if (horaPref !== hora) continue
    if (!cache.has(a.user_id)) cache.set(a.user_id, await resumoDoDia(a.user_id, prefs, hoje))
    const texto = cache.get(a.user_id)
    if (!texto) continue
    const ok = await enviar(a, { title: 'Bom dia ☀️', body: texto, url: APP_URL, tag: 'lume-resumo' })
    if (ok) enviados++
  }
  return json({ enviados, hora, hoje })
})
