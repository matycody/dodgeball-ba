import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import ThemeSwitch from './ThemeSwitch'

// Cancha vista desde arriba, a pantalla completa: borde, línea central y las dos líneas de ataque (punteadas), y dos rayos de luz que recorren el borde.
// Se dibuja con porcentajes para ocupar todo el espacio sin deformar el trazo. Horizontal en pantallas anchas; vertical (línea central horizontal) en celular.
// Sin tribunas ni personas. Se dibuja de a poco al cargar y queda quieta.
function Court({ vertical }) {
  const ln = (p, extra) => (vertical
    ? <line x1="0" x2="100%" y1={p} y2={p} {...extra} />
    : <line y1="0" y2="100%" x1={p} x2={p} {...extra} />)
  return (
    <>
      <g className="text-fg" fill="none" stroke="currentColor" strokeLinecap="round">
        <rect className="e-draw" pathLength="1" x="0" y="0" width="100%" height="100%" rx="10" strokeWidth="2.5" strokeOpacity="0.45" />
        {ln('50%', { className: 'e-draw', pathLength: 1, style: { '--d': '345ms' }, strokeWidth: 2.5, strokeOpacity: 0.45 })}
        {ln('25%', { className: 'e-fadein', style: { '--d': '1265ms' }, strokeWidth: 2, strokeDasharray: '10 10', strokeOpacity: 0.3 })}
        {ln('75%', { className: 'e-fadein', style: { '--d': '1495ms' }, strokeWidth: 2, strokeDasharray: '10 10', strokeOpacity: 0.3 })}
      </g>
      {/* Dos rayos de luz del acento que recorren el borde sin parar, en paralelo y a media vuelta uno del otro (ciclo de 8 s: el segundo arranca 4 s después). Cada uno: cola tenue, brillo y núcleo */}
      <g className="text-accent" fill="none" stroke="currentColor" strokeLinecap="round">
        {[0, -4].map((off) => (
          <g key={off}>
            <rect className="e-orbit" pathLength="1" style={{ '--len': 0.3, '--dl': off + 's' }} x="0" y="0" width="100%" height="100%" rx="10" strokeWidth="2.5" strokeOpacity="0.28" />
            <rect className="e-orbit" pathLength="1" style={{ '--len': 0.08, '--dl': off - 1.5 + 's', filter: 'blur(4px)' }} x="0" y="0" width="100%" height="100%" rx="10" strokeWidth="8" strokeOpacity="0.8" />
            <rect className="e-orbit" pathLength="1" style={{ '--len': 0.08, '--dl': off - 1.5 + 's' }} x="0" y="0" width="100%" height="100%" rx="10" strokeWidth="3" />
          </g>
        ))}
      </g>
    </>
  )
}

// Fondo propio de las pantallas de entrada (bienvenida e ingreso) y del modo visitante: color del tema, línea de luz arriba y la cancha muy tenue.
// Saca la imagen de fondo general (con el DBA gigante) mientras está montado, para que no choque con los textos.
export default function AuthBackground({ still = false, compact = false }) { // still: sin animaciones (pantallas de operación del partido)
  useEffect(() => {
    document.documentElement.classList.add('plain-bg')
    return () => document.documentElement.classList.remove('plain-bg')
  }, [])
  return (
    <div aria-hidden className={'auth-vignette pointer-events-none fixed inset-x-0 top-0 z-[-1] h-[100lvh] overflow-hidden' + (still ? ' court-still' : '')}>
      {/* La cancha deja libre la cabecera arriba y la barra de abajo */}
      <div className={compact
        ? 'absolute inset-x-12 bottom-[calc(8rem+env(safe-area-inset-bottom))] top-[calc(8rem+env(safe-area-inset-top))] opacity-70 md:inset-x-[26%] md:bottom-32 md:top-32'
        : 'absolute inset-x-6 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] top-[calc(6rem+env(safe-area-inset-top))] md:inset-x-[12%] md:bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:top-24'}>
        <svg className="auth-land block h-full w-full overflow-visible"><Court /></svg>
        <svg className="auth-port block h-full w-full overflow-visible"><Court vertical /></svg>
      </div>
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
