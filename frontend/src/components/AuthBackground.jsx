import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'

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
      <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" className="h-full w-full text-accent" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.14">
        <rect x="140" y="110" width="920" height="580" rx="14" />
        <line x1="600" y1="110" x2="600" y2="690" />
        <line x1="373" y1="110" x2="373" y2="690" strokeDasharray="10 12" />
        <line x1="827" y1="110" x2="827" y2="690" strokeDasharray="10 12" />
        <circle cx="600" cy="400" r="70" />
        <circle cx="600" cy="400" r="4" fill="currentColor" />
      </svg>
    </div>
  )
}

// Rutas de ingreso y registro: todas comparten el mismo fondo
export function AuthLayout() {
  return (
    <>
      <AuthBackground />
      <Outlet />
    </>
  )
}
