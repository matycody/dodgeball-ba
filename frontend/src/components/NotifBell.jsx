import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Settings } from 'lucide-react'
import NotifItem, { groupByDay } from './NotifItem'
import { useAuthStore } from '../stores/authStore'
import { useNotifStore } from '../stores/notifStore'

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

  const groups = groupByDay(items)

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
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <p className="text-lg font-extrabold">Notificaciones</p>
          {unread > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-extrabold leading-none text-white">{unread}</span>}
          <span className="flex-1" />
          {unread > 0 && (
            <button type="button" onClick={markAll} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs font-bold text-accent active:opacity-70">
              <CheckCheck size={14} /> Marcar leído
            </button>
          )}
        </div>
        <div className="overflow-y-auto overscroll-contain">
          {items.length === 0 ? (
            <div className="grid place-items-center gap-2 px-6 py-10 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-surface-2 text-muted"><Bell size={26} /></span>
              <p className="font-bold">Todo al día</p>
              <p className="text-sm text-muted">Acá vas a ver tus asignaciones, cambios de partidos y avisos de la organización.</p>
            </div>
          ) : groups.map(([label, list]) => (
            <div key={label}>
              <p className="sticky top-0 bg-surface-2 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-muted">{label}</p>
              {list.map((n) => <NotifItem key={n.id} n={n} onOpen={go} />)}
            </div>
          ))}
        </div>
        <Link to="/notificaciones" onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 border-t border-line bg-surface-2 px-4 py-3 text-sm font-bold text-accent active:opacity-70">
          <Settings size={15} /> Ver todas y ajustes
        </Link>
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
