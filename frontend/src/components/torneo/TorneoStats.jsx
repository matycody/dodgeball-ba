import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Flag } from 'lucide-react'
import { api } from '../../lib/api'
import TeamBadge from '../TeamBadge'

const SHOWN = 5
export const KIND = [['WARNING', 'Adv.', 'bg-surface-2 text-fg'], ['YELLOW', 'Am.', 'bg-warn text-black'], ['BLUE', 'Az.', 'bg-accent text-black'], ['RED', 'Roj.', 'bg-danger text-white']]

export function Block({ title, note, children }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">{title}</p>
      {children}
      {note && <p className="mt-3 text-[11px] text-muted">{note}</p>}
    </section>
  )
}

export function Metric({ value, label }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-2.5">
      <p className="text-2xl font-extrabold leading-tight">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  )
}

// Lista ordenada con barra proporcional al mayor valor; `extra` es lo que va debajo del nombre
function Bars({ rows, value, fmt = (v) => v, invert = false, extra, empty }) {
  const [all, setAll] = useState(false)
  if (rows.length === 0) return <p className="text-sm text-muted">{empty ?? 'Todavía no hay datos.'}</p>
  const vals = rows.map(value)
  const max = Math.max(1, ...vals)
  const min = Math.min(...vals)
  // invert: menos es mejor, la barra más larga es la del menor valor
  const width = (v) => (invert ? (max === min ? 100 : 15 + (1 - (v - min) / (max - min)) * 85) : (v / max) * 100)
  const shown = all ? rows : rows.slice(0, SHOWN)
  return (
    <>
      <div className="space-y-2.5">
        {shown.map((x, i) => (
          <Link key={x.team.id} to={'/equipo/' + x.team.id} className="m-row block" style={{ '--d': 80 + i * 60 + 'ms' }}>
            <div className="flex items-center gap-2">
              <span className="w-4 text-center text-sm font-extrabold text-muted">{i + 1}</span>
              <TeamBadge team={x.team} size="sm" />
              <span className="min-w-0 flex-1 truncate font-bold">{x.team.name}</span>
              <span className="font-mono text-base font-extrabold tabular-nums">{fmt(value(x))}</span>
            </div>
            <div className="ml-6 mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="m-grow h-full rounded-full bg-accent" style={{ width: width(value(x)) + '%', '--d': 200 + i * 60 + 'ms' }} />
            </div>
            {extra && <div className="ml-6 mt-1 text-[11px] text-muted">{extra(x)}</div>}
          </Link>
        ))}
      </div>
      {rows.length > SHOWN && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-3 w-full rounded-xl border border-line bg-surface-2 py-2 text-sm font-bold">{all ? 'Ver menos' : 'Ver todos (' + rows.length + ')'}</button>
      )}
    </>
  )
}

const avg = (v) => v.toFixed(1).replace('.', ',')
const kinds = (x) => (
  <span className="flex flex-wrap gap-1.5">
    {KIND.filter(([k]) => x.sanctions[k] > 0).map(([k, label, cls]) => <span key={k} className={'rounded-full px-2 py-0.5 font-bold ' + cls}>{x.sanctions[k]} {label}</span>)}
  </span>
)

