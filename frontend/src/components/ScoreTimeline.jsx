import { useState } from 'react'
import { ChevronDown, X, Timer } from 'lucide-react'
import TeamBadge from './TeamBadge'

const clock = (sec) => String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0')

// Duración promedio de set: tiempo de juego transcurrido al decidirse el último set / cantidad de sets.
// Solo si todos los sets tienen su momento registrado y es coherente (los partidos cargados en 00:00 no la muestran).
function avgSetSeconds(sets) {
  if (!sets.length || sets.some((s) => !s.half || s.second == null)) return null
  const at = sets.map((s) => (s.half - 1) * 20 * 60 + s.second)
  if (at.some((x, i) => x < (i ? at[i - 1] : 0))) return null
  const avg = at[at.length - 1] / sets.length
  return avg > 0 ? Math.round(avg) : null
}

const when = (half, second) => (half ? half + 'T' + (second != null ? ' · ' + clock(second) : '') : '')

// Tarjetas y advertencias: color y nombre
const SAN = {
  WARNING: { label: 'Advertencia', cls: 'bg-warn' },
  YELLOW: { label: 'Tarjeta amarilla', cls: 'bg-yellow-400' },
  BLUE: { label: 'Tarjeta azul', cls: 'bg-blue-500' },
  RED: { label: 'Tarjeta roja', cls: 'bg-red-500' },
}

function Side({ team, set, branch }) {
  if (!team) return <div />
  return (
    <div className="flex min-w-0 items-center gap-2">
      <TeamBadge team={team} size="sm" branch={branch} />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{team.name}</p>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Set {set}</p>
      </div>
    </div>
  )
}

// Cronología del partido: sets (quién ganó, marcador y momento), tarjetas/advertencias y tiempos muertos, del más reciente al más antiguo.
// Desplegable y de altura fija.
export default function ScoreTimeline({ m, sanctions = [], timeouts = [], onDelete = null, busy = false, defaultOpen = true }) {
  const sets = m?.sets ?? []
  const [open, setOpen] = useState(defaultOpen)
  const ts = (x) => (x ? +new Date(x) : 0)
  const events = [
    ...sets.map((s) => ({ k: 'set', key: 'set' + s.number, ts: ts(s.at) || s.number, s })),
    ...sanctions.map((x) => ({ k: 'san', key: 'san' + x.id, ts: ts(x.createdAt), x })),
    ...timeouts.map((x) => ({ k: 'to', key: 'to' + x.id, ts: ts(x.at), x })),
  ].sort((a, b) => b.ts - a.ts)
  if (!events.length) return null
  const last = sets.length - 1
  const avg = avgSetSeconds(sets)
  const live = m.status === 'LIVE' || m.status === 'READY'

  return (
    <section className="overflow-hidden rounded-3xl border border-line bg-surface">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="flex-1 text-sm font-extrabold uppercase tracking-wide">{sanctions.length || timeouts.length ? 'Cronología' : 'Sets'}</span>
        <span className="font-mono text-xs font-bold text-muted">{events.length}</span>
        <ChevronDown size={18} className={'shrink-0 text-muted transition-transform ' + (open ? 'rotate-180' : '')} />
      </button>
      {open && (
        <ol className="max-h-80 divide-y divide-line overflow-y-auto overscroll-contain border-t border-line">
          {events.map((ev) => {
            if (ev.k === 'san') {
              const x = ev.x
              const cfg = SAN[x.kind] ?? SAN.WARNING
              const team = x.side === 'A' ? m.teamA : m.teamB
              return (
                <li key={ev.key} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={'h-5 w-4 shrink-0 rounded-[3px] ' + cfg.cls} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{cfg.label}{x.eliminates ? ' · eliminado' : ''}</p>
                    <p className="truncate text-xs text-muted">{x.player ? (x.player.number != null ? '#' + x.player.number + ' ' : '') + x.player.name + ' · ' : ''}{team?.name ?? ''}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] font-bold tabular-nums text-muted">{when(x.half, x.matchSecond)}</span>
                </li>
              )
            }
            if (ev.k === 'to') {
              const x = ev.x
              const team = x.team === 'A' ? m.teamA : m.teamB
              return (
                <li key={ev.key} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="grid h-5 w-4 shrink-0 place-items-center text-accent"><Timer size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">Tiempo muerto</p>
                    <p className="truncate text-xs text-muted">{team?.name ?? ''}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] font-bold tabular-nums text-muted">{when(x.half, x.second)}</span>
                </li>
              )
            }
            const s = ev.s
            const winner = s.draw ? null : s.winnerTeamId === m.teamA?.id ? 'A' : 'B'
            const now = live && s.number === sets[last].number
            return (
              <li key={s.number} className={'grid items-center gap-2 px-4 py-2.5 ' + (onDelete ? 'grid-cols-[1fr_auto_1fr_auto]' : 'grid-cols-[1fr_auto_1fr]')}>
                {winner === 'A' ? <Side team={m.teamA} set={s.number} branch={m.branch} /> : <div />}
                <div className="text-center">
                  <p className={'font-mono text-lg font-extrabold tabular-nums ' + (now ? 'text-live' : '')}>{s.scoreA}-{s.scoreB}</p>
                  <p className="font-mono text-[11px] font-bold tabular-nums text-muted">
                    {winner ? '' : 'Empate · Set ' + s.number + ' · '}{s.half && s.second != null ? s.half + 'T · ' + clock(s.second) : ''}
                  </p>
                </div>
                {winner === 'B' ? <div className="flex justify-end text-right"><Side team={m.teamB} set={s.number} branch={m.branch} /></div> : <div />}
                {onDelete && (
                  <button type="button" disabled={busy} aria-label={'Deshacer set ' + s.number} onClick={() => onDelete(s)} className="grid h-9 w-9 place-items-center rounded-full text-danger disabled:opacity-40"><X size={16} /></button>
                )}
              </li>
            )
          })}
        </ol>
      )}
      {open && sets.length > 0 && avg != null && (
        <p className="flex items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-xs font-semibold text-muted">
          <span>Duración promedio por set</span>
          <span className="font-mono text-sm font-extrabold tabular-nums text-fg">{Math.floor(avg / 60) + ':' + String(avg % 60).padStart(2, '0')}</span>
        </p>
      )}
    </section>
  )
}
