import { IconMais } from '../components/Icons'
import { abrirLauncher, useLauncher } from './store'

/**
 * Botão flutuante global de Captura Rápida. Fica na parte inferior (alcance do
 * polegar), some quando o launcher/caixa já está aberto para não duplicar.
 */
export function BotaoGlobal() {
  const { aberto, caixa } = useLauncher()
  if (aberto || caixa) return null
  return (
    <button
      onClick={() => abrirLauncher('grade')}
      aria-label="Captura rápida"
      title="Captura rápida"
      className="lume-pop fixed bottom-5 right-5 z-40 flex size-14 items-center justify-center rounded-full bg-ink text-surface shadow-lg transition-transform active:scale-95"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
    >
      <IconMais width={26} height={26} />
    </button>
  )
}
