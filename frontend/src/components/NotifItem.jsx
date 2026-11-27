import { Bell, CalendarClock, Ban, Pause, AlarmClock, Flag, ClipboardCheck, UserMinus, UserPlus, CheckCircle2, X, Link2 } from 'lucide-react'

// Ícono y color por tipo de aviso: se reconoce de un vistazo qué pasó
const TONES = {
  red: 'bg-red-500/15 text-red-400',
  amber: 'bg-amber-500/15 text-amber-400',
  green: 'bg-green-500/15 text-green-400',
  accent: 'bg-accent/15 text-accent',
}
const KIND = {
  match_moved: [CalendarClock, 'amber'],
  match_rescheduled: [CalendarClock, 'amber'],
  match_suspended: [Pause, 'amber'],
  match_cancelled: [Ban, 'red'],
  match_reminder: [AlarmClock, 'accent'],
  match_finished: [Flag, 'green'],
  assignment_assigned: [ClipboardCheck, 'green'],
  assignment_removed: [UserMinus, 'red'],
  request_new: [UserPlus, 'accent'],
  request_approved: [CheckCircle2, 'green'],
  request_rejected: [X, 'red'],
  linked: [Link2, 'green'],
}

export const ago = (iso) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000))
  if (m < 1) return 'ahora'
  if (m < 60) return m + ' min'
  const h = Math.round(m / 60)
  if (h < 24) return h + ' h'
  return Math.round(h / 24) + ' d'
}

// Hoy / Ayer / Antes
export const dayKey = (iso) => {
  const d = new Date(iso)
  const t = new Date()
  const sod = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((sod(t) - sod(d)) / 86400000)
  return diff <= 0 ? 'Hoy' : diff === 1 ? 'Ayer' : 'Antes'
}


// Hoy / Ayer / Antes
export const groupByDay = (items) => ['Hoy', 'Ayer', 'Antes'].map((k) => [k, items.filter((n) => dayKey(n.createdAt) === k)]).filter(([, l]) => l.length)

// Una fila de aviso (la usan la campana y la pantalla Notificaciones)
export default function NotifItem({ n, onOpen }) {
  const [Icon, tone] = KIND[n.type] ?? [Bell, 'accent']
  return (
    <button
      type="button"
      onClick={() => onOpen(n)}
      className={'relative flex w-full items-start gap-3 border-b border-line px-4 py-3.5 text-left active:bg-surface-2 ' + (n.readAt ? '' : 'bg-accent/10')}
    >
      {!n.readAt && <span className="absolute inset-y-0 left-0 w-1 bg-accent" />}
      <span className={'grid h-10 w-10 shrink-0 place-items-center rounded-xl ' + TONES[tone]}><Icon size={20} /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className={'min-w-0 flex-1 text-[15px] leading-snug ' + (n.readAt ? 'font-semibold text-muted' : 'font-extrabold')}>{n.title}</span>
          <span className="shrink-0 text-xs text-muted">{ago(n.createdAt)}</span>
        </span>
        {n.body && <span className={'mt-0.5 block text-sm leading-snug ' + (n.readAt ? 'text-muted' : 'text-fg')}>{n.body}</span>}
      </span>
      {!n.readAt && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />}
    </button>
  )
}
