import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { Btn, Alert, inputCls, Skeleton } from '../../components/ui'
import PersonName from '../../components/PersonName'
import { useConfirm } from '../../components/ConfirmProvider'
import SolicitudesPanel from './SolicitudesPanel'

const NO_MAIL = '@sinmail.pps'
const realMail = (e) => (e && !e.endsWith(NO_MAIL) ? e : '')
const EMPTY = { dni: '', name: '', email: '', sex: '', isPlayer: true, isReferee: false }
const PAGE = 60
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const FILTROS = [
  ['activos', 'Activos'],
  ['jugadores', 'Jugadores'],
  ['arbitros', 'Árbitros'],
  ['admins', 'Organizadores'],
  ['sin_cuenta', 'Sin cuenta (pendientes)'],
  ['sin_ficha', 'Cuentas sin ficha'],
  ['inactivos', 'De baja o inactivos'],
  ['todos', 'Todos'],
]
const Chip = ({ children, cls = 'bg-surface-2 text-muted' }) => (
  <span className={'rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ' + cls}>{children}</span>
)
const Grupo = ({ children }) => <span className="text-[11px] font-bold uppercase tracking-widest text-muted">{children}</span>

// Personas y cuentas: la ficha (DNI, equipos, jugador/árbitro) y la cuenta de login (roles, acceso) de cada persona, juntas
export default function PersonasPage() {
  const ask = useConfirm()
  const [params] = useSearchParams()
  const [profiles, setProfiles] = useState(null)
  const [users, setUsers] = useState(null)
  const [q, setQ] = useState(params.get('q') ?? '')
  const [filtro, setFiltro] = useState(params.has('q') ? 'todos' : 'activos') // desde un enlace: se ve todo, activo o no
  const [limit, setLimit] = useState(PAGE)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null) // perfil en edición
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('lista') // lista | inscribir | req | demo
  const [pending, setPending] = useState(0)
  const [demo, setDemo] = useState(null)

  const load = () =>
    Promise.all([api('GET', '/profiles'), api('GET', '/users')])
      .then(([p, u]) => { setProfiles(p); setUsers(u) })
      .catch((e) => setErr(e.message))
  const countPending = () => api('GET', '/player-requests?status=PENDING').then((l) => setPending(l.length)).catch(() => {})
  useEffect(() => { load(); countPending() }, [])
  useEffect(() => { if (tab === 'demo') api('GET', '/users/demo').then(setDemo).catch((e) => setErr(e.message)) }, [tab])
  useEffect(() => { setLimit(PAGE) }, [q, filtro])

  async function run(fn, msg) {
    setBusy(true); setErr(''); setOk('')
    try { await fn(); await load(); if (msg) setOk(msg) } catch (e) { setErr(e.data?.errors?.join(' · ') || e.message) } finally { setBusy(false) }
  }

  // Une cada ficha con su cuenta (user.profileId) y suma las cuentas sin ficha
  const entries = useMemo(() => {
    if (!profiles || !users) return null
    const ids = new Set(profiles.map((p) => p.id))
    const byProfile = new Map(users.filter((u) => u.profileId && ids.has(u.profileId)).map((u) => [u.profileId, u]))
    const all = [
      ...profiles.map((p) => ({ key: 'p' + p.id, p, u: byProfile.get(p.id) ?? null })),
      ...users.filter((u) => !u.profileId || !ids.has(u.profileId)).map((u) => ({ key: 'u' + u.id, p: null, u })),
    ]
    return all.sort((x, y) => (x.p?.name ?? x.u.email).localeCompare(y.p?.name ?? y.u.email, 'es'))
  }, [profiles, users])

  const shown = useMemo(() => {
    if (!entries) return null
    const t = norm(q.trim())
    return entries.filter(({ p, u }) => {
      const baja = (p && !p.active) || (u && !u.active)
      const okFiltro = {
        activos: !baja,
        jugadores: !baja && p?.isPlayer,
        arbitros: !baja && (p?.isReferee || u?.roles.includes('REFEREE')),
        admins: u?.roles.includes('ADMIN') && u.active,
        sin_cuenta: p && !u,
        sin_ficha: u && !p,
        inactivos: baja,
        todos: true,
      }[filtro]
      if (!okFiltro) return false
      if (!t) return true
      const hay = [p?.name, p?.nickname, p?.dni, realMail(p?.email), u?.email, u?.username, ...(p?.teams ?? []).map((x) => x.name ?? x.team?.name)]
      return hay.some((v) => v && norm(v).includes(t))
    })
  }, [entries, q, filtro])

  function startEdit(p) {
    setEditing(p)
    setTab('inscribir')
    setForm({ dni: p.dni, name: p.name, email: realMail(p.email), sex: p.sex ?? '', isPlayer: p.isPlayer, isReferee: p.isReferee })
  }
  const reset = () => { setEditing(null); setForm(EMPTY) }

  function submit(e) {
    e.preventDefault()
    const body = { dni: form.dni.trim(), name: form.name.trim(), isPlayer: form.isPlayer, isReferee: form.isReferee }
    if (form.sex) body.sex = form.sex
    if (!editing) body.email = form.email.trim()
    // El mail solo se cambia mientras esté pendiente de vinculación
    if (editing && editing.status === 'PENDIENTE_VINCULACION') body.email = form.email.trim()
    run(async () => {
      if (editing) await api('PATCH', '/profiles/' + editing.id, body)
      else await api('POST', '/profiles', body)
      const wasEditing = Boolean(editing)
      reset()
      if (wasEditing) setTab('lista')
    }, editing ? 'Persona actualizada' : 'Persona inscripta')
  }

  const emailLocked = editing && editing.status !== 'PENDIENTE_VINCULACION'
  const pill = (k, label, extra) => (
    <button key={k} onClick={() => setTab(k)} className={'rounded-full border px-4 py-1.5 ' + (tab === k ? 'border-accent text-accent' : 'border-line text-muted')}>{label}{extra}</button>
  )
  const ROLE = { ADMIN: 'Organizador', REFEREE: 'Árbitro', PLAYER: 'Jugador' }

  return (
    <div className="space-y-4">
      <h1 className="text-xs font-bold uppercase tracking-widest text-muted">Personas y cuentas</h1>
      {err && <Alert onClose={() => setErr('')}>{err}</Alert>}
      {ok && <Alert tone="ok" onClose={() => setOk('')}>{ok}</Alert>}
      <div className="flex flex-wrap gap-2 text-sm font-bold">
        {pill('lista', 'Personas')}
        {pill('inscribir', editing ? 'Editar' : 'Inscribir')}
        {pill('req', 'Solicitudes', pending > 0 && <span className="ml-1.5 inline-block min-w-5 rounded-full bg-danger px-1.5 text-center text-xs font-extrabold leading-5 text-white">{pending}</span>)}
        {pill('demo', 'Datos demo')}
      </div>

      {tab === 'inscribir' && <form onSubmit={submit} className="space-y-3 rounded-3xl border border-line bg-surface p-5">
        <p className="text-sm font-bold">{editing ? 'Editar persona' : 'Inscribir jugador o árbitro'}</p>
        <input className={inputCls} placeholder="Nombre completo" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
          <input className={inputCls} placeholder="DNI (8 números)" required inputMode="numeric" maxLength={8} pattern="\d{8}" title="El DNI debe tener 8 números" value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value.replace(/\D/g, '').slice(0, 8) })} />
          <select className={inputCls} value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
            <option value="">Sexo…</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </select>
        </div>
        <input className={inputCls} type="email" placeholder="Mail (opcional, gmail u hotmail)" pattern="[^\s@]+@(gmail\.com|hotmail\.com|hotmail\.com\.ar|hotmail\.es)" title="Tiene que ser un mail gmail o hotmail" disabled={emailLocked} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value.toLowerCase() })} />
        {emailLocked && <p className="text-xs text-muted">El mail solo se cambia mientras esté pendiente de vinculación. Usá "Desvincular".</p>}
        <div className="flex gap-4 text-sm font-semibold">
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.isPlayer} onChange={(e) => setForm({ ...form, isPlayer: e.target.checked })} /> Jugador</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.isReferee} onChange={(e) => setForm({ ...form, isReferee: e.target.checked })} /> Árbitro</label>
        </div>
        {form.isPlayer && !form.sex && <p className="text-xs text-warn">El sexo es obligatorio para jugadores.</p>}
        <div className="flex gap-2">
          <Btn type="submit" tone="accent" disabled={busy || (!form.isPlayer && !form.isReferee) || (form.isPlayer && !form.sex)} className="flex-1">
            {editing ? 'Guardar' : 'Inscribir'}
          </Btn>
          {editing && <Btn onClick={() => { reset(); setTab('lista') }}>Cancelar</Btn>}
        </div>
      </form>}

      {tab === 'req' && <SolicitudesPanel onChange={() => { countPending(); load() }} />}

      {tab === 'demo' && (
        <div className="m-cascade space-y-3">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="font-bold">Jugadores de demostración</p>
            <p className="mt-1 text-sm text-muted">Son los jugadores sin login creados para completar los planteles (mail @demo.pps). Se borran junto con su pertenencia a los equipos. No toca personas reales.</p>
            {demo === null ? <Skeleton /> : <p className="mt-3 text-3xl font-extrabold tabular-nums">{demo.players}</p>}
            <Btn
              disabled={busy || !demo?.players}
              tone="danger" className="mt-3"
              onClick={async () => {
                if (!(await ask({ title: 'Borrar jugadores demo', message: 'Se borran ' + demo.players + ' jugadores de demostración y sus vínculos a equipos. No se puede deshacer.', confirmText: 'Borrar todos', danger: true }))) return
                setBusy(true); setErr('')
                try { await api('DELETE', '/users/demo'); setDemo(await api('GET', '/users/demo')); await load() } catch (e) { setErr(e.message) } finally { setBusy(false) }
              }}
            >Borrar todos los jugadores demo</Btn>
          </div>
        </div>
      )}

      {tab === 'lista' && <>
        <div className="flex gap-2">
          <input className={inputCls} placeholder="Buscar nombre, DNI, mail, usuario o equipo" value={q} onChange={(e) => setQ(e.target.value)} />
          <span className="grid w-12 shrink-0 place-items-center rounded-xl border border-line text-muted"><Search size={18} /></span>
        </div>
        <div className="flex items-center gap-3">
          <select className={inputCls + ' max-w-60'} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            {FILTROS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          {shown && <span className="text-xs font-semibold text-muted">{shown.length} {shown.length === 1 ? 'resultado' : 'resultados'}</span>}
        </div>

        {shown === null && <Skeleton />}
        {shown?.length === 0 && <p className="text-muted">No hay personas ni cuentas con ese filtro.</p>}
        <div className="m-cascade space-y-2">
          {(shown ?? []).slice(0, limit).map(({ key, p, u }) => {
            const mail = u?.email ?? realMail(p?.email)
            const isAdmin = u?.roles.includes('ADMIN')
            return (
              <div key={key} className="space-y-2 rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {p ? <PersonName p={p} showReal className="block truncate font-bold" /> : <p className="truncate font-bold">{u.email}</p>}
                    <p className="truncate text-xs text-muted">{[p?.dni, mail || 'sin mail', u?.username && '@' + u.username].filter(Boolean).join(' · ')}</p>
                  </div>
                  <Chip cls={!u ? 'bg-warn/15 text-warn' : u.active ? 'bg-live/15 text-live' : 'bg-danger/15 text-danger'}>
                    {!u ? 'Sin cuenta' : u.active ? 'Con cuenta' : 'Cuenta inactiva'}
                  </Chip>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p?.isPlayer && <Chip cls="bg-accent-soft text-accent">Jugador</Chip>}
                  {p?.isReferee && <Chip cls="bg-accent-soft text-accent">Árbitro</Chip>}
                  {isAdmin && <Chip cls="bg-accent-soft text-accent">{ROLE.ADMIN}</Chip>}
                  {u && !p && !u.roles.length && <Chip>Registrado (sin ficha)</Chip>}
                  {p && !p.active && <Chip cls="bg-danger/15 text-danger">Ficha de baja</Chip>}
                  {(p?.teams ?? []).map((t) => <Chip key={(t.teamId ?? t.team?.id) + t.branch}>{t.name ?? t.team?.name}</Chip>)}
                </div>
                <div className="space-y-1.5 pt-1 text-sm font-bold">
                  {p && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <Grupo>Ficha</Grupo>
                      <button disabled={busy} className="text-accent" onClick={() => startEdit(p)}>Editar</button>
                      {u && (
                        <button disabled={busy} className="text-warn" onClick={async () => {
                          const email = await ask({ title: 'Desvincular cuenta', message: 'Mail nuevo para ' + p.name, input: { type: 'email', placeholder: 'nuevo@mail.com' }, confirmText: 'Desvincular' })
                          if (email) run(() => api('POST', '/profiles/' + p.id + '/unlink', { email: email.trim() }), 'Cuenta desvinculada')
                        }}>Desvincular</button>
                      )}
                      {p.active
                        ? <button disabled={busy} className="text-danger" onClick={async () => (await ask({ title: 'Dar de baja', message: '¿Dar de baja a ' + p.name + '?', confirmText: 'Dar de baja', danger: true })) && run(() => api('DELETE', '/profiles/' + p.id), 'Baja realizada')}>Dar de baja</button>
                        : <button disabled={busy} className="text-live" onClick={() => run(() => api('PATCH', '/profiles/' + p.id, { active: true }), 'Reactivado (volvé a asignarle equipo)')}>Reactivar</button>}
                    </div>
                  )}
                  {u && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <Grupo>Cuenta</Grupo>
                      {u.active && !u.roles.includes('REFEREE') && <button disabled={busy} className="text-accent" onClick={async () => (await ask({ title: 'Designar árbitro', message: '¿Designar a ' + u.email + ' como árbitro?', confirmText: 'Designar' })) && run(() => api('POST', '/users/' + u.id + '/referee'), 'Árbitro designado')}>Designar árbitro</button>}
                      {u.active && u.roles.includes('REFEREE') && <button disabled={busy} className="text-warn" onClick={async () => (await ask({ title: 'Quitar árbitro', message: '¿Quitar el rol de árbitro a ' + u.email + '?', confirmText: 'Quitar', danger: true })) && run(() => api('DELETE', '/users/' + u.id + '/referee'), 'Rol de árbitro quitado')}>Quitar árbitro</button>}
                      {u.active && !isAdmin && <button disabled={busy} className="text-accent" onClick={async () => (await ask({ title: 'Hacer admin', message: '¿Hacer admin a ' + u.email + '?', confirmText: 'Hacer admin' })) && run(() => api('POST', '/users/' + u.id + '/promote'), 'Ahora es organizador')}>Hacer admin</button>}
                      {u.active && isAdmin && <button disabled={busy} className="text-warn" onClick={async () => (await ask({ title: 'Quitar admin', message: '¿Quitar admin a ' + u.email + '?', confirmText: 'Quitar admin', danger: true })) && run(() => api('POST', '/users/' + u.id + '/demote'), 'Ya no es organizador')}>Quitar admin</button>}
                      {u.active
                        ? <button disabled={busy} className="text-danger" onClick={async () => (await ask({ title: 'Desactivar usuario', message: '¿Desactivar a ' + u.email + '?', confirmText: 'Desactivar', danger: true })) && run(() => api('DELETE', '/users/' + u.id), 'Cuenta desactivada')}>Desactivar</button>
                        : <button disabled={busy} className="text-live" onClick={() => run(() => api('POST', '/users/' + u.id + '/reactivate'), 'Cuenta reactivada')}>Reactivar</button>}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {shown && shown.length > limit && <Btn onClick={() => setLimit((n) => n + PAGE)} className="w-full">Mostrar más ({shown.length - limit} restantes)</Btn>}
      </>}
    </div>
  )
}
