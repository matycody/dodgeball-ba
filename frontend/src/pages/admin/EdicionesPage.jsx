import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import MatchPicker from '../../components/admin/MatchPicker'
import MovimientosPanel from './MovimientosPanel'
import ResumenPanel from './ResumenPanel'

// Color del punto según el tipo de evento; lo que no reconozco queda gris
const DOT = {
  SET_ADD: 'bg-live',
  SET_REMOVE: 'bg-danger',
  MATCH_EDIT: 'bg-accent',
  MATCH_CANCEL: 'bg-danger',
}

export default function EdicionesPage() {
  const [matches, setMatches] = useState([])
  const [sel, setSel] = useState('')
  const [log, setLog] = useState(null)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState('summary')

  // Todos los partidos, por tandas de 200 (el servidor no entrega más por pedido)
  useEffect(() => {
    let alive = true
    ;(async () => {
      const all = []
      for (let offset = 0; offset < 4000; offset += 200) {
        const rows = await api('GET', '/matches?limit=200&offset=' + offset)
        all.push(...rows)
        if (rows.length < 200) break
      }
      if (alive) setMatches(all)
    })().catch((e) => alive && setErr(e.message))
    return () => { alive = false }
  }, [])
  useEffect(() => {
    if (!sel) return setLog(null)
    setErr('')
    api('GET', '/matches/' + sel + '/result-log').then(setLog).catch((e) => setErr(e.message))
  }, [sel])

  return (
    <div className="space-y-4">
      <h1 className="text-xs font-bold uppercase tracking-widest text-muted">Registro de ediciones</h1>
      <div className="flex gap-2 text-sm font-bold">
        <button onClick={() => setTab('summary')} className={'rounded-full border px-4 py-1.5 ' + (tab === 'summary' ? 'border-accent text-accent' : 'border-line text-muted')}>Resumen</button>
        <button onClick={() => setTab('matches')} className={'rounded-full border px-4 py-1.5 ' + (tab === 'matches' ? 'border-accent text-accent' : 'border-line text-muted')}>Partidos</button>
        <button onClick={() => setTab('users')} className={'rounded-full border px-4 py-1.5 ' + (tab === 'users' ? 'border-accent text-accent' : 'border-line text-muted')}>Movimientos</button>
      </div>
      {tab === 'summary' && <ResumenPanel />}
      {tab === 'users' && <MovimientosPanel />}
      {tab === 'matches' && <>
      {err && <p className="text-danger">{err}</p>}
      <MatchPicker matches={matches} value={sel} onChange={setSel} />

      {log?.length === 0 && <p className="text-muted">Sin actividad registrada en este partido.</p>}
      <div className="m-cascade space-y-2">
        {(log ?? []).map((l, i) => (
          <div key={i} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-sm">
            <span className={'mt-1.5 h-2 w-2 shrink-0 rounded-full ' + (DOT[l.type] ?? 'bg-muted')} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{l.description}</p>
              <p className="mt-1 text-xs text-muted">{l.by} · {new Date(l.at).toLocaleString('es-AR')}</p>
            </div>
          </div>
        ))}
      </div>
      </>}
    </div>
  )
}