export default function TorneoStats({ tournamentId }) {
  const [d, setD] = useState(null)
  useEffect(() => {
    setD(null)
    api('GET', '/stats/tournaments/' + tournamentId).then(setD).catch(() => setD(false))
  }, [tournamentId])

  if (d === null) return <p className="text-muted">Cargando…</p>
  if (d === false) return <p className="text-sm text-danger">No se pudieron cargar las estadísticas.</p>
  if (d.summary.matches === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface px-4 py-10 text-center">
        <div className="text-lg font-extrabold">Todavía no hay estadísticas</div>
        <div className="mt-1 text-sm text-muted">Aparecen cuando se terminen los primeros partidos del torneo.</div>
      </div>
    )
  }
  const played = d.teams.filter((x) => x.played > 0)
  const name = (a, b) => a.team.name.localeCompare(b.team.name)
  const wonSets = [...played].sort((a, b) => b.setsWon - a.setsWon || a.setsLost - b.setsLost || name(a, b))
  const lostSets = [...played].sort((a, b) => b.setsLost - a.setsLost || a.setsWon - b.setsWon || name(a, b))
  const attack = [...played].sort((a, b) => b.pointsFor - a.pointsFor || name(a, b))
  const defense = [...played].sort((a, b) => a.pointsAgainst / a.played - b.pointsAgainst / b.played || name(a, b))
  const sanctioned = d.teams.filter((x) => x.sanctions.total > 0).sort((a, b) => b.sanctions.total - a.sanctions.total || name(a, b))
  const fairPlay = [...played].sort((a, b) => a.sanctions.total / a.played - b.sanctions.total / b.played || b.played - a.played || name(a, b))
  const streaks = played.filter((x) => x.bestStreak >= 2).sort((a, b) => b.bestStreak - a.bestStreak || b.currentStreak - a.currentStreak || name(a, b))
  const sm = d.sanctionedMatch

  return (
    <div className="m-stagger space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Metric value={d.summary.matches} label="Partidos jugados" />
        <Metric value={d.summary.sets} label="Sets jugados" />
        <Metric value={d.summary.sanctions} label="Sanciones" />
      </div>

      <Block title="Sets ganados" note="Cada equipo con los sets que ganó y los que perdió.">
        <Bars rows={wonSets} value={(x) => x.setsWon} extra={(x) => x.setsLost + ' perdidos · ' + x.played + (x.played === 1 ? ' partido' : ' partidos')} />
      </Block>
      <Block title="Sets perdidos">
        <Bars rows={lostSets} value={(x) => x.setsLost} extra={(x) => x.setsWon + ' ganados · ' + x.played + (x.played === 1 ? ' partido' : ' partidos')} />
      </Block>

      <Block title="Mejor ataque" note="Puntos a favor: Foam 1 por set ganado; Cloth 2 por set ganado (y 1 para cada uno si el set empata).">
        <Bars rows={attack} value={(x) => x.pointsFor} extra={(x) => avg(x.pointsFor / x.played) + ' por partido'} />
      </Block>
      <Block title="Mejor defensa" note="Puntos recibidos por partido: menos es mejor.">
        <Bars rows={defense} invert value={(x) => x.pointsAgainst / x.played} fmt={avg} extra={(x) => x.pointsAgainst + ' puntos en ' + x.played + (x.played === 1 ? ' partido' : ' partidos')} />
      </Block>

      {streaks.length > 0 && (
        <Block title="Mejor racha de victorias" note="Partidos ganados seguidos durante el torneo.">
          <Bars rows={streaks} value={(x) => x.bestStreak} extra={(x) => (x.currentStreak > 1 ? 'Racha vigente: ' + x.currentStreak : '')} />
        </Block>
      )}

      <Block title="Equipo más sancionado" note="No cuenta las sanciones que la mesa deshizo.">
        <Bars rows={sanctioned} value={(x) => x.sanctions.total} extra={kinds} empty="Todavía no hay sanciones en este torneo." />
      </Block>
      {sanctioned.length > 0 && (
        <Block title="Juego limpio" note="Menos sanciones por partido jugado.">
          <Bars rows={fairPlay} invert value={(x) => x.sanctions.total / x.played} fmt={avg} extra={(x) => x.sanctions.total + (x.sanctions.total === 1 ? ' sanción' : ' sanciones') + ' en ' + x.played + (x.played === 1 ? ' partido' : ' partidos')} />
        </Block>
      )}

      {sm && (
        <Link to={'/partido/' + sm.matchId} className="block rounded-2xl border border-line bg-surface p-4">
          <Flag size={18} className="text-accent" />
          <p className="mt-1 text-lg font-extrabold leading-tight">{sm.count} {sm.count === 1 ? 'sanción' : 'sanciones'}</p>
          <p className="text-xs text-muted">Partido con más sanciones · {sm.teamA.name} vs {sm.teamB.name}</p>
          <p className="mt-1 flex items-center gap-0.5 text-[11px] font-bold text-accent">Ver el partido <ChevronRight size={12} /></p>
        </Link>
      )}
    </div>
  )
}
