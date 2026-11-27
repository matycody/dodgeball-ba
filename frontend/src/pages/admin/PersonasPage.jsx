import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { Btn, Alert, inputCls, Skeleton } from '../../components/ui'
import PersonName from '../../components/PersonName'
import PersonaSheet from '../../components/PersonaSheet'
import { useConfirm } from '../../components/ConfirmProvider'
import SolicitudesPanel from './SolicitudesPanel'

const NO_MAIL = '@sinmail.pps'
const realMail = (e) => (e && !e.endsWith(NO_MAIL) ? e : '')
const EMPTY = { dni: '', name: '', email: '', sex: '', isPlayer: true, isReferee: false }
const PAGE = 50
const SIN_EQUIPO = '__sin_equipo__'
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const SEGS = [
  ['jugadores', 'Jugadores'],
  ['arbitros', 'Árbitros'],
  ['org', 'Organización'],
  ['registrados', 'Registrados'],
]
const IN_SEG = {
  jugadores: ({ p }) => Boolean(p?.isPlayer),
  arbitros: ({ p, u }) => Boolean(p?.isReferee || u?.roles.includes('REFEREE')),
  org: ({ u }) => Boolean(u?.roles.includes('ADMIN')),
  registrados: ({ p, u }) => Boolean(u && !p && !u.roles.length), // cuentas comunes: un familiar, un hincha
}
const SEG_HINT = {
  jugadores: 'Por equipo. Tocá un equipo para ver su plantel.',
  arbitros: 'Árbitros con ficha o con el rol designado.',
  org: 'Cuentas con rol de organizador.',
  registrados: 'Se registraron en la web pero no son jugadores, árbitros ni organización (un familiar, un hincha).',
}

// Una persona en una sola línea: nombre, datos mínimos y el acceso a Gestionar
function Fila({ p, u, onOpen }) {
  const baja = (p && !p.active) || (u && !u.active)
  const sub = p ? [p.dni, u?.email ?? (realMail(p.email) || 'sin mail')].join(' · ') : u?.username ? '@' + u.username : 'Sin ficha'
  const tag = baja ? ['De baja', 'text-danger'] : !u && p ? ['Sin cuenta', 'text-warn'] : null
  return (
    <button type="button" onClick={onOpen} aria-label={'Gestionar a ' + (p?.name ?? u.email)} className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left active:bg-surface-2">
      <div className="min-w-0 flex-1">
        {p ? <PersonName p={p} showReal className="block truncate text-sm font-bold" /> : <span className="block truncate text-sm font-bold">{u.email}</span>}
        <p className="truncate text-xs text-muted">{sub}</p>
      </div>
      {tag && <span className={'shrink-0 text-[10px] font-bold uppercase ' + tag[1]}>{tag[0]}</span>}
      <span className="shrink-0 text-xs font-bold text-accent">Gestionar</span>
    </button>
  )
}
const Lista = ({ children }) => <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">{children}</div>

