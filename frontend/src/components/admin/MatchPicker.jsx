import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { inputCls } from '../ui'
import { STATUS } from '../../lib/format'
import { dayOf, dayTab } from '../../lib/days'

const ORDERS = [['recent', 'Más recientes'], ['old', 'Más antiguos'], ['tournament', 'Por torneo'], ['team', 'Por equipo']]
const PAGE = 50
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const tName = (m) => m.tournament?.name ?? 'Amistoso'
const hour = (m) => (m.timeSet === false ? 'horario a confirmar' : new Date(m.scheduledAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }))
const whenOf = (m) => (m.scheduledAt ? dayTab(dayOf(m.scheduledAt)) + ' · ' + hour(m) : 'Sin programación')
const title = (m) => (m.teamA?.name ?? '—') + ' vs ' + (m.teamB?.name ?? '—')
const byDate = (a, b) => String(a.scheduledAt ?? '9999').localeCompare(String(b.scheduledAt ?? '9999'))

// Elegir un partido entre muchos: lupa, filtros por torneo, día y equipo, y orden a elección
export default function MatchPicker({ matches, value, onChange }) {
  const [q, setQ] = useState('')
  const [tour, setTour] = useState('all')
  const [day, setDay] = useState('all')
  const [team, setTeam] = useState('all')
  const [order, setOrder] = useState('recent')
  const [open, setOpen] = useState(true)
  const [limit, setLimit] = useState(PAGE)

  const opts = useMemo(() => {
    const tours = new Map()
    const teams = new Map()
    const days = new Set()
    matches.forEach((m) => {
      tours.set(m.tournament?.id ?? 'none', tName(m))
      ;[m.teamA, m.teamB].forEach((t) => { if (t?.id) teams.set(t.id, t.name) })
      if (m.scheduledAt) days.add(dayOf(m.scheduledAt))
    })
    return {
      tours: [...tours].sort((a, b) => a[1].localeCompare(b[1])),
      teams: [...teams].sort((a, b) => a[1].localeCompare(b[1])),
      days: [...days].sort().reverse(),
    }
  }, [matches])

  const list = useMemo(() => {
    const nq = norm(q).trim()
    const out = matches.filter((m) => {
      if (tour !== 'all' && (m.tournament?.id ?? 'none') !== tour) return false
      if (day !== 'all' && dayOf(m.scheduledAt) !== day) return false
      if (team !== 'all' && m.teamA?.id !== team && m.teamB?.id !== team) return false
      if (!nq) return true
      return norm(title(m) + ' ' + tName(m) + ' ' + (m.scheduledAt ? dayTab(dayOf(m.scheduledAt)) : '')).includes(nq)
    })
    const cmp = {
      recent: (a, b) => byDate(b, a),
      old: byDate,
      tournament: (a, b) => tName(a).localeCompare(tName(b)) || byDate(a, b),
      team: (a, b) => (a.teamA?.name ?? '').localeCompare(b.teamA?.name ?? '') || byDate(a, b),
    }[order]
    return out.sort(cmp)
  }, [matches, q, tour, day, team, order])

  const chosen = value ? matches.find((m) => m.id === value) : null
  const reset = (set) => (e) => { set(e.target.value); setLimit(PAGE) }

  if (chosen && !open) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-accent bg-surface p-3 text-sm">
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{title(chosen)}</p>
          <p className="truncate text-xs text-muted">{tName(chosen)} · {whenOf(chosen)}</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs font-bold">Cambiar</button>
        <button type="button" aria-label="Quitar partido" onClick={() => { onChange(''); setOpen(true) }} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line"><X size={16} /></button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input value={q} onChange={reset(setQ)} placeholder="Buscar equipo, torneo o día" className={inputCls + ' pl-10'} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select className={inputCls} value={tour} onChange={reset(setTour)} aria-label="Torneo">
          <option value="all">Todos los torneos</option>
          {opts.tours.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select className={inputCls} value={day} onChange={reset(setDay)} aria-label="Fecha">
          <option value="all">Todas las fechas</option>
          {opts.days.map((d) => <option key={d} value={d}>{dayTab(d)}</option>)}
        </select>
        <select className={inputCls} value={team} onChange={reset(setTeam)} aria-label="Equipo">
          <option value="all">Todos los equipos</option>
          {opts.teams.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select className={inputCls} value={order} onChange={reset(setOrder)} aria-label="Ordenar">
          {ORDERS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
      </div>
      <p className="text-xs text-muted">{list.length} {list.length === 1 ? 'partido' : 'partidos'}</p>
      <div className="max-h-80 space-y-1.5 overflow-y-auto">
        {list.slice(0, limit).map((m) => (
          <button key={m.id} type="button" onClick={() => { onChange(m.id); setOpen(false) }}
            className={'w-full rounded-xl border px-3 py-2 text-left text-sm ' + (m.id === value ? 'border-accent bg-surface-2' : 'border-line bg-surface')}>
            <span className="block truncate font-bold">{title(m)}</span>
            <span className="block truncate text-xs text-muted">{tName(m)} · {whenOf(m)}{STATUS[m.status] ? ' · ' + STATUS[m.status].label : ''}</span>
          </button>
        ))}
        {list.length > limit && (
          <button type="button" onClick={() => setLimit((n) => n + PAGE)} className="w-full rounded-xl border border-dashed border-line py-2 text-sm font-bold text-muted">Mostrar más</button>
        )}
        {list.length === 0 && <p className="py-4 text-center text-sm text-muted">Ningún partido coincide con la búsqueda.</p>}
      </div>
    </div>
  )
}
