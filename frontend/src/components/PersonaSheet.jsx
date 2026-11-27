import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { api } from '../lib/api'
import PersonName from './PersonName'
import { Alert } from './ui'

const NO_MAIL = '@sinmail.pps'
const realMail = (e) => (e && !e.endsWith(NO_MAIL) ? e : '')
export const isDemo = (p) => /@demo\.pps$/i.test(p?.email ?? '')

const Chip = ({ children, cls = 'bg-surface-2 text-muted' }) => (
  <span className={'rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ' + cls}>{children}</span>
)
const Grupo = ({ children }) => <p className="pt-2 text-[11px] font-bold uppercase tracking-widest text-muted">{children}</p>
const Dato = ({ label, children }) => children ? (
  <div className="flex items-baseline justify-between gap-4 text-sm">
    <dt className="shrink-0 text-muted">{label}</dt>
    <dd className="min-w-0 truncate text-right font-semibold">{children}</dd>
  </div>
) : null
// Acción de 48 px de alto: cómoda para el pulgar
const Accion = ({ children, hint, tone = '', onClick, disabled }) => (
  <button type="button" disabled={disabled} onClick={onClick}
    className={'flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-left text-sm font-bold disabled:opacity-50 ' + tone}>
    <span>{children}</span>
    {hint && <span className="text-right text-xs font-normal text-muted">{hint}</span>}
  </button>
)

