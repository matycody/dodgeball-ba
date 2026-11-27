// Avisos push (se importa dentro del service worker principal de la PWA)
self.addEventListener('push', (event) => {
  let d = {}
  try { d = event.data ? event.data.json() : {} } catch { d = { title: 'Dodgeball BA', body: event.data ? event.data.text() : '' } }
  event.waitUntil(self.registration.showNotification(d.title || 'Dodgeball BA', {
    body: d.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: d.tag || undefined,
    data: { url: d.url || '/' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of all) {
      if ('focus' in c) {
        await c.focus()
        if ('navigate' in c) { try { await c.navigate(url) } catch { /* otra origen */ } }
        return
      }
    }
    await self.clients.openWindow(url)
  })())
})
