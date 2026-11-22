import { useEffect } from 'react'
import { useThemeStore } from '../stores/themeStore'

// Fondo "Escudo DBA" armado de a poco: primero el resplandor, después se dibujan los chevrones y los aros, y al final aparece el escudo.
// Es el mismo dibujo que fondo-base-* y fondo-escudo-*.svg (que siguen siendo el fondo de las pantallas de operación), pero por capas para poder animarlo.
const PALETTES = {
  azul: { from: '#040914', to: '#0a2a5a', glow: '#1aa7ff', glowOp: 0.55, line: '#2bb6ff', lineOp: 0.16, ring: '#4cc9ff', ring1: 0.55, ring2: 0.35, logo: '/escudo-color.png' },
  acero: { from: '#000000', to: '#0b0b0d', glow: '#ffffff', glowOp: 0.28, line: '#ffffff', lineOp: 0.16, ring: '#d0d0d0', ring1: 0.55, ring2: 0.35, logo: '/escudo-acero.png' },
  claro: { from: '#f3f8ff', to: '#c9ddf5', glow: '#6fb2ff', glowOp: 0.45, line: '#3b82e0', lineOp: 0.12, ring: '#2d6fd6', ring1: 0.4, ring2: 0.25, logo: '/escudo-color.png' },
}
const CHEVRONS = [
  'M-100 300 L250 800 L-100 1300', 'M-260 300 L90 800 L-260 1300', 'M1700 300 L1350 800 L1700 1300', 'M1860 300 L1510 800 L1860 1300',
  'M0 120 L800 40 L1600 120', 'M0 1480 L800 1560 L1600 1480',
]

export default function EscudoBackground() {
  const theme = useThemeStore((s) => s.theme)
  const skin = useThemeStore((s) => s.skin)
  const p = PALETTES[theme === 'light' ? 'claro' : skin === 'acero' ? 'acero' : 'azul']

  useEffect(() => {
    document.documentElement.classList.add('escudo-live') // saca la imagen fija del fondo mientras este fondo animado está montado
    return () => document.documentElement.classList.remove('escudo-live')
  }, [])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[-1] h-[100lvh] overflow-hidden">
      {/* Fondo (resplandor y chevrones): cubre toda la pantalla y se recorta si hace falta */}
      <svg viewBox="0 0 1600 1600" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="esc-g" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stopColor={p.from} /><stop offset="1" stopColor={p.to} /></linearGradient>
          <radialGradient id="esc-r" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor={p.glow} stopOpacity={p.glowOp} /><stop offset="1" stopColor={p.glow} stopOpacity="0" /></radialGradient>
        </defs>
        <rect width="1600" height="1600" fill="url(#esc-g)" />
        <circle className="e-fadein" style={{ '--d': '100ms' }} cx="800" cy="800" r="760" fill="url(#esc-r)" />
        <g fill="none" stroke={p.line} strokeWidth="10" strokeLinejoin="round" opacity={p.lineOp}>
          {CHEVRONS.map((d, i) => <path key={i} className="e-draw" pathLength="1" style={{ '--d': 300 + i * 180 + 'ms' }} d={d} />)}
        </g>
      </svg>
      {/* Aros y escudo: se ajustan para verse siempre completos (en el celular el ancho es lo que manda) */}
      <svg viewBox="400 400 800 800" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
        <circle className="e-draw" pathLength="1" style={{ '--d': '1300ms' }} cx="800" cy="800" r="338" fill="none" stroke={p.ring} strokeWidth="6" opacity={p.ring1} />
        <circle className="e-draw" pathLength="1" style={{ '--d': '1500ms' }} cx="800" cy="800" r="372" fill="none" stroke={p.ring} strokeWidth="3" opacity={p.ring2} />
        <image className="e-fadein" style={{ '--d': '1900ms' }} href={p.logo} x="480" y="480" width="640" height="640" />
      </svg>
    </div>
  )
}
