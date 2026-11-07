// Datos que acompañan a un reporte de problema: pantalla anterior y últimos errores de la consola.
// Se instala una sola vez al arrancar la app; no guarda nada fuera de la memoria de la pestaña.
const MAX_ERRORS = 5
const errors = []
let lastPath = '/'
let installed = false

const push = (msg) => {
  errors.push(String(msg).slice(0, 300))
  if (errors.length > MAX_ERRORS) errors.shift()
}

function track() {
  const p = window.location.pathname + window.location.search
  if (!window.location.pathname.startsWith('/reportar')) lastPath = p
}

export function installReportContext() {
  if (installed || typeof window === 'undefined') return
  installed = true
  track()
  for (const fn of ['pushState', 'replaceState']) {
    const orig = window.history[fn]
    window.history[fn] = function patched(...args) {
      const r = orig.apply(this, args)
      track()
      return r
    }
  }
  window.addEventListener('popstate', track)
  window.addEventListener('error', (e) => push(e.message || 'error'))
  window.addEventListener('unhandledrejection', (e) => push('Promesa rechazada: ' + (e.reason?.message || e.reason || '')))
  const orig = console.error
  console.error = (...args) => {
    try { push(args.map((a) => (a instanceof Error ? a.message : typeof a === 'string' ? a : JSON.stringify(a))).join(' ')) } catch { /* ignorar */ }
    orig.apply(console, args)
  }
}

export const getReportContext = () => ({
  page: lastPath,
  viewport: window.innerWidth + 'x' + window.innerHeight,
  consoleErrors: [...errors],
})
