import { useEffect, useState } from 'react'
import { useTournamentLive } from '../../hooks/useTournamentLive'
import { Link } from 'react-router-dom'
import { Plus, Trash2, ChevronRight, Trophy } from 'lucide-react'
import { api } from '../../lib/api'
import { BRANCH, MODALITY, formatName, TSTATUS, fmtDate } from '../../lib/format'
import { Btn, Alert, inputCls, Skeleton } from '../../components/ui'
import { useConfirm } from '../../components/ConfirmProvider'
import TeamBadge from '../../components/TeamBadge'

export default function TorneosPage() {
  const ask = useConfirm()
  const [list, setList] = useState(null)
  const [yearFilter, setYearFilter] = useState('')
  const [view, setView] = useState('active') // active | deleted (papelera)
  const [err, setErr] = useState('')

  const load = () => api('GET', '/tournaments?limit=200' + (yearFilter ? '&year=' + yearFilter : '') + (view === 'deleted' ? '&deleted=true' : ''))
    .then(setList).catch((e) => setErr(e.message))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setList(null); load() }, [yearFilter, view])
  useTournamentLive(() => load())

  async function remove(t) {
    if (!(await ask({ title: 'Eliminar torneo', message: '¿Eliminar "' + t.name + '"? Deja de verse para todos, también para la organización. Lo encontrás en "Eliminados" para restaurarlo o borrarlo definitivamente.', confirmText: 'Eliminar', danger: true }))) return
    setErr('')
    try { await api('DELETE', '/tournaments/' + t.id); await load() } catch (e) { setErr(e.message) }
  }

  async function restore(t) {
    setErr('')
    try { await api('POST', '/tournaments/' + t.id + '/restore'); await load() } catch (e) { setErr(e.message) }
  }

  async function purge(t) {
    if (!(await ask({ title: 'Borrar definitivamente', message: '¿Borrar "' + t.name + '" para siempre? Se borran también todos sus partidos, resultados y estadísticas. No se puede deshacer.', confirmText: 'Borrar', cancelText: 'Volver', danger: true }))) return
    if (!(await ask({ title: 'Confirmar borrado', message: 'Última confirmación: "' + t.name + '" se elimina para siempre.', confirmText: 'Borrar para siempre', cancelText: 'Volver', danger: true }))) return
    setErr('')
    try { await api('DELETE', '/tournaments/' + t.id + '/purge'); await load() } catch (e) { setErr(e.message) }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xs font-bold uppercase tracking-widest text-muted">Torneos</h1>
      {err && <Alert onClose={() => setErr('')}>{err}</Alert>}

      <div className="flex gap-2">
        {[['active', 'Torneos'], ['deleted', 'Eliminados']].map(([k, label]) => (
          <button key={k} onClick={() => setView(k)} className={'flex-1 rounded-full border px-4 py-2 text-sm font-bold ' + (view === k ? 'border-accent bg-accent text-black' : 'border-line bg-surface')}>{label}</button>
        ))}
      </div>

      <Link to="/admin/torneos/nuevo" className={(view === 'deleted' ? 'hidden ' : '') + 'flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3.5 text-base font-extrabold text-black'}>
        <Plus size={20} /> Crear torneo
      </Link>

      <label className="block text-xs text-muted">Filtrar por año
        <input type="number" className={inputCls} placeholder="Todos" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} />
      </label>

      {list === null && <Skeleton />}
      {list?.length === 0 && <p className="text-muted">{view === 'deleted' ? 'No hay torneos eliminados.' : 'No hay torneos.'}</p>}
      {view === 'deleted' && list?.length > 0 && <p className="text-xs">Los torneos eliminados no los ve nadie. Restauralos para que vuelvan, o borralos definitivamente.</p>}
      <div className="m-cascade space-y-2">
        {view === 'deleted' && (list ?? []).map((t) => (
          <div key={t.id} className="space-y-3 rounded-2xl border border-line bg-surface p-4">
            <div className="min-w-0">
              <p className="truncate font-bold">{t.name}{t.edition ? ' · ' + t.edition : ''}</p>
              <p className="text-sm text-muted">
                {t.year} · {formatName(t)} · {BRANCH[t.branch]} · {MODALITY[t.modality]} · {t._count?.teams ?? 0} equipos
              </p>
              <p className="text-xs text-muted">Eliminado el {t.deletedAt ? new Date(t.deletedAt).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Btn tone="accent" onClick={() => restore(t)}>Restaurar</Btn>
              <Btn tone="danger" onClick={() => purge(t)}>Borrar definitivamente</Btn>
            </div>
          </div>
        ))}
        {view === 'active' && (list ?? []).map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
            <Link to={'/admin/torneos/' + t.id} className="flex min-w-0 flex-1 items-center gap-3">
              <TeamBadge team={{ name: t.name, logo: t.logo }} size="md" />
              <span className="min-w-0 flex-1">
              <p className="truncate font-bold">{t.name}{t.edition ? ' · ' + t.edition : ''}</p>
              <p className="text-sm text-muted">
                {t.year} · {formatName(t)} · {BRANCH[t.branch]} · {MODALITY[t.modality]} · {t._count?.teams ?? 0} equipos
              </p>
              <p className="flex items-center gap-2 text-xs text-muted">
                <span className={'rounded-full px-2 py-0.5 font-bold uppercase ' + TSTATUS[t.status].cls}>{TSTATUS[t.status].label}</span>
                {t.pausedAt && <span className="rounded-full bg-warn/20 px-2 py-0.5 font-bold uppercase text-warn">Pausado</span>}
                {t.champion && <span className="flex items-center gap-1"><Trophy size={12} /> {t.champion.name}</span>}
                <span>{fmtDate(t.startsAt)} → {fmtDate(t.endsAt)}</span>
              </p>
              </span>
            </Link>
            <button aria-label="Eliminar" onClick={() => remove(t)}><Trash2 size={18} className="text-danger" /></button>
            <Link to={'/admin/torneos/' + t.id} aria-label="Abrir"><ChevronRight size={18} className="text-muted" /></Link>
          </div>
        ))}
      </div>
    </div>
  )
}
