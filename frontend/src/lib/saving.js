import { create } from 'zustand'

// Pantalla de "Guardando" para operaciones lentas (armar jornada, crear torneos, fixture…).
// Solo aparece si la operación tarda más de SHOW_AFTER ms (las rápidas no parpadean). Los pasos son orientativos: avanzan por tiempo.
const SHOW_AFTER = 400
const STEP_MS = 2200
const DONE_MS = 700

export const useSaving = create(() => ({ open: false, title: '', sub: '', steps: [], step: 0, done: false }))
const set = useSaving.setState
let seq = 0

// withSaving({ title, sub?, steps?, doneTitle? }, async () => { ... }) -> devuelve lo que devuelva la función; si falla, cierra y relanza el error
export async function withSaving(opts, fn) {
  const id = ++seq
  const steps = opts.steps ?? []
  let tick = null
  const show = setTimeout(() => {
    set({ open: true, title: opts.title, sub: opts.sub ?? 'No cierres ni recargues esta pantalla', steps, step: 0, done: false })
    if (steps.length > 1) tick = setInterval(() => { if (id === seq) set((s) => ({ step: Math.min(s.step + 1, steps.length - 1) })) }, STEP_MS)
  }, SHOW_AFTER)
  const wasShown = () => useSaving.getState().open && id === seq
  try {
    const r = await fn()
    clearTimeout(show); clearInterval(tick)
    if (wasShown()) {
      set({ done: true, step: steps.length, title: opts.doneTitle ?? 'Listo', sub: '' })
      await new Promise((res) => setTimeout(res, DONE_MS))
    }
    return r
  } finally {
    clearTimeout(show); clearInterval(tick)
    if (id === seq) set({ open: false })
  }
}
