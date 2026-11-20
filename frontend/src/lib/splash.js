import { useAuthStore } from '../stores/authStore'

// Pantalla de bienvenida (logo DBA) que se ve al abrir la app: dura lo justo para verse (MIN) y se va
// apenas la sesión terminó de cargar; MAX evita que se quede si algo tarda de más.
const MIN_MS = 900
const MAX_MS = 3500

export function hideSplashWhenReady() {
  const el = document.getElementById('splash')
  if (!el) return
  let done = false
  const finish = () => {
    if (done) return
    done = true
    unsub()
    const wait = Math.max(0, MIN_MS - performance.now()) // performance.now() cuenta desde que se abrió la página
    setTimeout(() => {
      el.classList.add('out')
      setTimeout(() => el.remove(), 400)
    }, wait)
  }
  const unsub = useAuthStore.subscribe((s) => { if (!s.loading) finish() })
  if (!useAuthStore.getState().loading) finish()
  setTimeout(finish, MAX_MS)
}
