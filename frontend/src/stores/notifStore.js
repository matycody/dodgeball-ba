import { create } from 'zustand'
import { api } from '../lib/api'
import { socket } from '../sockets/socket'

// Avisos de la campana: se cargan al entrar y llegan en vivo por el socket (sala propia de la cuenta)
let wired = false

export const useNotifStore = create((set, get) => ({
  items: [],
  unread: 0,

  load: async () => {
    try {
      const r = await api('GET', '/notifications')
      set({ items: r.items ?? [], unread: r.unread ?? 0 })
    } catch { /* sin conexión: queda lo que había */ }
  },

  clear: () => set({ items: [], unread: 0 }),

  markRead: (id) => {
    const n = get().items.find((x) => x.id === id)
    if (!n || n.readAt) return
    set((s) => ({ items: s.items.map((x) => (x.id === id ? { ...x, readAt: new Date().toISOString() } : x)), unread: Math.max(0, s.unread - 1) }))
    api('POST', '/notifications/' + id + '/read').catch(() => {})
  },

  markAll: () => {
    if (!get().unread) return
    set((s) => ({ items: s.items.map((x) => (x.readAt ? x : { ...x, readAt: new Date().toISOString() })), unread: 0 }))
    api('POST', '/notifications/read-all').catch(() => {})
  },

  // Una sola vez: escucha avisos nuevos y recarga al reconectar (por si llegó alguno mientras estaba caído)
  wire: () => {
    if (wired) return
    wired = true
    socket.on('notif:new', (n) => {
      set((s) => (s.items.some((x) => x.id === n.id) ? s : { items: [n, ...s.items].slice(0, 50), unread: s.unread + 1 }))
    })
    socket.on('connect', () => get().load())
  },
}))
