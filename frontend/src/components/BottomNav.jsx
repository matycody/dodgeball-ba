import { NavLink, matchPath, useLocation } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { ITEMS, BOTTOM_PRIORITY, NOTICIAS, navEnd } from '../lib/navConfig'

// Organizador: Inicio, Noticias, Mis asignaciones (al medio), Dashboard y Partidos
const ADMIN_ORDER = ['asignaciones', 'dashboard_canchas', 'partidos']

export function bottomItems(user, menu = []) {
  const isAdmin = !!user?.roles?.includes('ADMIN')
  return user
    ? [ITEMS.home, NOTICIAS, ...BOTTOM_PRIORITY.filter((k) => k !== 'home' && menu.includes(k) && ITEMS[k] && (!isAdmin || k === 'dashboard_canchas' || k === 'partidos' || k === 'asignaciones')).slice(0, isAdmin ? 3 : 2).sort((a, b) => (isAdmin ? ADMIN_ORDER.indexOf(a) - ADMIN_ORDER.indexOf(b) : 0)).map((k) => ITEMS[k]), ...(isAdmin ? [] : [ITEMS.perfil])]
    : [ITEMS.home, NOTICIAS, { to: '/login', label: 'Ingresar', Icon: LogIn }]
}

export default function BottomNav() {
  const { user, menu } = useAuthStore()
  const items = bottomItems(user, menu)
  const { pathname } = useLocation()
  const active = items.findIndex((it) => matchPath({ path: it.to, end: navEnd(it.to) }, pathname))

  return (
    <nav data-tour="bottomnav" className="fixed inset-x-0 bottom-0 z-30 border-t border-line menu-glass">
      <div className="relative mx-auto grid max-w-2xl pb-[env(safe-area-inset-bottom)]" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {/* Pastilla que se desliza hasta el ítem activo */}
        <span aria-hidden="true" className="m-pill pointer-events-none absolute bottom-[calc(0.4rem+env(safe-area-inset-bottom))] left-0 top-1.5 flex justify-center" style={{ width: 100 / items.length + '%', transform: 'translateX(' + Math.max(active, 0) * 100 + '%)', opacity: active < 0 ? 0 : 1 }}>
          <span className="w-16 rounded-2xl bg-accent-soft" />
        </span>
        {items.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={navEnd(to)}
            className={({ isActive }) =>
              'relative z-10 flex min-w-0 flex-col items-center justify-start gap-1 px-0.5 py-2.5 text-center text-[11px] font-semibold leading-tight ' +
              (isActive ? 'text-accent' : 'text-muted')
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} className={isActive ? 'm-pop' : ''} />
                <span className="line-clamp-2 w-full break-words">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
