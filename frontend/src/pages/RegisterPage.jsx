import { useEffect, useState } from 'react'
import { passwordError, PASSWORD_HINT } from '../lib/password'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/authStore'
import { Btn, Alert, inputCls } from '../components/ui'
import { Check, ChevronRight, Eye, EyeOff, Trophy, Users } from 'lucide-react'
import Stepper from '../components/Stepper'
import TeamBadge from '../components/TeamBadge'

const BRANCH_LABEL = { MIXED: 'Mixto', MALE: 'Masculino', FEMALE: 'Femenino' }
const ALLOWED = { M: ['MIXED', 'MALE'], F: ['MIXED', 'FEMALE'] }

// Código de verificación: casillas separadas sobre un input real (así siguen funcionando el pegado y el autocompletado del código por SMS/mail)
function OtpBoxes({ value, onChange }) {
  const n = Math.min(8, Math.max(6, value.length))
  return (
    <div className="relative">
      <div className="flex justify-center gap-2">
        {Array.from({ length: n }, (_, i) => (
          <div key={i} className={'grid h-14 w-11 place-items-center rounded-xl border-2 bg-surface-2 text-2xl font-extrabold ' + (i === Math.min(value.length, n - 1) ? 'border-accent' : value[i] ? 'border-line' : 'border-line')}>
            {value[i] ?? ''}
          </div>
        ))}
      </div>
      <input className="absolute inset-0 h-full w-full opacity-0" inputMode="numeric" autoComplete="one-time-code" required maxLength={8} autoFocus aria-label="Código de verificación"
        value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))} />
    </div>
  )
}

// Requisitos de la contraseña en vivo (las mismas reglas de lib/password, solo mostradas una por una)
function PassChecks({ pass }) {
  const rules = [
    ['Empieza con mayúscula', /^[A-Z]/.test(pass)],
    ['Lleva al menos un número', /[0-9]/.test(pass)],
    ['Tiene letras además de la inicial', /[a-zA-Z]/.test(pass.slice(1))],
    ['Mínimo 6 caracteres', pass.length >= 6],
  ]
  const ok = rules.filter((r) => r[1]).length
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <div className="mb-2 flex gap-1" aria-hidden="true">
        {rules.map((_, i) => <span key={i} className={'h-1.5 flex-1 rounded-full ' + (i < ok ? 'bg-accent' : 'bg-line')} />)}
      </div>
      <ul className="space-y-1 text-xs font-semibold">
        {rules.map(([t, v]) => (
          <li key={t} className={'flex items-center gap-2 ' + (v ? 'text-accent' : 'text-muted')}>
            <span className={'grid h-4 w-4 place-items-center rounded-full ' + (v ? 'bg-accent text-black' : 'border border-line')}>{v && <Check size={11} strokeWidth={3} />}</span>{t}
          </li>
        ))}
      </ul>
    </div>
  )
}

// Tarjeta con título para agrupar los campos (menos cosas juntas a la vez)
const Group = ({ title, children }) => (
  <div className="space-y-2.5 rounded-2xl border border-line bg-surface p-3.5">
    <p className="text-xs font-bold uppercase tracking-widest text-muted">{title}</p>
    {children}
  </div>
)

