import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Flag } from 'lucide-react'
import { api } from '../../lib/api'
import { Block, Metric, KIND } from '../torneo/TorneoStats'

const SHOWN = 5
const avg = (v) => v.toFixed(1).replace('.', ',')
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many)

// Estadísticas del equipo, parecidas a las del torneo: sets, puntos, racha y sanciones; respeta los filtros de modalidad y rama de la página
export default function TeamStats({ teamId, mod, br }) {
  const [d, setD] = useState(null)
  const [all, setAll] = useState(false)
  useEffect(() => {
    setD(null)
    const q = [mod !== 'all' ? 'modality=' + mod : '', br !== 'all' ? 'branch=' + br : ''].filter(Boolean).join('&')
    api('GET', '/stats/teams/' + teamId + '/summary' + (q ? '?' + q : '')).then(setD).catch(() => setD(false))
  }, [teamId, mod, br])

  if (!d || d.summary.matches === 0) return null
  const rows = [...d.tournaments].sort((a, b) => b.setsWon - a.setsWon || a.setsLost - b.setsLost)
  const max = Math.max(1, ...rows.map((r) => r.setsWon))
  const shown = all ? rows : rows.slice(0, SHOWN)
  const played = d.summary.matches
  const sm = d.sanctionedMatch

  return (
    <div className="m-stagger mt-3 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Metric value={d.summary.matches} label="Partidos jugados" />
        <Metric value={d.summary.sets} label="Sets jugados" />
        <Metric value={d.summary.sanctions} label="Sanciones" />
      </div>

      <Block title="Ataque y defensa" note="Puntos de juego: Foam 1 por set ganado; Cloth 2 por set ganado (y 1 para cada uno si el set empata).">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-surface-2 px-3 py-2.5">
            <p className="text-2xl font-extrabold leading-tight">{d.points.for}</p>
            <p className="text-xs text-muted">Puntos a favor · {avg(d.points.for / played)} por partido</p>
          </div>
          <div className="rounded-2xl bg-surface-2 px-3 py-2.5">
            <p className="text-2xl font-extrabold leading-tight">{d.points.against}</p>
            <p className="text-xs text-muted">Puntos en contra · {avg(d.points.against / played)} por partido</p>
          </div>
        </div>
      </Block>

      {rows.length > 0 && (
        <Block title="Sets ganados por torneo" note="Cada torneo con los sets que ganó y los que perdió.">
          <div className="space-y-2.5">
            {shown.map((r, i) => (
              <Link key={r.tournament.id} to={'/liga/' + r.tournament.id} className="m-row block" style={{ '--d': 80 + i * 60 + 'ms' }}>
                <div className="flex items-center gap-2">
                  <span className="w-4 text-center text-sm font-extrabold text-muted">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-bold">{r.tournament.name}</span>
                  <span className="font-mono text-base font-extrabold tabular-nums">{r.setsWon}</span>
                </div>
                <div className="ml-6 mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="m-grow h-full rounded-full bg-accent" style={{ width: (r.setsWon / max) * 100 + '%', '--d': 200 + i * 60 + 'ms' }} />
                </div>
                <div className="ml-6 mt-1 text-[11px] text-muted">{r.setsLost} perdidos · {plural(r.played, 'partido', 'partidos')} · {r.tournament.year}</div>
              </Link>
            ))}
          </div>
          {rows.length > SHOWN && (
            <button type="button" onClick={() => setAll((v) => !v)} className="mt-3 w-full rounded-xl border border-line bg-surface-2 py-2 text-sm font-bold">{all ? 'Ver menos' : 'Ver todos (' + rows.length + ')'}</button>
          )}
        </Block>
      )}

      {d.streak.best >= 2 && (
        <Block title="Mejor racha de victorias" note="Partidos ganados seguidos.">
          <p className="text-3xl font-extrabold leading-tight">{d.streak.best}</p>
          {d.streak.current > 1 && <p className="text-xs text-muted">Racha vigente: {d.streak.current}</p>}
        </Block>
      )}

      <Block title="Sanciones" note="No cuenta las sanciones que la mesa deshizo.">
        {d.sanctions.total === 0 ? (
          <p className="text-sm text-muted">Sin sanciones.</p>
        ) : (
          <>
            <p className="text-3xl font-extrabold leading-tight">{d.sanctions.total}</p>
            <p className="text-xs text-muted">{avg(d.sanctions.total / played)} por partido</p>
            <span className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
              {KIND.filter(([k]) => d.sanctions[k] > 0).map(([k, label, cls]) => <span key={k} className={'rounded-full px-2 py-0.5 font-bold ' + cls}>{d.sanctions[k]} {label}</span>)}
            </span>
          </>
        )}
      </Block>

      {sm && (
        <Link to={'/partido/' + sm.matchId} className="block rounded-2xl border border-line bg-surface p-4">
          <Flag size={18} className="text-accent" />
          <p className="mt-1 text-lg font-extrabold leading-tight">{plural(sm.count, 'sanción', 'sanciones')}</p>
          <p className="text-xs text-muted">Partido con más sanciones · {sm.teamA.name} vs {sm.teamB.name}</p>
          <p className="mt-1 flex items-center gap-0.5 text-[11px] font-bold text-accent">Ver el partido <ChevronRight size={12} /></p>
        </Link>
      )}
    </div>
  )
}
