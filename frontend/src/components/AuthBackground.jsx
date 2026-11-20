import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import ThemeSwitch from './ThemeSwitch'

// Escena de un partido visto desde arriba: cancha más chica, tribunas de escalones a los costados y puntitos (jugadores, árbitros, mesa y usuarios).
// Medidas en un lienzo de 800 de ancho; las posiciones de las personas son % de la cancha (puede salirse: árbitros, mesa y tribunas).
const COURT = { x: 130, y: 80, w: 540, h: 360 }
const px = (p) => COURT.x + (p * COURT.w) / 100
const py = (p) => COURT.y + (p * COURT.h) / 100
const PLAYERS = [[13, 11], [7, 25], [4, 40], [4, 58], [7, 74], [12, 87], [59, 12], [70, 23], [84, 40], [95, 62], [70, 78], [60, 91]]
const REFEREES = [[22, -4], [50, -4], [99, -4], [0, 104], [28, 104], [91, 104]] // pegados a la línea de la cancha
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

// Movimientos de cada jugador dentro de su mitad: se adelanta hacia la línea central, esquiva de costado y se retira hacia el fondo
const ROAM = PLAYERS.map(([x, y], i) => {
  const left = i < 6
  const bx = px(x), by = py(y)
  const minX = left ? COURT.x + 12 : 414
  const maxX = left ? 386 : COURT.x + COURT.w - 12
  const rel = (tx, ty) => [Math.round(clamp(tx, minX, maxX) - bx), Math.round(clamp(ty, COURT.y + 12, COURT.y + COURT.h - 12) - by)]
  const toLine = left ? maxX - 6 - rand() * 30 : minX + 6 + rand() * 30
  const back = left ? bx - 25 - rand() * 30 : bx + 25 + rand() * 30
  return {
    p: [
      rel(toLine, by + (rand() - 0.5) * 50),
      rel(bx + (rand() - 0.5) * 40, by + (rand() < 0.5 ? -1 : 1) * (35 + rand() * 40)),
      rel(back, by + (rand() - 0.5) * 60),
    ],
    dur: 6 + rand() * 4,
    delay: -rand() * 8,
  }
})

// Simulación del juego (en función del tiempo, así es continua y no depende de ningún estado): cada jugador recorre su mitad y las 6 pelotas
// pasan de mano en mano. La pelota la lleva un jugador delante suyo (hacia el rival), la tira y llega delante de un jugador del otro equipo; nunca vuela sola.
const PBASE = PLAYERS.map(([x, y]) => [px(x), py(y)])
const ease = (u) => u * u * (3 - 2 * u)
function playerPos(i, t) {
  const r = ROAM[i]
  const ph = ((((t - r.delay) / r.dur) % 1) + 1) % 1 * 4
  const k = Math.min(3, Math.floor(ph))
  const u = ease(ph - k)
  const W = [[0, 0], ...r.p, [0, 0]]
  return [PBASE[i][0] + W[k][0] + (W[k + 1][0] - W[k][0]) * u, PBASE[i][1] + W[k][1] + (W[k + 1][1] - W[k][1]) * u]
}
const front = (i, t) => {
  const [x, y] = playerPos(i, t)
  return [x + (i < 6 ? 8 : -8), y]
}
const BALLS = Array.from({ length: 6 }, (_, b) => {
  let acc = 0
  const steps = Array.from({ length: 6 }, (_, k) => {
    const team = (b + k) % 2 // el pase alterna entre equipos y, al ser par, cierra el ciclo
    const st = { h: team * 6 + Math.floor(rand() * 6), H: 1 + rand() * 1.4, F: 0.6 + rand() * 0.3, s: acc }
    acc += st.H + st.F
    return st
  })
  return { steps, L: acc, off: rand() * acc }
})
function ballPos(b, t) {
  const B = BALLS[b]
  const tau = (((t + B.off) % B.L) + B.L) % B.L
  let k = B.steps.length - 1
  while (B.steps[k].s > tau) k--
  const st = B.steps[k]
  const into = tau - st.s
  if (into < st.H) return [...front(st.h, t), 1] // la lleva el jugador
  const u = (into - st.H) / st.F
  const tr = t - (into - st.H) // instante del tiro
  const a = front(st.h, tr)
  const z = front(B.steps[(k + 1) % B.steps.length].h, tr + st.F) // llega delante del que la recibe
  const e = 1 - (1 - u) * (1 - u)
  return [a[0] + (z[0] - a[0]) * e, a[1] + (z[1] - a[1]) * e, 1 + 0.8 * Math.sin(Math.PI * u)] // más grande en el aire
}

