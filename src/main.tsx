import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

// Auto-atualização do PWA: registra o service worker e checa por versões novas
// ao carregar, ao focar a aba e a cada 30 min. Com registerType 'autoUpdate',
// o app recarrega sozinho assim que a nova versão é ativada — sem precisar
// limpar cache na mão.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    const checar = () => void registration.update().catch(() => {})
    window.addEventListener('focus', checar)
    setInterval(checar, 30 * 60 * 1000)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
