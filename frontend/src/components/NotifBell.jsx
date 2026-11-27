import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useNotifStore } from '../stores/notifStore'

const ago = (iso) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000))
  if (m < 1) return 'ahora'
  if (m < 60) return 'hace ' + m + ' min'
  const h = Math.round(m / 60)
  if (h < 24) return 'hace ' + h + ' h'
  return 'hace ' + Math.round(h / 24) + ' d'
}

// Campana del encabezado: puntito rojo con el número de avisos sin leer. Sin animaciones (también se usa en pantallas de operación).
export default function NotifBell() {
  const user = useAuthStore((s) => s.user)
  const { items, unread, load, clear, wire, markRead, markAll } = useNotifStore()
  const [open, setOpen] = useState(false)
  const [top, setTop] = useState(72)
  const navigate = useNavigate()
  const uid = user?.id

  useEffect(() => {
    if (!uid) { clear(); return }
    wire()
    load()
  }, [uid, wire, load, clear])

  // Número de avisos en la pestaña del navegador
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, '')
    document.title = unread ? '(' + unread + ') ' + base : base
  }, [unread])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!user) return null

  const go = (n) => {
    markRead(n.id)
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  const host = document.querySelector('[data-role]') ?? document.body
  const panel = open && createPortal(
    <div className="fixed inset-0 z-[80]" onClick={() => setOpen(false)}>
      <div className="relative mx-auto h-full max-w-2xl"> {/* mismo ancho que la app: el panel queda dentro del cuadro */}
      <div
        role="dialog"
        aria-label="Notificaciones"
        onClick={(e) => e.stopPropagation()}
        style={{ top, maxHeight: 'calc(100dvh - ' + top + 'px - 5.5rem)' }}
        className="absolute left-3 right-3 flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl sm:left-auto sm:w-96"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="font-extrabold">Notificaciones</p>
          {unread > 0 && (
            <button type="button" onClick={markAll} className="inline-flex items-center gap-1 text-xs font-bold text-accent">
              <CheckCheck size={14} /> Marcar todo leído
            </button>
          )}
        </div>
        <div className="overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">No tenés notificaciones.</p>
          ) : items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => go(n)}
              className={'flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left last:border-0 active:bg-surface-2 ' + (n.readAt ? '' : 'bg-accent/5')}
            >
              <span className={'mt-1.5 h-2 w-2 shrink-0 rounded-full ' + (n.readAt ? 'bg-transparent' : 'bg-red-500')} />
              <span className="min-w-0 flex-1">
                <span className={'block text-sm ' + (n.readAt ? 'font-semibold' : 'font-extrabold')}>{n.title}</span>
                {n.body && <span className="mt-0.5 block text-sm text-muted">{n.body}</span>}
                <span className="mt-1 block text-xs text-muted">{ago(n.createdAt)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      </div>
    </div>,
    host,
  )

  return (
    <>
      <button
        type="button"
        aria-label={unread ? 'Notificaciones, ' + unread + ' sin leer' : 'Notificaciones'}
        onClick={() => {
          // el panel arranca justo debajo del encabezado (mide su alto real, con la barra del celular incluida)
          const h = document.querySelector('header')
          if (h) setTop(Math.round(h.getBoundingClientRect().bottom) + 8)
          setOpen((o) => !o)
        }}
        className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-surface sm:h-11 sm:w-11"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold leading-none text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {panel}
    </>
  )
}
