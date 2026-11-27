import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { pushSupported, isIos, isStandalone, currentSubscription, enablePush, disablePush } from '../lib/push'

const GROUPS = [
  { key: 'matches', label: 'Partidos', desc: 'Cambios de horario o cancha, suspensiones, cancelaciones, resultados y recordatorio 30 minutos antes.' },
  { key: 'assignments', label: 'Asignaciones', desc: 'Cuando te asignan o te sacan de un partido como árbitro o mesa.' },
  { key: 'requests', label: 'Solicitudes y cuenta', desc: 'Altas de jugador aprobadas o rechazadas y vinculación de tu cuenta.' },
]

function Switch({ on, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={'relative h-7 w-12 shrink-0 rounded-full border border-line disabled:opacity-50 ' + (on ? 'bg-accent' : 'bg-surface-2')}
    >
      <span className={'absolute top-0.5 h-5.5 w-5.5 rounded-full bg-white ' + (on ? 'left-[22px]' : 'left-0.5')} style={{ height: 22, width: 22 }} />
    </button>
  )
}

// Silenciar o activar los avisos fuera de la web. Dentro de la web (campana) siempre se ven.
export default function NotificacionesPage() {
  const [supported] = useState(pushSupported())
  const [active, setActive] = useState(false) // este dispositivo recibe push
  const [off, setOff] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const needsInstall = isIos() && !isStandalone()

  useEffect(() => {
    currentSubscription().then((s) => setActive(!!s && Notification.permission === 'granted'))
    api('GET', '/notifications/prefs').then((r) => setOff(r.off ?? [])).catch(() => {})
  }, [])

  const toggleDevice = async (v) => {
    setBusy(true); setErr('')
    try {
      if (v) await enablePush(); else await disablePush()
      setActive(v)
    } catch (e) {
      setErr(e.message || 'No se pudo cambiar.')
    } finally {
      setBusy(false)
    }
  }

  const toggleGroup = async (key, on) => {
    const next = on ? off.filter((k) => k !== key) : [...off, key]
    const prev = off
    setOff(next); setErr('')
    try {
      await api('PUT', '/notifications/prefs', { off: next })
    } catch (e) {
      setOff(prev)
      setErr(e.message || 'No se pudo guardar.')
    }
  }

  return (
    <div className="space-y-4 pb-6">
      <h1 className="text-2xl font-extrabold">Notificaciones</h1>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-extrabold">Avisos fuera de la web</p>
            <p className="mt-0.5 text-sm text-muted">Te llegan al celular o a la compu aunque la web esté cerrada. Se activan por dispositivo.</p>
          </div>
          <Switch on={active} onChange={toggleDevice} disabled={busy || !supported || needsInstall} label="Avisos fuera de la web en este dispositivo" />
        </div>
        {!supported && !needsInstall && <p className="mt-3 text-sm text-muted">Este navegador no permite avisos fuera de la web. Los vas a ver igual en la campana.</p>}
        {needsInstall && <p className="mt-3 text-sm text-muted">En iPhone hay que instalar la web: tocá Compartir y después &quot;Agregar a pantalla de inicio&quot;, abrila desde ahí y volvé a esta pantalla.</p>}
        {err && <p role="alert" className="mt-3 text-sm font-semibold text-red-400">{err}</p>}
      </section>

      <section className="rounded-2xl border border-line bg-surface">
        <p className="px-4 pt-4 font-extrabold">Qué avisos querés recibir afuera</p>
        <p className="px-4 pb-2 text-sm text-muted">Lo que silencies acá deja de llegar al celular, pero sigue apareciendo en la campana.</p>
        {GROUPS.map((g) => (
          <div key={g.key} className="flex items-center gap-3 border-t border-line px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-bold">{g.label}</p>
              <p className="text-sm text-muted">{g.desc}</p>
            </div>
            <Switch on={!off.includes(g.key)} onChange={(v) => toggleGroup(g.key, v)} label={g.label} />
          </div>
        ))}
      </section>
    </div>
  )
}
