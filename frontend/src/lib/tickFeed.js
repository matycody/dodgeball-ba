import { socket } from '../sockets/socket'
import { nextSynthetic, SYNTH_MAX_AGE_S } from './tickMath'

// Un solo lugar escucha 'match:tick' y reparte a las pantallas, agregando los segundos intermedios cuando el servidor
// manda el reloj cada varios segundos (SPECTATOR_TICK_SECONDS). Con un tick por segundo, entrega exactamente lo que llega.
const subs = new Set()
const last = new Map() // matchId -> { p, at, gap }
let wired = false
let timer = null

function step() {
  const now = Date.now()
  for (const [id, e] of last) {
    if (now - e.at > SYNTH_MAX_AGE_S * 1000 + 2000) { last.delete(id); continue }
    if (!socket.connected) continue
    const q = nextSynthetic(e, now)
    if (q) subs.forEach((cb) => cb(q))
  }
  if (!last.size && timer) { clearInterval(timer); timer = null }
}

function wire() {
  if (wired) return
  wired = true
  socket.on('match:tick', (p) => {
    const now = Date.now()
    const prev = last.get(p.matchId)
    last.set(p.matchId, { p, at: now, gap: prev ? now - prev.at : 0 })
    subs.forEach((cb) => cb(p))
    if (!timer) timer = setInterval(step, 1000)
  })
}

// Escucha el reloj de los partidos (reales e intermedios). Devuelve la función para dejar de escuchar.
export function onMatchTick(cb) {
  wire()
  subs.add(cb)
  return () => subs.delete(cb)
}
