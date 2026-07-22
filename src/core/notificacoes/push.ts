/**
 * Notificações push (Web Push) do lado do cliente.
 *
 * Fluxo: pedir permissão → assinar no `pushManager` com a chave VAPID pública →
 * guardar a assinatura (endpoint + chaves) na tabela `push_assinaturas` do
 * Supabase. A Edge Function `enviar-lembretes` lê essas assinaturas e dispara os
 * avisos (que o Android espelha no relógio de graça).
 *
 * Tudo é gated: sem nuvem/login ou sem suporte do navegador, as funções apenas
 * devolvem um estado "indisponível" — nada quebra o local-first.
 */
import { obterCliente } from '../nuvem/cliente'
import { nuvemAtiva } from '../nuvem/config'
import { PREFERENCIAS_PADRAO, VAPID_PUBLIC_KEY, type PreferenciasLembrete } from './config'

export type EstadoPush = 'indisponivel' | 'desligado' | 'negado' | 'ligado'

function suporta(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function pushDisponivel(): boolean {
  return suporta() && nuvemAtiva()
}

/** VAPID base64url → ArrayBuffer (formato exigido por `applicationServerKey`). */
function chaveParaBytes(base64url: string): ArrayBuffer {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buffer = new ArrayBuffer(raw.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return buffer
}

/** Estado atual: disponível? já assinado? permissão negada? */
export async function estadoAtual(): Promise<EstadoPush> {
  if (!pushDisponivel()) return 'indisponivel'
  if (Notification.permission === 'denied') return 'negado'
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  return sub ? 'ligado' : 'desligado'
}

async function assinaturaAtual(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

/**
 * Liga as notificações: pede permissão, assina e salva no Supabase.
 * Devolve o novo estado (ou 'negado' se o usuário recusar).
 */
export async function ligar(prefs: PreferenciasLembrete = PREFERENCIAS_PADRAO): Promise<EstadoPush> {
  if (!pushDisponivel()) return 'indisponivel'
  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') return permissao === 'denied' ? 'negado' : 'desligado'

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: chaveParaBytes(VAPID_PUBLIC_KEY),
    })
  }
  await salvarAssinatura(sub, prefs)
  return 'ligado'
}

/** Desliga: remove a assinatura do navegador e a linha no Supabase. */
export async function desligar(): Promise<EstadoPush> {
  const sub = await assinaturaAtual()
  if (sub) {
    const cliente = await obterCliente()
    if (cliente) await cliente.from('push_assinaturas').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
  }
  return 'desligado'
}

/** Grava/atualiza a assinatura e as preferências na nuvem (upsert por endpoint). */
export async function salvarAssinatura(sub: PushSubscription, prefs: PreferenciasLembrete): Promise<void> {
  const cliente = await obterCliente()
  if (!cliente) return
  const { data: sessao } = await cliente.auth.getUser()
  const userId = sessao.user?.id
  if (!userId) return
  const json = sub.toJSON()
  await cliente.from('push_assinaturas').upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
      prefs,
      user_agent: navigator.userAgent.slice(0, 200),
    },
    { onConflict: 'endpoint' },
  )
}

/** Atualiza só as preferências da assinatura atual (se houver). */
export async function atualizarPreferencias(prefs: PreferenciasLembrete): Promise<void> {
  const sub = await assinaturaAtual()
  if (sub) await salvarAssinatura(sub, prefs)
}

/** Lê as preferências guardadas para a assinatura atual (ou o padrão). */
export async function lerPreferencias(): Promise<PreferenciasLembrete> {
  const sub = await assinaturaAtual()
  const cliente = await obterCliente()
  if (!sub || !cliente) return PREFERENCIAS_PADRAO
  const { data } = await cliente.from('push_assinaturas').select('prefs').eq('endpoint', sub.endpoint).maybeSingle()
  return { ...PREFERENCIAS_PADRAO, ...(data?.prefs ?? {}) }
}

/** Dispara uma notificação de teste (via Edge Function) para validar o caminho. */
export async function enviarTeste(): Promise<{ ok: boolean; mensagem?: string }> {
  const cliente = await obterCliente()
  if (!cliente) return { ok: false, mensagem: 'Nuvem não configurada.' }
  const { data, error } = await cliente.functions.invoke('enviar-lembretes', { body: { teste: true } })
  if (error) return { ok: false, mensagem: error.message }
  const enviados = (data as { enviados?: number } | null)?.enviados ?? 0
  return enviados > 0
    ? { ok: true, mensagem: `Enviado para ${enviados} dispositivo(s).` }
    : { ok: false, mensagem: 'Nenhum dispositivo assinado recebeu (verifique a permissão).' }
}
