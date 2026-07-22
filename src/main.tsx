import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { sinalizarAtualizacao } from './core/pwa/atualizacao'

// Atualização do PWA em modo 'prompt': registra o service worker e checa por
// versões novas ao focar a aba e a cada 30 min. Quando há uma versão nova
// aguardando, avisamos o usuário (AvisoAtualizacao) em vez de recarregar
// sozinho — assim uma edição em andamento nunca é interrompida sem aviso.
const atualizarSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    sinalizarAtualizacao(() => void atualizarSW(true))
  },
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
