import { useRef, useState } from 'react'
import { NavLink, matchPath, useLocation, useNavigate } from 'react-router-dom'
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

// swipe: en el celular se puede deslizar el dedo por la barra para pasar de una sección a otra (la pastilla sigue al dedo y al soltar
// se va a la sección más cercana). Solo con el dedo: con mouse no cambia nada. Se apaga en Control de mesa, árbitro y la organización,
// para que un roce no saque a nadie de un partido que está operando.
export default function BottomNav({ swipe = false }) {
  const { user, menu } = useAuthStore()
  const items = bottomItems(user, menu)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const active = items.findIndex((it) => matchPath({ path: it.to, end: navEnd(it.to) }, pathname))
  const n = items.length
  const box = useRef(null)
  const g = useRef({ x0: 0, y0: 0, start: 0, on: false, swiped: 0 })
  const [dragX, setDragX] = useState(null) // posición de la pastilla (px) mientras el dedo la arrastra
  const cell = () => (box.current ? box.current.getBoundingClientRect().width / n : 0)
  const preview = dragX == null ? active : Math.min(n - 1, Math.max(0, Math.round(dragX / (cell() || 1))))

  const onStart = (e) => {
    if (!swipe || n < 2) return
    const t = e.touches[0]
    g.current = { ...g.current, x0: t.clientX, y0: t.clientY, start: Math.max(active, 0) * cell(), on: false }
  }
  const onMove = (e) => {
    if (!swipe || n < 2) return
    const t = e.touches[0]
    const dx = t.clientX - g.current.x0
    const dy = t.clientY - g.current.y0
    if (!g.current.on) {
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.5) return // todavía no es un deslizamiento horizontal
      g.current.on = true
    }
    const max = (n - 1) * cell()
    setDragX(Math.min(max, Math.max(0, g.current.start + dx)))
  }
  const onEnd = () => {
    if (!g.current.on) return
    g.current.on = false
    g.current.swiped = Date.now() // el toque que sigue a un deslizamiento no debe abrir una sección
    const idx = preview
    setDragX(null)
    if (idx !== active && items[idx]) navigate(items[idx].to)
  }

  return (
    <nav data-tour="bottomnav" className="fixed inset-x-0 bottom-0 z-30 border-t border-line menu-glass" onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd} onTouchCancel={onEnd}>
      <div ref={box} className="relative mx-auto grid max-w-2xl pb-[env(safe-area-inset-bottom)]" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, touchAction: swipe ? 'pan-y' : undefined }}>
        {/* Pastilla del ítem activo: del ancho de la celda, así rodea el texto; sigue al dedo mientras se desliza */}
        <span
          aria-hidden="true"
          className={(dragX == null ? 'm-pill ' : '') + 'pointer-events-none absolute bottom-[calc(0.3rem+env(safe-area-inset-bottom))] left-0 top-1 px-1'}
          style={{ width: 100 / n + '%', transform: dragX == null ? 'translateX(' + Math.max(active, 0) * 100 + '%)' : 'translateX(' + dragX + 'px)', opacity: active < 0 && dragX == null ? 0 : 1 }}
        >
          <span className="block h-full w-full rounded-2xl bg-accent-soft" />
        </span>
        {items.map(({ to, label, Icon }, i) => (
          <NavLink
            key={to}
            to={to}
            end={navEnd(to)}
            onClick={(e) => { if (Date.now() - g.current.swiped < 400) e.preventDefault() }}
            className={({ isActive }) =>
              'relative z-10 flex min-w-0 flex-col items-center justify-start gap-1 px-1 py-2.5 text-center text-[11px] font-semibold leading-tight ' +
              ((dragX == null ? isActive : i === preview) ? 'text-accent' : 'text-muted')
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} className={isActive && dragX == null ? 'm-pop' : ''} />
                <span className="line-clamp-2 w-full break-words">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
