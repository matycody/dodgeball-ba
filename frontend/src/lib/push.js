import { api } from './api'

// Push fuera de la web: se activa por dispositivo (cada navegador o PWA se suscribe por separado)
export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

// iPhone/iPad: el push solo funciona con la web instalada en la pantalla de inicio
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true

const b64ToBytes = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

const getReg = () => navigator.serviceWorker.ready

export async function currentSubscription() {
  if (!pushSupported()) return null
  try { return await (await getReg()).pushManager.getSubscription() } catch { return null }
}

export async function enablePush() {
  const cfg = await api('GET', '/notifications/push/config')
  if (!cfg.enabled || !cfg.publicKey) throw new Error('Las notificaciones fuera de la web todavía no están activas.')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('El navegador no dio permiso. Habilitalo en los ajustes del sitio.')
  const reg = await getReg()
  const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(cfg.publicKey) })
  await api('POST', '/notifications/push/subscribe', sub.toJSON())
}

export async function disablePush() {
  const sub = await currentSubscription()
  if (!sub) return
  await api('POST', '/notifications/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {})
  await sub.unsubscribe().catch(() => {})
}