// Mini ficha de una persona + todo lo que la organización puede hacer con ella (roles, acceso, baja)
export default function PersonaSheet({ entry, busy, err, ok, onClose, onClearMsg, run, ask, onEdit }) {
  const { p, u } = entry
  const isAdmin = u?.roles.includes('ADMIN')
  const isRef = u?.roles.includes('REFEREE')
  const mail = u?.email ?? realMail(p?.email)
  const teams = [...new Set((p?.teams ?? []).map((t) => t.name ?? t.team?.name).filter(Boolean))]

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Se dibuja fuera de la página: la animación de entrada de la pantalla rompe el position:fixed de lo que está adentro
  // (con mucho scroll la hoja quedaba arriba, fuera de la vista). Dentro de [data-role] para conservar el color del rol.
  const host = typeof document !== 'undefined' ? (document.querySelector('[data-role]') ?? document.body) : null
  const sheet = (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-3xl sm:pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {p ? <PersonName p={p} showReal className="block truncate text-lg font-extrabold" /> : <p className="truncate text-lg font-extrabold">{u.email}</p>}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {p?.isPlayer && <Chip cls="bg-accent-soft text-accent">Jugador</Chip>}
              {(p?.isReferee || isRef) && <Chip cls="bg-accent-soft text-accent">Árbitro</Chip>}
              {isAdmin && <Chip cls="bg-accent-soft text-accent">Organizador</Chip>}
              {u && !p && !u.roles.length && <Chip>Registrado</Chip>}
              {p && !p.active && <Chip cls="bg-danger/15 text-danger">Ficha de baja</Chip>}
              {!u ? <Chip cls="bg-warn/15 text-warn">Sin cuenta</Chip> : !u.active && <Chip cls="bg-danger/15 text-danger">Cuenta inactiva</Chip>}
            </div>
          </div>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line"><X size={18} /></button>
        </div>

        <dl className="space-y-1.5 rounded-2xl border border-line p-3">
          <Dato label="DNI">{p?.dni}</Dato>
          <Dato label="Mail">{mail}</Dato>
          <Dato label="Usuario">{u?.username && '@' + u.username}</Dato>
          <Dato label={teams.length > 1 ? 'Equipos' : 'Equipo'}>{teams.join(' · ')}</Dato>
        </dl>

        {err && <Alert onClose={onClearMsg}>{err}</Alert>}
        {ok && <Alert tone="ok" onClose={onClearMsg}>{ok}</Alert>}

        {!u && p && (
          <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-xs text-muted">
            {realMail(p.email) ? 'Todavía no se registró. Cuando entre con ' + p.email + ' se vincula sola.' : 'No tiene mail cargado: no se puede vincular a una cuenta.'}
          </p>
        )}

        {u?.active && (
          <>
            <Grupo>Roles</Grupo>
            {isRef
              ? <Accion disabled={busy} tone="text-warn" hint="Es árbitro" onClick={async () => (await ask({ title: 'Quitar árbitro', message: '¿Quitar el rol de árbitro a ' + u.email + '?', confirmText: 'Quitar', danger: true })) && run(() => api('DELETE', '/users/' + u.id + '/referee'), 'Rol de árbitro quitado')}>Quitar árbitro</Accion>
              : <Accion disabled={busy} tone="text-accent" onClick={async () => (await ask({ title: 'Designar árbitro', message: '¿Designar a ' + u.email + ' como árbitro?', confirmText: 'Designar' })) && run(() => api('POST', '/users/' + u.id + '/referee'), 'Árbitro designado')}>Designar árbitro</Accion>}
            {isAdmin
              ? <Accion disabled={busy} tone="text-warn" hint="Es organizador" onClick={async () => (await ask({ title: 'Quitar admin', message: '¿Quitar admin a ' + u.email + '?', confirmText: 'Quitar admin', danger: true })) && run(() => api('POST', '/users/' + u.id + '/demote'), 'Ya no es organizador')}>Quitar organizador</Accion>
              : <Accion disabled={busy} tone="text-accent" onClick={async () => (await ask({ title: 'Hacer admin', message: '¿Hacer admin a ' + u.email + '?', confirmText: 'Hacer admin' })) && run(() => api('POST', '/users/' + u.id + '/promote'), 'Ahora es organizador')}>Hacer organizador</Accion>}
          </>
        )}

        {(p || u) && <Grupo>Acceso y ficha</Grupo>}
        {p && (p.active
          ? <Accion disabled={busy} tone="text-danger" hint="Sale de sus equipos" onClick={async () => (await ask({ title: 'Dar de baja', message: '¿Dar de baja a ' + p.name + '?', confirmText: 'Dar de baja', danger: true })) && run(() => api('DELETE', '/profiles/' + p.id), 'Baja realizada')}>Dar de baja como jugador o árbitro</Accion>
          : <Accion disabled={busy} tone="text-live" hint="Después asignale equipo" onClick={() => run(() => api('PATCH', '/profiles/' + p.id, { active: true }), 'Reactivado (volvé a asignarle equipo)')}>Reactivar ficha</Accion>)}
        {u && (u.active
          ? <Accion disabled={busy} tone="text-danger" hint="No podrá entrar" onClick={async () => (await ask({ title: 'Desactivar usuario', message: '¿Desactivar a ' + u.email + '?', confirmText: 'Desactivar', danger: true })) && run(() => api('DELETE', '/users/' + u.id), 'Cuenta desactivada')}>Desactivar cuenta</Accion>
          : <Accion disabled={busy} tone="text-live" onClick={() => run(() => api('POST', '/users/' + u.id + '/reactivate'), 'Cuenta reactivada')}>Reactivar cuenta</Accion>)}
        {p && u && (
          <Accion disabled={busy} tone="text-warn" hint="Si perdió el acceso al mail" onClick={async () => {
            const email = await ask({ title: 'Desvincular cuenta', message: 'Mail nuevo para ' + p.name, input: { type: 'email', placeholder: 'nuevo@mail.com' }, confirmText: 'Desvincular' })
            if (email) run(() => api('POST', '/profiles/' + p.id + '/unlink', { email: email.trim() }), 'Cuenta desvinculada')
          }}>Desvincular de la cuenta</Accion>
        )}
        {p && isDemo(p) && <Accion disabled={busy} tone="text-accent" hint="Solo cuentas demo" onClick={() => onEdit(p)}>Editar datos</Accion>}
      </div>
    </div>
  )
  return host ? createPortal(sheet, host) : sheet
}
