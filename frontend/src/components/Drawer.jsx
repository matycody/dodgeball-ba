import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { X, LogOut, LogIn, Info } from 'lucide-react'
import { tourKeyFor, startTour } from '../lib/tours'
import { useAuthStore } from '../stores/authStore'
import UserAvatar from './UserAvatar'
import PersonName from './PersonName'
import { ITEMS, SECTIONS, REPORTAR, generalFor, roleLabel, navEnd } from '../lib/navConfig'
import { useMenuPrefs, sortKeys } from '../stores/menuPrefsStore'

function Item({ to, label, Icon, soon, badge, onClose }) {
  return (
    <NavLink
      to={to}
      end={navEnd(to)}
      onClick={onClose}
      className={({ isActive }) =>
        'flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-semibold ' +
        'relative z-10 ' + (isActive ? 'text-accent' : 'text-fg')
      }
    >
      <Icon size={20} className="shrink-0" />
      <span className="flex-1">{label}</span>
      {badge > 0 && <span className="grid min-w-6 place-items-center rounded-full bg-danger px-1.5 text-[11px] font-extrabold text-white">{badge}</span>}
      {soon && <span className="text-[10px] font-bold uppercase text-muted">Próximamente</span>}
    </NavLink>
  )
}

function Title({ children }) {
  return <p className="mb-1 mt-5 px-3 text-[11px] font-bold uppercase tracking-widest text-accent">{children}</p>
}

// Gesto del menú lateral (solo con el dedo): el panel sigue al dedo. Se abre deslizando desde el borde izquierdo y se cierra deslizando
// hacia la izquierda; al soltar se queda en el lado más cercano (o según la velocidad). Se manipula el DOM directo para que sea fluido.
function useDrawerSwipe({ open, onOpen, onClose, panel, veil }) {
  const st = useRef({ mode: null, x0: 0, y0: 0, w: 0, p: 0, t0: 0, x1: 0, t1: 0 })
  const cb = useRef({ open, onOpen, onClose })
  cb.current = { open, onOpen, onClose }

  useEffect(() => {
    const paint = (p, anim) => {
      const a = panel.current, v = veil.current
      if (!a || !v) return
      a.style.transition = anim ? '' : 'none'
      v.style.transition = anim ? '' : 'none'
      a.style.transform = 'translateX(' + (p - 1) * 100 + '%)'
      v.style.opacity = String(p)
    }
    const release = (finalP) => {
      // deja el estado final inline hasta que React aplique las clases, así no hay salto
      paint(finalP, true)
      setTimeout(() => {
        const a = panel.current, v = veil.current
        if (a) { a.style.transform = ''; a.style.transition = '' }
        if (v) { v.style.opacity = ''; v.style.transition = '' }
      }, 340)
    }
    const start = (e) => {
      if (e.touches.length !== 1) return
      const t = e.touches[0]
      const { open: isOpen } = cb.current
      const w = panel.current ? panel.current.getBoundingClientRect().width : 0
      let mode = null
      if (isOpen) mode = 'close'
      else if (t.clientX <= 22 && !e.target.closest?.('[data-tour="bottomnav"]')) mode = 'open'
      st.current = { mode, x0: t.clientX, y0: t.clientY, w, p: isOpen ? 1 : 0, t0: Date.now(), x1: t.clientX, t1: Date.now(), on: false }
    }
    const move = (e) => {
      const s = st.current
      if (!s.mode) return
      const t = e.touches[0]
      const dx = t.clientX - s.x0, dy = t.clientY - s.y0
      if (!s.on) {
        if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.5) return
        if ((s.mode === 'open' && dx < 0) || (s.mode === 'close' && dx > 0)) { s.mode = null; return }
        s.on = true
      }
      s.x1 = t.clientX; s.t1 = Date.now()
      const base = s.mode === 'close' ? 1 : 0
      s.p = Math.min(1, Math.max(0, base + dx / (s.w || 320)))
      paint(s.p, false)
    }
    const end = () => {
      const s = st.current
      if (!s.mode || !s.on) { s.mode = null; return }
      const v = (s.x1 - s.x0) / Math.max(1, s.t1 - s.t0) // px/ms
      const wantOpen = Math.abs(v) > 0.5 ? v > 0 : s.p > 0.5
      s.mode = null; s.on = false
      release(wantOpen ? 1 : 0)
      if (wantOpen && !cb.current.open) cb.current.onOpen?.()
      if (!wantOpen && cb.current.open) cb.current.onClose()
    }
    window.addEventListener('touchstart', start, { passive: true })
    window.addEventListener('touchmove', move, { passive: true })
    window.addEventListener('touchend', end, { passive: true })
    window.addEventListener('touchcancel', end, { passive: true })
    return () => {
      window.removeEventListener('touchstart', start)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', end)
      window.removeEventListener('touchcancel', end)
    }
  }, [panel, veil])
}

