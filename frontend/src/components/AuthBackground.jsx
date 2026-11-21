import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import ThemeSwitch from './ThemeSwitch'

// Escena: solo la cancha, vista desde arriba (sin tribunas ni personas). Se dibuja de a poco al cargar y queda quieta.
// Medidas en un lienzo de 800 de ancho.
const COURT = { x: 130, y: 80, w: 540, h: 360 }

function Scene() {
  return (
    <g className="text-fg" opacity="0.3">
      <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.6">
        <rect className="e-draw" pathLength="1" x={COURT.x} y={COURT.y} width={COURT.w} height={COURT.h} rx="4" />
        <line className="e-draw" pathLength="1" style={{ '--d': '345ms' }} x1="400" y1={COURT.y} x2="400" y2={COURT.y + COURT.h} />
        <line className="e-fadein" style={{ '--d': '1265ms' }} x1="265" y1={COURT.y} x2="265" y2={COURT.y + COURT.h} strokeDasharray="6 7" strokeOpacity="0.4" />
        <line className="e-fadein" style={{ '--d': '1495ms' }} x1="535" y1={COURT.y} x2="535" y2={COURT.y + COURT.h} strokeDasharray="6 7" strokeOpacity="0.4" />
      </g>
    </g>
  )
}

// Fondo propio de las pantallas de entrada (bienvenida e ingreso): color del tema, línea de luz arriba y la cancha muy tenue.
// Saca la imagen de fondo general (con el DBA gigante) mientras está montado, para que no choque con los textos.
export default function AuthBackground() {
  useEffect(() => {
    document.documentElement.classList.add('plain-bg')
    return () => document.documentElement.classList.remove('plain-bg')
  }, [])
  return (
    <div aria-hidden className="auth-vignette pointer-events-none fixed inset-x-0 top-0 z-[-1] h-[100lvh] overflow-hidden">
      {/* Horizontal (pantallas anchas) y vertical (celular): la misma escena girada */}
      <svg viewBox="0 24 800 480" preserveAspectRatio="xMidYMid meet" className="auth-land h-full w-full">
        <Scene />
      </svg>
      <svg viewBox="0 -120 480 920" preserveAspectRatio="xMidYMid meet" className="auth-port h-full w-full">
        <g transform="translate(516 0) rotate(90)"><Scene /></g>
      </svg>
    </div>
  )
}

// Rutas de ingreso y registro: todas comparten el mismo fondo
export function AuthLayout() {
  const { pathname } = useLocation()
  return (
    <>
      <AuthBackground />
      {/* motion-ok: habilita las animaciones comunes de la app (listas escalonadas, botones que se comprimen); cada ruta entra con un fundido */}
      <div key={pathname} className="motion-ok e-page">
        <Outlet />
      </div>
      {/* Modo claro u oscuro desde el principio (la bienvenida de primer ingreso ya tiene "Omitir" arriba a la derecha) */}
      {pathname !== '/bienvenida' && (
        <div className="fixed right-4 top-[calc(0.75rem+env(safe-area-inset-top))] z-20"><ThemeSwitch /></div>
      )}
    </>
  )
}