// Gente de la tribuna: salta en ráfagas, cada uno a su ritmo. Árbitros: se balancean apenas, de lado a lado, casi sin notarse.
const JUMP = CROWD.map(() => ({ '--dur': 3 + rand() * 3.5 + 's', '--dl': -rand() * 6 + 's' }))
const SWAY = REFEREES.map(() => ({ '--dur': 3.5 + rand() * 2 + 's', '--dl': -rand() * 5 + 's', '--sw': 1.2 + rand() * 0.6 + 'px' }))

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

function Scene() {
  const root = useRef(null)
  useEffect(() => {
    const g = root.current
    if (!g) return undefined
    const players = [...g.querySelectorAll('[data-p]')]
    const balls = [...g.querySelectorAll('[data-b]')]
    const svg = g.ownerSVGElement
    const update = (t) => {
      players.forEach((el, i) => {
        const [x, y] = playerPos(i, t)
        el.setAttribute('transform', 'translate(' + (x - PBASE[i][0]).toFixed(1) + ' ' + (y - PBASE[i][1]).toFixed(1) + ')')
      })
      balls.forEach((el, i) => {
        const [x, y, sc] = ballPos(i, t)
        el.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + sc.toFixed(2) + ')')
      })
    }
    update(0)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    let raf
    const frame = (now) => {
      if (svg.getClientRects().length > 0) update(now / 1000) // la versión oculta (horizontal o vertical) no se calcula
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])
  const dot = (cx, cy, i, key, extra) => (
    <g key={key + i} className="e-fadein" style={{ '--d': 1500 + i * 28 + 'ms' }}>
      <circle {...extra} cx={cx} cy={cy} r="4" fill="currentColor" />
    </g>
  )
  return (
    <g ref={root}>
      <g className="text-fg" opacity="0.3">
        <Stand x0={14} dir={1} />
        <Stand x0={686} dir={-1} />
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.6">
          <rect className="e-draw" pathLength="1" x={COURT.x} y={COURT.y} width={COURT.w} height={COURT.h} rx="4" />
          <line className="e-draw" pathLength="1" style={{ '--d': '345ms' }} x1="400" y1={COURT.y} x2="400" y2={COURT.y + COURT.h} />
          <line className="e-fadein" style={{ '--d': '1265ms' }} x1="265" y1={COURT.y} x2="265" y2={COURT.y + COURT.h} strokeDasharray="6 7" strokeOpacity="0.4" />
          <line className="e-fadein" style={{ '--d': '1495ms' }} x1="535" y1={COURT.y} x2="535" y2={COURT.y + COURT.h} strokeDasharray="6 7" strokeOpacity="0.4" />
        </g>
      </g>
      {/* Los puntitos llevan el color de acento (el del rol o el que eligió la persona) para distinguirse de la cancha */}
      <g className="text-accent" opacity="0.85">
        {PLAYERS.map(([x, y], i) => dot(px(x), py(y), i, 'p', { 'data-p': i }))}
        {REFEREES.map(([x, y], i) => dot(px(x), py(y), i + 12, 'r', { className: 'e-sway', style: SWAY[i] }))}
        {CROWD.map(([x, y], i) => dot(x, y, i + 18, 'f', { className: 'e-jump', style: JUMP[i] }))}
        {/* Mesa centrada con sus dos designados debajo */}
        <g className="e-fadein" style={{ '--d': '2900ms' }}>
          <rect x={TABLE.x - 15} y={TABLE.y - 5} width="30" height="10" rx="3" fill="currentColor" />
          <circle cx={TABLE.x - 8} cy={TABLE.y + 13} r="4" fill="currentColor" />
          <circle cx={TABLE.x + 8} cy={TABLE.y + 13} r="4" fill="currentColor" />
        </g>
      </g>
      <g className="text-fg" opacity="0.95">
        {BALLS.map((_, i) => (
          <g key={'b' + i} className="e-fadein" style={{ '--d': 2300 + i * 90 + 'ms' }}>
            <circle data-b={i} cx="0" cy="0" r="3.2" fill="#ffffff" stroke="currentColor" strokeOpacity="0.55" strokeWidth="0.8" />
          </g>
        ))}
      </g>
    </g>
  )
}

// Fondo propio de las pantallas de entrada (bienvenida e ingreso): color del tema, línea de luz arriba y la escena de un partido muy tenue.
// Saca la imagen de fondo general (con el DBA gigante) mientras está montado, para que no choque con los textos.
export default function AuthBackground() {
  useEffect(() => {
    document.documentElement.classList.add('plain-bg')
    return () => document.documentElement.classList.remove('plain-bg')
  }, [])
  return (
    <div aria-hidden className="auth-vignette pointer-events-none fixed inset-0 z-[-1] overflow-hidden">
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
