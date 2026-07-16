/**
 * Ponte com o app Android do Lume (WebView). Quando o Lume roda dentro do app,
 * `window.AndroidSaude` existe e expõe a leitura do Health Connect. Fora do app
 * (navegador comum) todas as funções viram no-ops.
 */

interface PonteSaude {
  loginSaude(email: string, senha: string): void
  sairSaude(): void
  conectarSaude(): void
  sincronizarAgora(): void
}

function ponte(): PonteSaude | null {
  if (typeof window === 'undefined') return null
  return (window as unknown as { AndroidSaude?: PonteSaude }).AndroidSaude ?? null
}

/** Verdadeiro quando o Lume está rodando dentro do app Android. */
export function noAppAndroid(): boolean {
  return ponte() != null
}

/** Repassa o login ao lado nativo, para o sync de saúde em segundo plano. */
export function loginSaudeAndroid(email: string, senha: string): void {
  try {
    ponte()?.loginSaude(email, senha)
  } catch {
    /* ignore */
  }
}

export function sairSaudeAndroid(): void {
  try {
    ponte()?.sairSaude()
  } catch {
    /* ignore */
  }
}

/** Pede a permissão do Health Connect e sincroniza. */
export function conectarSaudeAndroid(): void {
  try {
    ponte()?.conectarSaude()
  } catch {
    /* ignore */
  }
}

export function sincronizarSaudeAndroid(): void {
  try {
    ponte()?.sincronizarAgora()
  } catch {
    /* ignore */
  }
}

export interface EventoSaude {
  tipo: 'status' | 'ok' | 'erro'
  mensagem: string
  ultimaSync?: number
}

/** Ouve os avisos que o app nativo emite durante a sincronização de saúde. */
export function ouvirSaude(cb: (e: EventoSaude) => void): () => void {
  const handler = (ev: Event) => cb((ev as CustomEvent).detail as EventoSaude)
  window.addEventListener('lume-saude', handler)
  return () => window.removeEventListener('lume-saude', handler)
}
