import { create } from 'zustand'

// mode: 'light' | 'dark' | 'system'   (lo que eligio la persona)
// theme: 'light' | 'dark'             (lo que se aplica realmente)
const KEY = 'theme'
const SKEY = 'skin' // estilo del tema oscuro: 'azul' (azul noche, por defecto) | 'acero' (negro + gris azulado)
const FKEY = 'fondo' // fondo de pantalla (claro y oscuro): 'escudo' (el de siempre, con el DBA) | 'cancha' (líneas de cancha)
const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

function readMode() {
  try {
    const s = localStorage.getItem(KEY)
    if (s === 'light' || s === 'dark' || s === 'system') return s
  } catch { /* sin localStorage */ }
  return 'dark'
}

function readSkin() {
  try { return localStorage.getItem(SKEY) === 'acero' ? 'acero' : 'azul' } catch { return 'azul' }
}

function readFondo() {
  try { return localStorage.getItem(FKEY) === 'cancha' ? 'cancha' : 'escudo' } catch { return 'escudo' }
}

const resolve = (mode) => (mode === 'system' ? (prefersDark() ? 'dark' : 'light') : mode)

function apply(theme, skin = readSkin()) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.dataset.skin = skin
  document.documentElement.dataset.fondo = readFondo()
  document.documentElement.style.colorScheme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? (skin === 'acero' ? '#000000' : '#0a0a0b') : '#e9eef5')
}

const initialMode = readMode()

export const useThemeStore = create((set, get) => ({
  mode: initialMode,
  skin: readSkin(),
  fondo: readFondo(),
  theme: resolve(initialMode),

  setMode: (mode) => {
    try { localStorage.setItem(KEY, mode) } catch { /* sin localStorage */ }
    const theme = resolve(mode)
    apply(theme)
    set({ mode, theme })
  },

  setSkin: (skin) => {
    try { localStorage.setItem(SKEY, skin) } catch { /* sin localStorage */ }
    apply(get().theme, skin)
    set({ skin })
  },

  setFondo: (fondo) => {
    try { localStorage.setItem(FKEY, fondo) } catch { /* sin localStorage */ }
    document.documentElement.dataset.fondo = fondo
    set({ fondo })
  },

  toggleTheme: () => get().setMode(get().theme === 'dark' ? 'light' : 'dark'),

  initTheme: () => {
    apply(get().theme)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (get().mode !== 'system') return
      const theme = resolve('system')
      apply(theme)
      set({ theme })
    })
  },
}))
