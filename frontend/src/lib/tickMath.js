// Cuenta del reloj en el cliente para los segundos en que el servidor no manda tick (SPECTATOR_TICK_SECONDS > 1).
// Sin dependencias: se puede probar solo. Los tiempos llegan como "M:SS".

export const toSec = (t) => {
  const [m, s] = String(t ?? '0:00').split(':').map(Number)
  return (Number.isFinite(m) ? m : 0) * 60 + (Number.isFinite(s) ? s : 0)
}

export const fmt = (total) => {
  const n = Math.max(0, Math.floor(total))
  return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0')
}

// ¿Hay algún reloj corriendo (y todavía sin llegar a 0)?
export function isRunning(p) {
  if (!p) return false
  return (!p.isMatchPaused && toSec(p.matchTime) > 0) || (!p.isSetPaused && toSec(p.setTime) > 0) || (!!p.isTimeoutRunning && toSec(p.timeoutTime) > 0)
}

// El mismo tick, como estaría k segundos después (los relojes en pausa no se mueven; nunca baja de 0:00)
export function advanceTick(p, k) {
  if (!p || k <= 0) return p
  const out = { ...p }
  if (!p.isMatchPaused && toSec(p.matchTime) > 0) {
    out.matchTime = fmt(toSec(p.matchTime) - k)
    // Las sanciones corren solo mientras corre el partido
    out.sanctions = (p.sanctions || []).map((x) => {
      const left = Math.max(0, (x.left ?? 0) - k)
      return { ...x, left, time: fmt(left) }
    })
  }
  if (!p.isSetPaused && toSec(p.setTime) > 0) out.setTime = fmt(toSec(p.setTime) - k)
  if (p.isTimeoutRunning && toSec(p.timeoutTime) > 0) out.timeoutTime = fmt(toSec(p.timeoutTime) - k)
  return out
}

const MAX_SYNTH_S = 30 // sin ticks reales durante tanto tiempo, se deja de contar (algo anda mal: mejor no inventar)

// Qué tick intermedio corresponde mostrar ahora, o null si no hace falta.
// entry = { p: último tick real, at: cuándo llegó, gap: ms entre los dos últimos ticks reales (0 si no se sabe) }
export function nextSynthetic(entry, now) {
  if (!entry || !isRunning(entry.p)) return null
  const k = Math.floor((now - entry.at) / 1000)
  if (k < 1 || k > MAX_SYNTH_S) return null
  // Si el servidor manda un tick por segundo no hace falta contar: solo si ya pasó claramente la espera normal
  const sparse = entry.gap > 1500
  if (!sparse && k < 2) return null
  return advanceTick(entry.p, k)
}

export const SYNTH_MAX_AGE_S = MAX_SYNTH_S
