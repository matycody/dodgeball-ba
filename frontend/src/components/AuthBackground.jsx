import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import ThemeSwitch from './ThemeSwitch'

// Escena de un partido visto desde arriba: cancha más chica, tribunas de escalones a los costados y puntitos (jugadores, árbitros, mesa y usuarios).
// Medidas en un lienzo de 800 de ancho; las posiciones de las personas son % de la cancha (puede salirse: árbitros, mesa y tribunas).
const COURT = { x: 130, y: 80, w: 540, h: 360 }
const px = (p) => COURT.x + (p * COURT.w) / 100
const py = (p) => COURT.y + (p * COURT.h) / 100
const PLAYERS = [[13, 11], [7, 25], [4, 40], [4, 58], [7, 74], [12, 87], [59, 12], [70, 23], [84, 40], [95, 62], [70, 78], [60, 91]]
const REFEREES = [[1, -4], [50, -4], [99, -4], [0, 104], [50, 104], [91, 104]] // pegados a la línea de la cancha
const TABLE = { x: 400, y: 468 } // la mesa va centrada abajo, cerca de la cancha, con sus dos designados debajo
const FANS = [[-15, 9], [-6, 27], [-19, 45], [-15, 76], [-6, 94], [116, 5], [107, 30], [107, 42], [112, 68], [118, 91]]

// Generador con semilla: el reparto "aleatorio" es siempre el mismo, así el fondo no cambia entre cargas
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = rng(2026)
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

// Gente sentada en los escalones de cada tribuna (25 por lado además de las ya ubicadas), sin encimarse
function seat(x0, fixed, count) {
  const taken = fixed.map(([x, y]) => [px(x), py(y)])
  const out = []
  for (let tries = 0; out.length < count && tries < 6000; tries++) {
    const x = x0 + (Math.floor(rand() * 7) + 0.5) * (100 / 7)
    const y = 82 + rand() * 356
    if ([...taken, ...out].every(([a, b]) => Math.hypot(a - x, b - y) >= 11)) out.push([x, y])
  }
  return out
}
const FANS_LEFT = FANS.filter(([x]) => x < 50)
const FANS_RIGHT = FANS.filter(([x]) => x > 50)
const CROWD = [...FANS.map(([x, y]) => [px(x), py(y)]), ...seat(14, FANS_LEFT, 25), ...seat(686, FANS_RIGHT, 25)]

// Escena quieta: cada jugador en una posición de juego (ni en su lugar base ni en línea), y las 6 pelotas en manos de jugadores, delante suyo (hacia el rival).
const SPREAD = PLAYERS.map(([x, y], i) => {
  const left = i < 6
  const dx = (left ? 1 : -1) * (6 + rand() * 22) // un poco adelantados hacia la línea central
  const dy = (rand() - 0.5) * 34
  return [clamp(px(x) + dx, COURT.x + 12, COURT.x + COURT.w - 12), clamp(py(y) + dy, COURT.y + 12, COURT.y + COURT.h - 12)]
})
const HOLDERS = [1, 3, 4, 7, 9, 11] // quién lleva cada pelota (3 por equipo)
const BALL_POS = HOLDERS.map((h) => [SPREAD[h][0] + (h < 6 ? 8 : -8), SPREAD[h][1]])

// Tribuna en 2D: escalones paralelos a la línea de banda, más claros cerca de la cancha
function Stand({ x0, dir }) {
  const n = 7, w = 100, top = 70, h = 380, sw = w / n
  return (
    <g className="e-fadein" style={{ '--d': '690ms' }}>
      {Array.from({ length: n }, (_, i) => {
        const near = dir > 0 ? i : n - 1 - i
        const x = x0 + i * sw
        return (
          <g key={i}>
            <rect x={x} y={top} width={sw} height={h} fill="currentColor" fillOpacity={0.12 + near * 0.05} />
            <line x1={dir > 0 ? x + sw : x} y1={top} x2={dir > 0 ? x + sw : x} y2={top + h} stroke="currentColor" strokeOpacity="0.5" strokeWidth="0.8" />
          </g>
        )
      })}
      <rect x={x0} y={top} width={w} height={h} rx="4" fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="0.8" />
    </g>
  )
}

function Scene({ stands = true }) {
  const dot = (cx, cy, i, key) => (
    <g key={key + i} className="e-fadein" style={{ '--d': 1500 + i * 28 + 'ms' }}>
      <circle cx={cx} cy={cy} r="4" fill="currentColor" />
    </g>
  )
  return (
    <g>
      <g className="text-fg" opacity="0.3">
        {stands && <Stand x0={14} dir={1} />}
        {stands && <Stand x0={686} dir={-1} />}
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.6">
          <rect className="e-draw" pathLength="1" x={COURT.x} y={COURT.y} width={COURT.w} height={COURT.h} rx="4" />
          <line className="e-draw" pathLength="1" style={{ '--d': '345ms' }} x1="400" y1={COURT.y} x2="400" y2={COURT.y + COURT.h} />
          <line className="e-fadein" style={{ '--d': '1265ms' }} x1="265" y1={COURT.y} x2="265" y2={COURT.y + COURT.h} strokeDasharray="6 7" strokeOpacity="0.4" />
          <line className="e-fadein" style={{ '--d': '1495ms' }} x1="535" y1={COURT.y} x2="535" y2={COURT.y + COURT.h} strokeDasharray="6 7" strokeOpacity="0.4" />
        </g>
      </g>
      {/* Los puntitos llevan el color de acento (el del rol o el que eligió la persona) para distinguirse de la cancha */}
      <g className="text-accent" opacity="0.85">
        {SPREAD.map(([x, y], i) => dot(x, y, i, 'p'))}
        {REFEREES.map(([x, y], i) => dot(px(x), py(y), i + 12, 'r'))}
        {stands && CROWD.map(([x, y], i) => dot(x, y, i + 18, 'f'))}
        {/* Mesa centrada con sus dos designados debajo */}
        <g className="e-fadein" style={{ '--d': '2900ms' }}>
          <rect x={TABLE.x - 15} y={TABLE.y - 5} width="30" height="10" rx="3" fill="currentColor" />
          <circle cx={TABLE.x - 8} cy={TABLE.y + 13} r="4" fill="currentColor" />
          <circle cx={TABLE.x + 8} cy={TABLE.y + 13} r="4" fill="currentColor" />
        </g>
      </g>
      <g className="text-fg" opacity="0.95">
        {BALL_POS.map(([x, y], i) => (
          <g key={'b' + i} className="e-fadein" style={{ '--d': 2300 + i * 90 + 'ms' }}>
            <circle cx={x} cy={y} r="3.2" fill="#ffffff" stroke="currentColor" strokeOpacity="0.55" strokeWidth="0.8" />
          </g>
        ))}
      </g>
    </g>
  )
}

// Fondo propio de las pantallas de entrada (bienvenida e ingreso): color del tema, línea de luz arriba y la escena de un partido muy tenue.
// Saca la imagen de fondo general (con el DBA gigante) mientras está montado, para que no choque con los textos.
export default function AuthBackground({ compact = false }) { // compact: en vertical (celular) sin tribunas, solo jugadores, árbitros y mesa
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
        <g transform="translate(516 0) rotate(90)"><Scene stands={!compact} /></g>
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