// Pasos: mail -> código -> contraseña -> datos de jugador (queda pendiente de aprobación)
export default function RegisterPage() {
  const navigate = useNavigate()
  const tipo = useSearchParams()[0].get('tipo')
  const [guest, setGuest] = useState(tipo === 'invitado') // familiar o amigo: solo cuenta, sin alta de jugador
  const { session, user, loading } = useAuthStore()
  const [step, setStep] = useState(tipo ? 'mail' : 'tipo') // 'tipo': elegir si es jugador o solo seguidor
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [uname, setUname] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const [teams, setTeams] = useState([])
  const [f, setF] = useState({ name: '', dni: '', sex: '', number: '' })
  const [picks, setPicks] = useState({}) // { MIXED: teamId, MALE: teamId, FEMALE: teamId }

  // Con sesión abierta se salta directo al formulario (o se manda al inicio si ya tiene perfil)
  useEffect(() => {
    if (loading || !session || (step !== 'mail' && step !== 'tipo')) return
    if (user?.profileId || user?.roles?.length) return navigate('/', { replace: true })
    if (guest) return navigate('/', { replace: true })
    setEmail(session.user?.email ?? '')
    setStep('form')
  }, [loading, session, user, step, navigate, guest])

  useEffect(() => {
    if (step === 'form') api('GET', '/teams').then(setTeams).catch((e) => setErr(e.message))
  }, [step])

  const run = async (fn) => {
    setErr(''); setBusy(true)
    try { await fn() } catch (e) { setErr(e.data?.errors?.join(' · ') || e.message || 'Error') } finally { setBusy(false) }
  }

  const sendCode = (e) => {
    e.preventDefault()
    run(async () => {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } })
      if (error) throw error
      setStep('code')
    })
  }

  const verify = (e) => {
    e.preventDefault()
    run(async () => {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
      if (error) throw new Error('Código incorrecto o vencido')
      setStep('pass')
    })
  }

  const setPassword = (e) => {
    e.preventDefault()
    if (passwordError(pass)) return setErr(passwordError(pass))
    if (pass !== pass2) return setErr('Las contraseñas no coinciden')
    if (!/^[a-zA-Z0-9._]{3,20}$/.test(uname.trim())) return setErr('Usuario: 3 a 20 caracteres, solo letras, números, punto y guion bajo')
    run(async () => {
      await api('PATCH', '/me/username', { username: uname.trim() }) // primero: si está en uso no se toca la contraseña
      const { error } = await supabase.auth.updateUser({ password: pass })
      if (error) throw error
      // Cuenta que ya existía y está completa (jugador, árbitro, admin): directo al inicio
      const me = await api('GET', '/me').catch(() => null)
      if (guest || me?.user?.profileId || me?.user?.roles?.length) navigate('/', { replace: true })
      else setStep('form')
    })
  }

  const branches = ALLOWED[f.sex] ?? []
  const teamsFor = (b) => teams.filter((t) => (t.branches ?? []).includes(b))
  const chosen = branches.filter((b) => picks[b]).map((b) => ({ teamId: picks[b], branch: b }))

  const submit = (e) => {
    e.preventDefault()
    if (!chosen.length) return setErr('Elegí al menos un equipo')
    run(async () => {
      await api('POST', '/player-requests', {
        name: f.name.trim(), dni: f.dni, sex: f.sex, number: f.number === '' ? null : Number(f.number), teams: chosen,
      })
      navigate('/', { replace: true })
    })
  }

  const titles = { tipo: '¿Cómo querés registrarte?', mail: guest ? 'Creá tu cuenta' : 'Registrate', code: 'Ingresá el código', pass: 'Elegí tu contraseña', form: 'Tus datos de jugador' }
  const stepKeys = guest ? ['mail', 'code', 'pass'] : ['mail', 'code', 'pass', 'form']
  const stepLabels = { mail: 'Mail', code: 'Código', pass: 'Clave', form: 'Datos' }
  const eye = (
    <button type="button" onClick={() => setShowPass((v) => !v)} aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center text-muted">
      {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
    </button>
  )
  const choice = 'e-lift e-press flex w-full items-center gap-3.5 rounded-2xl border bg-surface p-4 text-left'

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 pb-10 pt-[calc(2.5rem+env(safe-area-inset-top))]">
      <Link to="/login" className="e-in e-press mb-6 w-fit rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-bold">← Volver al login</Link>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">Dodgeball</p>
      <h1 key={step} className="e-in mb-2 mt-1 text-3xl font-extrabold">{titles[step]}</h1>
      {step === 'tipo' && <p className="mb-6 text-sm text-muted">Elegí la opción que te corresponde. Después te pedimos confirmar tu mail.</p>}
      {step === 'mail' && <p className="mb-6 text-sm text-muted">{guest ? 'Para seguir partidos y equipos. ' : ''}Te mandamos un código al mail para confirmar que es tuyo.</p>}
      {step === 'code' && <p className="mb-6 text-sm text-muted">Lo enviamos a {email}. Revisá también spam o promociones.</p>}
      {step === 'form' && <p className="mb-6 text-sm text-muted">La organización los revisa contra la planilla de inscripción y te habilita.</p>}

      {step !== 'tipo' && <Stepper steps={stepKeys.map((k) => stepLabels[k])} current={Math.max(0, stepKeys.indexOf(step))} title={guest ? 'Cuenta de seguidor' : 'Registro de jugador'} />}

      {err && <div className="mb-3"><Alert onClose={() => setErr('')}>{err}</Alert></div>}

      <div key={step} className="step-in">
      {step === 'tipo' && (
        <div className="m-stagger flex flex-col gap-3">
          <button type="button" onClick={() => { setGuest(false); setStep('mail') }} className={choice + ' border-2 border-accent'}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><Trophy size={22} /></span>
            <span className="flex-1"><span className="block font-extrabold">Soy jugador</span><span className="block text-xs text-muted">Cuenta más tus datos y equipo. La organización te habilita.</span></span>
            <ChevronRight size={20} className="text-muted" />
          </button>
          <button type="button" onClick={() => { setGuest(true); setStep('mail') }} className={choice + ' border-line'}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-fg"><Users size={22} /></span>
            <span className="flex-1"><span className="block font-extrabold">Solo quiero seguir partidos</span><span className="block text-xs text-muted">Familia, amigos o hinchas. Solo cuenta, sin datos de jugador.</span></span>
            <ChevronRight size={20} className="text-muted" />
          </button>
        </div>
      )}

      {step === 'mail' && (
        <form onSubmit={sendCode} className="flex flex-col gap-3">
          <input className={inputCls} type="email" required placeholder="Mail" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Btn type="submit" tone="accent" disabled={busy}>{busy ? '…' : 'Enviar código'}</Btn>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={verify} className="flex flex-col gap-4">
          <OtpBoxes value={code} onChange={setCode} />
          <Btn type="submit" tone="accent" disabled={busy || code.length < 6}>{busy ? '…' : 'Confirmar'}</Btn>
          <button type="button" className="text-sm text-muted" onClick={() => { setStep('mail'); setCode(''); setErr('') }}>Cambiar mail o reenviar</button>
        </form>
      )}

      {step === 'pass' && (
        <form onSubmit={setPassword} className="flex flex-col gap-3">
          <input className={inputCls} type="text" required minLength={3} maxLength={20} placeholder="Nombre de usuario (para ingresar)" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" value={uname} onChange={(e) => setUname(e.target.value.replace(/\s/g, ""))} />
          <div className="relative">
            <input className={inputCls + ' pr-12'} type={showPass ? 'text' : 'password'} required minLength={6} placeholder="Contraseña" title={PASSWORD_HINT} autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} />
            {eye}
          </div>
          <PassChecks pass={pass} />
          <input className={inputCls} type={showPass ? 'text' : 'password'} required minLength={6} placeholder="Repetir contraseña" title={PASSWORD_HINT} autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} />
          {pass2 && <span className={'flex items-center gap-1.5 text-xs font-semibold ' + (pass === pass2 ? 'text-accent' : 'text-danger')}>{pass === pass2 ? <><Check size={13} strokeWidth={3} /> Coinciden</> : 'Todavía no coinciden'}</span>}
          <Btn type="submit" tone="accent" disabled={busy}>{busy ? '…' : 'Continuar'}</Btn>
        </form>
      )}

      {step === 'form' && (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Group title="Quién sos">
            <input className={inputCls} required maxLength={100} placeholder="Nombre y apellido" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <input className={inputCls} required inputMode="numeric" placeholder="DNI (solo números)" value={f.dni} onChange={(e) => setF({ ...f, dni: e.target.value.replace(/\D/g, '').slice(0, 12) })} />
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Sexo">
              {[['M', 'Masculino'], ['F', 'Femenino']].map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={f.sex === v} onClick={() => { setF({ ...f, sex: v }); setPicks({}) }}
                  className={'rounded-xl border-2 px-3 py-3 text-sm font-bold ' + (f.sex === v ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface-2')}>{l}</button>
              ))}
            </div>
          </Group>
          <Group title="Tu camiseta">
            <input className={inputCls} inputMode="numeric" placeholder="Número de camiseta (opcional)" value={f.number} onChange={(e) => setF({ ...f, number: e.target.value.replace(/\D/g, '').slice(0, 3) })} />
          </Group>

          {branches.length > 0 && branches.map((b) => (
            <Group key={b} title={'Tu equipo · ' + BRANCH_LABEL[b]}>
              <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto">
                {teamsFor(b).map((t) => {
                  const on = picks[b] === t.id
                  return (
                    <button key={t.id} type="button" aria-pressed={on} onClick={() => setPicks({ ...picks, [b]: on ? '' : t.id })}
                      className={'flex min-w-0 items-center gap-2 rounded-xl border-2 p-2 text-left text-sm font-bold ' + (on ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface-2')}>
                      <TeamBadge team={t} size="sm" branch={b} />
                      <span className="min-w-0 flex-1 truncate">{t.name}</span>
                      {on && <Check size={16} strokeWidth={3} className="shrink-0" />}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted">{picks[b] ? 'Tocá de nuevo para sacarlo.' : 'Si no jugás esta rama, dejala sin elegir.'}</p>
            </Group>
          ))}
          {branches.length > 0 && <p className="text-xs text-muted">Elegí al menos un equipo.</p>}
          <Btn type="submit" tone="accent" disabled={busy || !f.sex}>{busy ? '…' : 'Enviar solicitud'}</Btn>
        </form>
      )}
      </div>

      <Link to="/login" className="mx-auto mt-6 rounded-full border border-line bg-surface px-4 py-2 text-center text-sm font-semibold text-fg">¿Ya tenés cuenta? Ingresá</Link>
    </main>
  )
}
