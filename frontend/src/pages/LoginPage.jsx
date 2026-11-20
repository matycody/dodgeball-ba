import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { X, Eye, EyeOff, User, Lock, Mail, UserPlus } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'

// Ingreso rápido: se muestra solo lo que está habilitado en Supabase (VITE_OAUTH_PROVIDERS=google,apple)
const PROVIDERS = String(import.meta.env.VITE_OAUTH_PROVIDERS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)

const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
)
const AppleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#000" d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
  </svg>
)

export default function LoginPage() {
  const { user, loading, signIn } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [forgot, setForgot] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  useEffect(() => {
    if (user) navigate(from, { replace: true })
  }, [user, from, navigate])

  if (!loading && user) return <Navigate to={from} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      if (forgot) {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + '/recuperar' })
        if (err) throw err
        setInfo('Si el mail está registrado, te enviamos un enlace para elegir una contraseña nueva.')
      } else {
        await signIn(email.trim(), password)
      }
    } catch (err) {
      setError(err.message || 'Error')
    } finally {
      setBusy(false)
    }
  }

  async function oauth(provider) {
    setError('')
    const { error: err } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin, queryParams: { prompt: 'select_account' } } })
    if (err) setError(err.message)
  }

  const field = 'w-full rounded-xl border border-line bg-surface/60 px-4 py-3.5 text-base outline-none focus:border-accent'
  const round = 'grid h-12 w-12 place-items-center rounded-full bg-white shadow-md'

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 pb-10 pt-[calc(1rem+env(safe-area-inset-top))] md:px-10">
      <Link to="/" aria-label="Cerrar" className="mb-4 grid h-11 w-11 place-items-center rounded-full border border-line bg-surface md:mb-0"><X size={20} /></Link>

      <div className="grid flex-1 items-center gap-8 md:grid-cols-[1fr_minmax(0,24rem)] md:gap-16">
        {/* Marca: arriba y compacta en el celular, a la izquierda en pantallas grandes */}
        <div className="text-center md:text-left">
          <img src="/logo-dba.png" alt="" className="e-in e-float mx-auto h-16 w-16 object-contain md:mx-0 md:h-24 md:w-24" />
          <p style={{ '--d': '138ms' }} className="e-in mt-3 text-xs font-extrabold uppercase tracking-[0.25em] text-accent md:text-sm">Dodgeball Buenos Aires</p>
          <h1 style={{ '--d': '253ms' }} className="e-in mt-2 hidden text-4xl font-extrabold leading-tight md:block lg:text-5xl">Cada partido,<br />en tiempo real.</h1>
          <p style={{ '--d': '391ms' }} className="e-in mt-3 hidden max-w-md text-base text-muted md:block">Seguí tus torneos, el cronómetro y las estadísticas de tu equipo en un solo lugar.</p>
        </div>

        {/* Tarjeta de vidrio sobre el fondo de la app */}
        <div style={{ '--d': '230ms' }} className="login-glass e-in-right rounded-3xl p-6 sm:p-8">
          <div key={forgot ? 'recuperar' : 'ingresar'} className="e-in">
            <h2 className="text-2xl font-extrabold leading-tight">{forgot ? 'Recuperá tu contraseña' : 'Iniciá sesión'}</h2>
            <p className="mb-6 mt-1 text-sm text-muted">{forgot ? 'Te mandamos un enlace al mail para elegir una nueva.' : 'Seguí los partidos y gestioná tu cuenta.'}</p>
          </div>

          <form onSubmit={handleSubmit} className="m-stagger flex flex-col gap-3">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">{forgot ? <Mail size={19} /> : <User size={19} />}</span>
              <input className={field + ' pl-11'} type={forgot ? 'email' : 'text'} placeholder={forgot ? 'Tu mail' : 'Usuario o mail'} required autoCapitalize="none" autoCorrect="off" spellCheck={false}
                value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </div>
            {!forgot && (
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"><Lock size={19} /></span>
                <input className={field + ' pl-11 pr-12'} type={show ? 'text' : 'password'} placeholder="Contraseña" required minLength={6}
                  value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center text-muted">
                  {show ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            )}

            {error && <p key={error} className="e-shake text-sm text-danger">{error}</p>}
            {info && <p className="text-sm text-live">{info}</p>}

            <button type="button" onClick={() => { setForgot((v) => !v); setError(''); setInfo('') }} className="self-end text-sm font-bold text-accent underline">
              {forgot ? 'Volver a iniciar sesión' : '¿Olvidaste tu contraseña?'}
            </button>

            <button disabled={busy} className="e-shine e-press mt-1 flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 font-extrabold text-black disabled:opacity-60">
              {busy ? <span aria-label="Ingresando" className="e-spin h-5 w-5 rounded-full border-2 border-black/30 border-t-black" /> : forgot ? 'Enviar enlace' : 'Iniciar sesión'}
            </button>
          </form>

          {!forgot && PROVIDERS.length > 0 && (
            <>
              <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-muted">
                <span className="h-px flex-1 bg-line" />o continuá con<span className="h-px flex-1 bg-line" />
              </div>
              <div className="flex justify-center gap-4">
                {PROVIDERS.includes('google') && <button type="button" aria-label="Continuar con Google" onClick={() => oauth('google')} className={round}><GoogleLogo /></button>}
                {PROVIDERS.includes('apple') && <button type="button" aria-label="Continuar con Apple" onClick={() => oauth('apple')} className={round}><AppleLogo /></button>}
              </div>
            </>
          )}

          <div className="mt-6 border-t border-line pt-5">
            <Link to="/registro" className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-accent bg-accent-soft py-3 text-sm font-extrabold text-accent">
              <UserPlus size={18} /> Crear cuenta
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
