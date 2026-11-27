import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import NotifItem, { groupByDay } from '../components/NotifItem'
import { useNotifStore } from '../stores/notifStore'
import { useNavigate } from 'react-router-dom'
import { CheckCheck } from 'lucide-react'
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
  const navigate = useNavigate()
  const unread = useNotifStore((s) => s.unread)
  const [hist, setHist] = useState(null) // historial completo (no se borra nunca)
  const [more, setMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const loadHist = async (before) => {
    const q = '/notifications?limit=30' + (before ? '&before=' + encodeURIComponent(before) : '')
    const r = await api('GET', q)
    setHist((h) => (before ? [...(h ?? []), ...(r.items ?? [])] : (r.items ?? [])))
    setMore(!!r.hasMore)
  }
  useEffect(() => { loadHist().catch(() => setHist([])) }, [])

  const verMas = async () => {
    setLoadingMore(true)
    try { await loadHist(hist[hist.length - 1].createdAt) } catch { /* reintenta tocando de nuevo */ }
    setLoadingMore(false)
  }

  const open = async (n) => {
    if (!n.readAt) {
      setHist((h) => h.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)))
      api('POST', '/notifications/' + n.id + '/read').then(() => useNotifStore.getState().load()).catch(() => {})
    }
    if (n.link) navigate(n.link)
  }

  const readAll = () => {
    setHist((h) => h.map((x) => (x.readAt ? x : { ...x, readAt: new Date().toISOString() })))
    useNotifStore.getState().markAll()
  }

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

      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <p className="text-lg font-extrabold">Todas tus notificaciones</p>
          {unread > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-extrabold leading-none text-white">{unread}</span>}
          <span className="flex-1" />
          {unread > 0 && (
            <button type="button" onClick={readAll} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs font-bold text-accent active:opacity-70">
              <CheckCheck size={14} /> Marcar leído
            </button>
          )}
        </div>
        {hist === null ? (
          <p className="px-4 py-8 text-center text-sm text-muted">Cargando…</p>
        ) : hist.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">Todavía no tenés notificaciones. Acá queda el historial completo.</p>
        ) : (
          <>
            {groupByDay(hist).map(([label, list]) => (
              <div key={label}>
                <p className="bg-surface-2 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-muted">{label}</p>
                {list.map((n) => <NotifItem key={n.id} n={n} onOpen={open} />)}
              </div>
            ))}
            {more && (
              <button type="button" onClick={verMas} disabled={loadingMore} className="w-full px-4 py-3.5 text-sm font-bold text-accent active:bg-surface-2 disabled:opacity-60">
                {loadingMore ? 'Cargando…' : 'Ver anteriores'}
              </button>
            )}
          </>
        )}
      </section>

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
