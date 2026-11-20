import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

// Fondo propio de las pantallas de entrada (bienvenida e ingreso): color del tema, resplandor del acento y líneas de cancha muy tenues.
// Saca la imagen de fondo general (con el DBA gigante) mientras está montado, para que no choque con los textos.
export default function AuthBackground() {
  useEffect(() => {
    document.documentElement.classList.add('plain-bg')
    return () => document.documentElement.classList.remove('plain-bg')
  }, [])
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden"
      style={{ background: 'radial-gradient(60% 55% at 78% 45%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%), radial-gradient(45% 45% at 12% 85%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 70%), var(--bg)' }}>
      <div className="e-glow absolute inset-0" style={{ background: 'radial-gradient(48% 45% at 78% 45%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 72%)' }} />
      <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" className="relative h-full w-full text-accent" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.14">
        <rect className="e-draw" pathLength="1" x="140" y="110" width="920" height="580" rx="14" />
        <line className="e-draw" pathLength="1" style={{ '--d': '345ms' }} x1="600" y1="110" x2="600" y2="690" />
        <line className="e-fadein" style={{ '--d': '1265ms' }} x1="373" y1="110" x2="373" y2="690" strokeDasharray="10 12" />
        <line className="e-fadein" style={{ '--d': '1495ms' }} x1="827" y1="110" x2="827" y2="690" strokeDasharray="10 12" />
        <circle className="e-draw" pathLength="1" style={{ '--d': '805ms' }} cx="600" cy="400" r="70" />
        <circle className="e-fadein" style={{ '--d': '1955ms' }} cx="600" cy="400" r="4" fill="currentColor" />
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
    </>
  )
}
