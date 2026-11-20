import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '../stores/themeStore'

// Botón chico para pasar de modo oscuro a claro (y al revés) desde las pantallas de entrada, antes de tener sesión
export default function ThemeSwitch({ className = '' }) {
  const theme = useThemeStore((s) => s.theme)
  const toggle = useThemeStore((s) => s.toggleTheme)
  const toLight = theme === 'dark'
  return (
    <button type="button" onClick={toggle} aria-label={toLight ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} title={toLight ? 'Modo claro' : 'Modo oscuro'}
      className={'login-glass e-press grid h-10 w-10 place-items-center rounded-full text-fg ' + className}>
      {toLight ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
