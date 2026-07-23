import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Servido em https://lume.matheuscmelo.com.br/ (domínio próprio via Cloudflare + GitHub Pages)
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt': a nova versão fica em espera e o app avisa o usuário, em vez
      // de recarregar sozinho (que podia interromper uma edição em andamento).
      registerType: 'prompt',
      includeAssets: ['favicon-32.png', 'favicon-96.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Lume',
        short_name: 'Lume',
        description: 'Seu espaço minimalista para organizar todas as áreas da vida.',
        lang: 'pt-BR',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // Injeta os handlers de push/clique no service worker gerado.
        importScripts: ['push-sw.js'],
      },
    }),
  ],
})