export default function Drawer({ open, onClose, onOpen }) {
  const panel = useRef(null)
  const veil = useRef(null)
  useDrawerSwipe({ open, onOpen, onClose, panel, veil })
  const navRef = useRef(null)
  const [pill, setPill] = useState({ y: 0, h: 0, show: false, anim: false })
  const aim = (el, anim = true) => {
    if (!el || !navRef.current) return setPill((p) => ({ ...p, show: false, anim: false }))
    setPill({ y: el.offsetTop, h: el.offsetHeight, show: true, anim })
  }
  const { user, menu, signOut, profile } = useAuthStore()
  const order = useMenuPrefs((s) => s.byUser[user?.id]?.order)
  const { pathname } = useLocation()
  const tourKey = tourKeyFor(pathname)
  const [newReports, setNewReports] = useState(0)
  const isAdmin = menu.includes('reportes')
  // Reportes nuevos (burbuja): se consulta cada vez que se abre el menú
  useEffect(() => {
    if (!open || !isAdmin) return
    api('GET', '/reports/new-count').then((r) => setNewReports(r.count)).catch(() => {})
  }, [open, isAdmin])

  // La pastilla del ítem activo se desliza hasta la sección elegida (al tocar un ítem sale ya hacia ahí, mientras el menú se cierra)
  useLayoutEffect(() => {
    const el = navRef.current?.querySelector('a[aria-current="page"]')
    aim(el, pill.show) // la primera vez se ubica sin animar
  }, [pathname, open, menu, order, newReports]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={'fixed inset-0 z-40 ' + (open ? '' : 'pointer-events-none')}>
      <div
        ref={veil}
        onClick={onClose}
        className={'absolute inset-0 bg-black/20 transition-opacity ' + (open ? 'opacity-100' : 'opacity-0')}
      />
      <aside
        ref={panel}
        className={
          'absolute left-0 top-0 flex h-full w-80 max-w-[88%] flex-col sm:w-96 overflow-y-auto menu-glass-drawer px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)] ' +
          (open ? 'translate-x-0' : '-translate-x-full')
        }
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xl font-extrabold leading-tight">Dodgeball menú</p>
          </div>
          <button aria-label="Cerrar" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full border border-line bg-surface">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-2.5 rounded-2xl border border-line bg-surface p-3">
          <div className="flex items-center gap-3">
            <UserAvatar />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{user ? <PersonName p={profile} fallback={user.username ?? user.email} /> : 'Visitante'}</p>
              <p className="text-xs text-muted">{user ? 'Sesión iniciada' : 'Solo lectura'}</p>
            </div>
          </div>
          {user && (
            <div className="flex flex-wrap gap-1.5">
              {roleLabel(user, menu).split(' / ').map((r) => (
                <span key={r} className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase" style={{ color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 16%, transparent)' }}>{r}</span>
              ))}
            </div>
          )}
        </div>

        <nav
          ref={navRef}
          className="relative mt-3"
          onClick={(e) => { const a = e.target.closest?.('a'); if (a && navRef.current?.contains(a)) aim(a) }}
        >
          <span
            aria-hidden="true"
            className={'pointer-events-none absolute inset-x-0 top-0 z-0 rounded-xl bg-accent-soft' + (pill.anim ? ' drawer-pill' : '')}
            style={{ height: pill.h, transform: 'translateY(' + pill.y + 'px)', opacity: pill.show ? 1 : 0 }}
          />
          <Item {...ITEMS.home} label="Menú principal" onClose={onClose} />

          {SECTIONS.map((s) => {
            const keys = sortKeys(s.keys.filter((k) => menu.includes(k)), order?.[s.title])
            if (!keys.length) return null
            return (
              <div key={s.title}>
                <Title>{s.title}</Title>
                {keys.map((k) => <Item key={k} {...ITEMS[k]} badge={k === 'reportes' ? newReports : 0} onClose={onClose} />)}
              </div>
            )
          })}

          <Title>General</Title>
          {sortKeys(generalFor(menu, !!user).map((g) => g.to), order?.General).map((to) => <Item key={to} {...generalFor(menu, !!user).find((g) => g.to === to)} onClose={onClose} />)}
          {menu.includes('perfil') && <Item {...ITEMS.perfil} onClose={onClose} />}
        </nav>

        <div className="mt-auto border-t border-line pt-4">
          <Link to={REPORTAR.to} onClick={onClose} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-semibold text-fg">
            <REPORTAR.Icon size={20} /> {REPORTAR.label}
          </Link>
          {tourKey && (
            <button
              onClick={() => { onClose(); setTimeout(() => startTour(tourKey, user, menu), 250) }} // espera a que cierre el menú
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-semibold text-fg"
            >
              <Info size={20} /> Ver tutorial de esta pantalla
            </button>
          )}
          {user ? (
            <button
              onClick={() => { onClose(); signOut() }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-semibold text-danger"
            >
              <LogOut size={20} /> Cerrar sesión
            </button>
          ) : (
            <Link to="/login" onClick={onClose} className="flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-semibold text-accent">
              <LogIn size={20} /> Ingresar / Registrarse
            </Link>
          )}
        </div>
      </aside>
    </div>
  )
}




