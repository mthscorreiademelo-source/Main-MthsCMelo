/* eslint-disable */
/**
 * Handlers de push do Lume, importados pelo service worker gerado (workbox).
 * Mostra a notificação recebida e, ao clicar, foca/abre o app na tela indicada.
 * Mantido em JS puro e sem dependências — roda no contexto do service worker.
 */
self.addEventListener('push', (event) => {
  let dados = {}
  try {
    dados = event.data ? event.data.json() : {}
  } catch (_e) {
    dados = { title: 'Lume', body: event.data ? event.data.text() : '' }
  }
  const titulo = dados.title || 'Lume'
  const opcoes = {
    body: dados.body || '',
    icon: dados.icon || 'pwa-192.png',
    badge: dados.badge || 'favicon-96.png',
    tag: dados.tag || 'lume',
    renotify: !!dados.tag,
    data: { url: dados.url || './' },
    vibrate: [80, 40, 80],
  }
  event.waitUntil(self.registration.showNotification(titulo, opcoes))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const destino = (event.notification.data && event.notification.data.url) || './'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientes) => {
      for (const c of clientes) {
        if ('focus' in c) {
          if ('navigate' in c && destino !== './') c.navigate(destino).catch(() => {})
          return c.focus()
        }
      }
      return self.clients.openWindow(destino)
    }),
  )
})
