import { useState } from 'react'
import { api } from '../../lib/api'
import { Btn, Alert } from '../../components/ui'
import PersonName from '../../components/PersonName'
import { useConfirm } from '../../components/ConfirmProvider'
import { STRONG } from '../../lib/vinculacion'

const NO_MAIL = '@sinmail.pps'
const realMail = (e) => (e && !e.endsWith(NO_MAIL) ? e : '')
const Chip = ({ children, cls = 'bg-surface-2 text-muted' }) => (
  <span className={'rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ' + cls}>{children}</span>
)
const Label = ({ children }) => <p className="text-[11px] font-bold uppercase tracking-widest text-muted">{children}</p>

// Vinculación: cuentas que se registraron y que podrían ser personas ya inscriptas por la organización. El admin decide.
export default function VinculacionPanel({ matches, loading, onDismiss, onChange }) {
  const ask = useConfirm()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  async function vincular(u, p) {
    const confirmed = await ask({
      title: 'Vincular cuenta',
      message: 'La cuenta ' + u.email + ' pasa a ser ' + p.name + ' (DNI ' + p.dni + '). La ficha conserva todo su historial y usa el mail de esta cuenta.',
      confirmText: 'Vincular',
    })
    if (!confirmed) return
    setBusy(true); setErr(''); setOk('')
    try {
      await api('POST', '/profiles/' + p.id + '/link', { userId: u.id })
      setOk(p.name + ' quedó vinculada a ' + u.email)
      await onChange()
    } catch (e) { setErr(e.data?.error || e.message) } finally { setBusy(false) }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Si la persona se registra con el mismo mail que cargaste, se vincula sola. Acá aparecen las cuentas que se registraron con
        otro mail y que podrían ser personas que ya inscribiste. Vos decidís si son la misma.
      </p>
      {err && <Alert onClose={() => setErr('')}>{err}</Alert>}
      {ok && <Alert tone="ok" onClose={() => setOk('')}>{ok}</Alert>}
      {!loading && matches.length === 0 && <p className="py-6 text-center text-sm text-muted">No hay coincidencias por ahora.</p>}

      <div className="space-y-3">
        {matches.map(({ u, req, cands }) => (
          <div key={u.id} className="space-y-3 rounded-2xl border border-line bg-surface p-4">
            <div className="min-w-0 space-y-0.5">
              <Label>Se registró</Label>
              <p className="truncate font-bold">{u.email}</p>
              <p className="truncate text-xs text-muted">
                {[u.username && '@' + u.username, req ? 'Pidió el alta como ' + req.name + ' · DNI ' + req.dni : 'No pidió el alta'].filter(Boolean).join(' · ')}
              </p>
            </div>
            <Label>Podría ser</Label>
            {cands.map(({ p, why, score }) => (
              <div key={p.id} className="space-y-2 rounded-xl border border-line bg-surface-2 p-3">
                <div className="min-w-0">
                  <PersonName p={p} showReal className="block truncate font-bold" />
                  <p className="truncate text-xs text-muted">{p.dni} · inscripta con {realMail(p.email) || 'sin mail'}{(p.teams ?? []).length ? ' · ' + [...new Set(p.teams.map((t) => t.name ?? t.team?.name))].join(' · ') : ''}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {why.map((w) => <Chip key={w} cls={score >= STRONG ? 'bg-live/15 text-live' : 'bg-warn/15 text-warn'}>{w}</Chip>)}
                </div>
                <div className="flex gap-2">
                  <Btn tone="accent" disabled={busy} onClick={() => vincular(u, p)} className="flex-1">Vincular</Btn>
                  <Btn disabled={busy} onClick={() => onDismiss(u.id, p.id)}>No es la misma</Btn>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
