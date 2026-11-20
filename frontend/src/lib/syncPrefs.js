import { supabase } from './supabase'
import { useThemeStore } from '../stores/themeStore'
import { usePersonalStore } from '../stores/personalStore'

// Sincroniza el tema, el estilo del oscuro, el fondo de pantalla y el color personal con la cuenta (user_metadata de Supabase),
// asi la misma cuenta se ve igual en el celular y en la compu. Sin sesion, queda local.
const MODES = ['light', 'dark', 'system']
const FONDOS = ['escudo', 'cancha']
const SKINS = ['azul', 'acero']
// Fondo y estilo solo se suben si este dispositivo los eligió (el valor por defecto no pisa lo que se eligió en otro)
const chosen = (key) => { try { return localStorage.getItem(key) !== null } catch { return false } }
let signedIn = false
let applying = false // evita volver a subir lo que acabamos de traer de la cuenta
let pushTimer = null
let lastPull = 0
let lastLocal = 0 // ultimo cambio hecho en este dispositivo

function pushToAccount() {
  if (applying) return
  lastLocal = Date.now()
  if (!signedIn) return
  clearTimeout(pushTimer)
  pushTimer = setTimeout(async () => {
    const { mode, fondo, skin } = useThemeStore.getState()
    const { accent } = usePersonalStore.getState()
    const data = { pref_theme: mode, pref_accent: accent }
    if (chosen('fondo')) data.pref_fondo = fondo
    if (chosen('skin')) data.pref_skin = skin
    const { error } = await supabase.auth.updateUser({ data })
    if (error) console.warn('[prefs] no se pudieron guardar en la cuenta:', error.message)
  }, 800)
}

function applyFromAccount(user) {
  const m = user?.user_metadata ?? {}
  // "No mostrar más tutoriales": si la cuenta lo tiene apagado, vale en este dispositivo también
  if (m.pref_tours_off === true) { try { localStorage.setItem('tours-off', '1') } catch { /* sin storage */ } }
  if (m.pref_theme === undefined && m.pref_accent === undefined && m.pref_fondo === undefined && m.pref_skin === undefined) {
    pushToAccount() // la cuenta todavia no tiene nada: se sube lo que ya tenia este dispositivo
    return
  }
  if (Date.now() - lastLocal < 3000) return // se acaba de cambiar aca: no pisarlo con datos viejos
  applying = true
  try {
    const theme = useThemeStore.getState()
    if (MODES.includes(m.pref_theme) && m.pref_theme !== theme.mode) theme.setMode(m.pref_theme)
    if (FONDOS.includes(m.pref_fondo) && m.pref_fondo !== theme.fondo) theme.setFondo(m.pref_fondo)
    if (SKINS.includes(m.pref_skin) && m.pref_skin !== theme.skin) theme.setSkin(m.pref_skin)
    const personal = usePersonalStore.getState()
    const accent = m.pref_accent ?? null
    if (accent !== personal.accent) {
      if (accent) personal.setAccent(accent)
      else personal.clearAccent()
    }
  } finally {
    applying = false
  }
  // La cuenta todavía no tiene el fondo o el estilo, pero este dispositivo ya eligió uno: se sube
  if ((m.pref_fondo === undefined && chosen('fondo')) || (m.pref_skin === undefined && chosen('skin'))) pushToAccount()
}

async function pull(force = false) {
  if (!signedIn) return
  const now = Date.now()
  if (!force && now - lastPull < 15000) return
  lastPull = now
  const { data, error } = await supabase.auth.getUser() // trae los datos frescos de la cuenta
  if (!error && data?.user) applyFromAccount(data.user)
}

useThemeStore.subscribe((s, prev) => { if (s.mode !== prev.mode || s.fondo !== prev.fondo || s.skin !== prev.skin) pushToAccount() })
usePersonalStore.subscribe((s, prev) => { if (s.accent !== prev.accent) pushToAccount() })

supabase.auth.onAuthStateChange((event, session) => {
  signedIn = !!session
  if (event === 'SIGNED_OUT') { clearTimeout(pushTimer); return }
  if (session && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) setTimeout(() => pull(true), 0)
})

// Al volver a la pestana o a la app, se trae lo ultimo que se eligio en otro dispositivo
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') pull()
})
