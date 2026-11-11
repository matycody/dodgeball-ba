import { useEffect, useState } from 'react'
import { Bug, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { Alert, inputCls } from '../../components/ui'
import { useConfirm } from '../../components/ConfirmProvider'

const STATUS = {
  NEW: ['Nuevo', 'text-warn'],
  IN_REVIEW: ['En revisión', 'text-accent'],
  RESOLVED: ['Resuelto', 'text-live'],
  DISCARDED: ['Descartado', 'text-muted'],
}
const KIND = { ERROR: 'Error', VISUAL: 'Se ve mal', SUGGESTION: 'Sugerencia', OTHER: 'Otro' }
const when = (d) => new Date(d).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

function Report({ r, onChange, onError }) {
  const ask = useConfirm()
  const [note, setNote] = useState(r.adminNote ?? '')
  const [zoom, setZoom] = useState(null)
  const [label, cls] = STATUS[r.status]

  async function patch(body) {
    try { await api('PATCH', '/reports/' + r.id, body); await onChange() } catch (e) { onError(e.message) }
  }
  async function remove() {
    if (!(await ask({ title: 'Borrar reporte', message: 'Se borra el reporte y sus capturas. No se puede deshacer.', confirmText: 'Borrar', danger: true }))) return
    try { await api('DELETE', '/reports/' + r.id); await onChange() } catch (e) { onError(e.message) }
  }
  const who = r.user ? (r.user.name || r.user.username || r.user.email) : (r.contactEmail || 'Sin cuenta')

  return (
    <div className="space-y-3 rounded-3xl border border-line bg-surface p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className={'rounded-full border border-line px-2 py-0.5 text-[11px] font-bold ' + cls}>{label}</span>
        <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-bold text-muted">{KIND[r.kind]}</span>
        <span className="ml-auto text-xs text-muted">{when(r.createdAt)}</span>
      </div>
      <p className="whitespace-pre-wrap font-semibold">{r.message}</p>

      {r.images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {r.images.map((u, i) => (
            <button key={u} type="button" onClick={() => setZoom(u)} className="h-24 w-24 overflow-hidden rounded-2xl border border-line">
              <img src={u} alt={'Captura ' + (i + 1)} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="space-y-0.5 text-xs text-muted">
        <p>De: {who}{r.user?.roles?.length ? ' · ' + r.user.roles.join(', ') : ''}</p>
        {r.page && <p>Pantalla: <a href={r.page} target="_blank" rel="noreferrer" className="font-bold text-accent">{r.page}</a></p>}
        {r.viewport && <p>Ventana: {r.viewport}</p>}
        {r.userAgent && <p className="break-words">Dispositivo: {r.userAgent}</p>}
      </div>
      {Array.isArray(r.consoleErrors) && r.consoleErrors.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer font-bold text-muted">Errores de consola ({r.consoleErrors.length})</summary>
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded-xl border border-line bg-surface-2 p-2">{r.consoleErrors.join('\n')}</pre>
        </details>
      )}

      <textarea className={inputCls + ' min-h-16 text-sm'} maxLength={1000} placeholder="Nota interna (solo la organización)" value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (r.adminNote ?? '') && patch({ adminNote: note })} />
      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(STATUS).filter(([k]) => k !== r.status).map(([k, [l]]) => (
          <button key={k} type="button" onClick={() => patch({ status: k, ...(note !== (r.adminNote ?? '') ? { adminNote: note } : {}) })} className="rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs font-bold">{'Pasar a ' + l.toLowerCase()}</button>
        ))}
        <button type="button" aria-label="Borrar reporte" onClick={remove} className="ml-auto grid h-9 w-9 place-items-center rounded-full border border-line text-danger"><Trash2 size={16} /></button>
      </div>

      {zoom && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" onClick={() => setZoom(null)}>
          <img src={zoom} alt="Captura ampliada" className="max-h-full max-w-full rounded-2xl" />
        </div>
      )}
    </div>
  )
}

// Organización: todos los reportes de problemas que mandó la gente
export default function ReportesPage() {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('')
  const [kind, setKind] = useState('')
  const [err, setErr] = useState('')

  const load = () => api('GET', '/reports?' + new URLSearchParams({ ...(status ? { status } : {}), ...(kind ? { kind } : {}) }))
    .then(setData).catch((e) => setErr(e.message))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [status, kind])

  const chip = (active) => 'rounded-full border px-3 py-1.5 text-xs font-bold ' + (active ? 'border-accent bg-accent text-black' : 'border-line bg-surface')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Bug size={22} className="text-accent" />
        <h1 className="text-xs font-bold uppercase tracking-widest text-muted">Reportes</h1>
      </div>
      {err && <Alert onClose={() => setErr('')}>{err}</Alert>}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setStatus('')} className={chip(!status)}>Todos</button>
        {Object.entries(STATUS).map(([k, [l]]) => (
          <button key={k} type="button" onClick={() => setStatus(k)} className={chip(status === k)}>{l}{data ? ' (' + data.counts[k] + ')' : ''}</button>
        ))}
      </div>
      <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value)}>
        <option value="">Todos los tipos</option>
        {Object.entries(KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>

      {!data && !err && <p className="text-muted">Cargando…</p>}
      {data?.items.length === 0 && <p className="text-muted">No hay reportes con este filtro.</p>}
      <div className="m-cascade space-y-3">
        {(data?.items ?? []).map((r) => <Report key={r.id} r={r} onChange={load} onError={setErr} />)}
      </div>
    </div>
  )
}
