/**
 * Configuração das notificações push (Web Push / VAPID).
 *
 * A chave PÚBLICA VAPID é pública por design — vai embutida no JS servido ao
 * navegador (como a chave anon do Supabase). A chave PRIVADA correspondente fica
 * só como segredo na Edge Function `enviar-lembretes` (nunca no cliente).
 *
 * Pode ser sobrescrita pelo build via VITE_VAPID_PUBLIC_KEY.
 */
const VAPID_PADRAO = 'BEfWxgzw9h1n5kD6GQfRFWnhPnK6s4CRQPuoqAv0XN05jqW7JdubyprjPrLFTfTGT7dnh8-7o5ZG0-EcB5kk8uE'

export const VAPID_PUBLIC_KEY =
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)?.trim() || VAPID_PADRAO

/** Preferências de lembrete (guardadas na linha da assinatura, no Supabase). */
export interface PreferenciasLembrete {
  /** Liga o resumo diário ("Hoje: N tarefas, N eventos, N hábitos"). */
  resumoDiario: boolean
  /** Hora do resumo diário, HH:mm (fuso America/Sao_Paulo no servidor). */
  hora: string
  /** Incluir tarefas com prazo hoje. */
  tarefas: boolean
  /** Incluir eventos de hoje. */
  eventos: boolean
  /** Incluir hábitos pendentes de hoje. */
  habitos: boolean
}

export const PREFERENCIAS_PADRAO: PreferenciasLembrete = {
  resumoDiario: true,
  hora: '08:00',
  tarefas: true,
  eventos: true,
  habitos: true,
}
