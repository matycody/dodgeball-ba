import { create } from 'zustand'
import { supabase } from '../lib/supabase'

// Cada tutorial sale una sola vez por dispositivo (aunque inicies o cierres sesión) y queda marcado apenas empieza,
// así no vuelve a salir aunque se cierre la pantalla a mitad de camino.
// Además hay un interruptor general ("no mostrar más tutoriales") que también se guarda en la cuenta.
const PREFIX = 'tour-done:'
const OFF_KEY = 'tours-off'
const doneKey = (key) => PREFIX + key

export const toursOff = () => {
  try { return localStorage.getItem(OFF_KEY) === '1' } catch { return true } // sin storage: no insiste
}
// Con uid también cuenta la marca vieja (por persona) para que nadie los vea de nuevo por esta actualización
export const tourSeen = (uid, key) => {
  if (toursOff()) return true
  try {
    return localStorage.getItem(doneKey(key)) === '1' || (!!uid && localStorage.getItem(PREFIX + uid + ':' + key) === '1')
  } catch { return true }
}
const markSeen = (key) => {
  try { localStorage.setItem(doneKey(key), '1') } catch { /* sin storage */ }
}
// Apaga o prende los tutoriales automáticos; con sesión se guarda también en la cuenta (vale en todos los dispositivos)
export const setToursOff = (off) => {
  try { if (off) localStorage.setItem(OFF_KEY, '1'); else localStorage.removeItem(OFF_KEY) } catch { /* sin storage */ }
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) supabase.auth.updateUser({ data: { pref_tours_off: !!off } }).catch(() => {})
  }).catch(() => {})
}
// Borra las marcas para que los tutoriales vuelvan a salir (y los vuelve a prender)
export const resetTours = () => {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k))
  } catch { /* sin storage */ }
  setToursOff(false)
}

export const useTourStore = create((set, get) => ({
  active: null, // { key, uid, steps, index }
  start: (key, steps, uid) => {
    if (!steps?.length) return
    markSeen(key) // queda como visto apenas empieza
    set({ active: { key, uid: uid ?? null, steps, index: 0 } })
  },
  next: () => {
    const a = get().active
    if (!a) return
    if (a.index >= a.steps.length - 1) return get().close()
    set({ active: { ...a, index: a.index + 1 } })
  },
  prev: () => {
    const a = get().active
    if (!a || a.index === 0) return
    set({ active: { ...a, index: a.index - 1 } })
  },
  close: () => set({ active: null }),
  // El "ojito": no mostrar más tutoriales automáticos, nunca más
  disableAll: () => {
    setToursOff(true)
    set({ active: null })
  },
}))