// Personas: cada persona con su mini ficha. Los roles, el acceso y la baja se gestionan desde "Gestionar"
export default function PersonasPage() {
  const ask = useConfirm()
  const [params] = useSearchParams()
  const [profiles, setProfiles] = useState(null)
  const [users, setUsers] = useState(null)
  const [q, setQ] = useState(params.get('q') ?? '')
  const [seg, setSeg] = useState('jugadores')
  const [conBaja, setConBaja] = useState(params.has('q')) // desde un enlace se ve todo, activo o no
  const [openTeams, setOpenTeams] = useState(() => new Set())
  const [limit, setLimit] = useState(PAGE)
  const [selKey, setSelKey] = useState(null)
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
  useEffect(() => { setLimit(PAGE) }, [q, seg, conBaja])

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

  // Lo que pasa el buscador y el filtro de bajas; de acá salen los contadores de cada solapa
  const base = useMemo(() => {
    if (!entries) return null
    const t = norm(q.trim())
    return entries.filter(({ p, u }) => {
      if (!conBaja && ((p && !p.active) || (u && !u.active))) return false
      if (!t) return true
      const hay = [p?.name, p?.nickname, p?.dni, realMail(p?.email), u?.email, u?.username, ...(p?.teams ?? []).map((x) => x.name ?? x.team?.name)]
      return hay.some((v) => v && norm(v).includes(t))
    })
  }, [entries, q, conBaja])

  const counts = useMemo(() => Object.fromEntries(SEGS.map(([k]) => [k, base ? base.filter(IN_SEG[k]).length : 0])), [base])
  const lista = useMemo(() => (base ?? []).filter(IN_SEG[seg]), [base, seg])

  // Jugadores agrupados por equipo (uno puede estar en dos ramas); sin equipo al final
  const groups = useMemo(() => {
    if (seg !== 'jugadores') return []
    const map = new Map()
    for (const e of lista) {
      const ts = (e.p?.teams ?? []).map((t) => ({ id: t.teamId ?? t.team?.id, name: t.name ?? t.team?.name })).filter((t) => t.id)
      const mine = ts.length ? ts : [{ id: SIN_EQUIPO, name: 'Sin equipo' }]
      for (const t of mine) {
        if (!map.has(t.id)) map.set(t.id, { id: t.id, name: t.name, list: [] })
        if (!map.get(t.id).list.some((x) => x.key === e.key)) map.get(t.id).list.push(e)
      }
    }
    return [...map.values()].sort((a, b) => (a.id === SIN_EQUIPO) - (b.id === SIN_EQUIPO) || a.name.localeCompare(b.name, 'es'))
  }, [lista, seg])

  const buscando = q.trim().length > 0
  const isOpen = (id) => buscando || openTeams.has(id) // buscando, se abre todo para ver los resultados
  const toggleTeam = (id) => setOpenTeams((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allOpen = groups.length > 0 && groups.every((g) => openTeams.has(g.id))

  const sel = selKey && entries ? entries.find((e) => e.key === selKey) : null
  const closeSheet = () => { setSelKey(null); setOk(''); setErr('') }

  function startEdit(p) {
    setSelKey(null)
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

  return (
    <div className="space-y-4">
      <h1 className="text-xs font-bold uppercase tracking-widest text-muted">Personas</h1>
      {tab !== 'lista' && err && <Alert onClose={() => setErr('')}>{err}</Alert>}
      {tab !== 'lista' && ok && <Alert tone="ok" onClose={() => setOk('')}>{ok}</Alert>}
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
        {!sel && err && <Alert onClose={() => setErr('')}>{err}</Alert>}
        {!sel && ok && <Alert tone="ok" onClose={() => setOk('')}>{ok}</Alert>}
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input className={inputCls + ' pl-11'} type="search" enterKeyHint="search" placeholder="Buscar nombre, DNI, mail o equipo" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 text-sm font-bold [scrollbar-width:none]">
          {SEGS.map(([k, label]) => (
            <button key={k} onClick={() => setSeg(k)} aria-pressed={seg === k}
              className={'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 ' + (seg === k ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted')}>
              {label}<span className="font-mono text-xs tabular-nums">{counts[k]}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted">{SEG_HINT[seg]}</p>
          <label className="flex shrink-0 items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={conBaja} onChange={(e) => setConBaja(e.target.checked)} /> Incluir bajas</label>
        </div>

        {base === null && <Skeleton />}
        {base && lista.length === 0 && (
          <div className="space-y-2 py-4 text-center text-sm text-muted">
            <p>No hay nadie en {SEGS.find(([k]) => k === seg)[1].toLowerCase()}{buscando ? ' con esa búsqueda' : ''}.</p>
            {SEGS.filter(([k]) => k !== seg && counts[k] > 0).length > 0 && buscando && (
              <p>Sí hay resultados en: {SEGS.filter(([k]) => k !== seg && counts[k] > 0).map(([k, l]) => (
                <button key={k} onClick={() => setSeg(k)} className="ml-2 font-bold text-accent">{l} ({counts[k]})</button>
              ))}</p>
            )}
          </div>
        )}

        {seg === 'jugadores' && groups.length > 0 && (
          <>
            {!buscando && groups.length > 1 && (
              <button onClick={() => setOpenTeams(allOpen ? new Set() : new Set(groups.map((g) => g.id)))} className="text-xs font-bold text-accent">
                {allOpen ? 'Cerrar todos los equipos' : 'Abrir todos los equipos'}
              </button>
            )}
            <div className="space-y-2">
              {groups.map((g) => (
                <section key={g.id} className="overflow-hidden rounded-2xl border border-line bg-surface">
                  <button type="button" onClick={() => toggleTeam(g.id)} aria-expanded={isOpen(g.id)} className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left">
                    <span className="min-w-0 flex-1 truncate font-bold">{g.name}</span>
                    <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-muted">{g.list.length}</span>
                    <ChevronDown size={18} className={'shrink-0 text-muted transition-transform ' + (isOpen(g.id) ? 'rotate-180' : '')} />
                  </button>
                  {isOpen(g.id) && (
                    <div className="divide-y divide-line border-t border-line">
                      {g.list.map((e) => <Fila key={e.key} p={e.p} u={e.u} onOpen={() => setSelKey(e.key)} />)}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </>
        )}

        {seg !== 'jugadores' && lista.length > 0 && (
          <>
            <Lista>{lista.slice(0, limit).map((e) => <Fila key={e.key} p={e.p} u={e.u} onOpen={() => setSelKey(e.key)} />)}</Lista>
            {lista.length > limit && <Btn onClick={() => setLimit((n) => n + PAGE)} className="w-full">Mostrar más ({lista.length - limit} restantes)</Btn>}
          </>
        )}

        {sel && <PersonaSheet entry={sel} busy={busy} err={err} ok={ok} onClose={closeSheet} onClearMsg={() => { setErr(''); setOk('') }} run={run} ask={ask} onEdit={startEdit} />}
      </>}
    </div>
  )
}
