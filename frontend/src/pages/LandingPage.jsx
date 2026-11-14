import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, Heart, Trophy, UserPlus, LogIn } from 'lucide-react'
import { useMatchesFeed } from '../hooks/useMatchesFeed'
import { useMatchesStore } from '../stores/matchesStore'
import MatchCard from '../components/MatchCard'
import { phaseCmp } from '../lib/format'

export const LANDING_KEY = 'dba_landing_visto'
export const landingSeen = () => { try { return sessionStorage.getItem(LANDING_KEY) === '1' } catch { return false } }

const STEPS = [
  { Icon: Eye, title: 'Mirá la liga', text: 'Partidos, posiciones y torneos, sin registrarte.' },
  { Icon: Heart, title: 'Creá tu cuenta', text: 'Guardá tus equipos favoritos y jugá al prode.' },
  { Icon: Trophy, title: '¿Sos jugador? Sumate a tu equipo', text: 'Mandás tus datos y la organización te habilita.' },
]

// Pantalla de bienvenida para quien entra sin sesión: presenta la app y muestra un partido en vivo (o el próximo)
export default function LandingPage() {
  const navigate = useNavigate()
  useMatchesFeed(7)
  const byId = useMatchesStore((s) => s.byId)
  const featured = useMemo(() => {
    const all = Object.values(byId)
    const live = all.filter((m) => m.status === 'LIVE')
    if (live.length) return live[0]
    const next = all.filter((m) => ['READY', 'SCHEDULED'].includes(m.status) && m.scheduledAt && new Date(m.scheduledAt) > Date.now() - 36e5)
    return next.sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt)) || phaseCmp(a, b))[0] ?? null
  }, [byId])

  const enter = () => {
    try { sessionStorage.setItem(LANDING_KEY, '1') } catch { /* sin storage: se muestra de nuevo al volver */ }
    navigate('/', { replace: true })
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 pb-12 pt-[calc(1rem+env(safe-area-inset-top))]">
      <header className="flex items-center justify-between py-2">
        <span className="text-base font-extrabold">Dodgeball BA</span>
        <Link to="/login" className="flex items-center gap-1.5 text-sm font-bold text-accent"><LogIn size={16} /> Ingresar</Link>
      </header>

      <section className="pt-8">
        <div className="mb-4 inline-block rounded-full border-2 border-accent bg-accent-soft px-5 py-2 text-xs font-extrabold uppercase tracking-[0.22em] text-accent">Dodgeball Buenos Aires</div>
        <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">Seguí cada partido en vivo, desde donde estés.</h1>
        <p className="mt-3 text-base text-muted">Resultados al segundo, tablas, equipos y torneos de la liga. Sin instalar nada.</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link to="/registro" className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-sm font-extrabold text-black"><UserPlus size={17} /> Crear mi cuenta</Link>
          <button type="button" onClick={enter} className="rounded-xl border-2 border-line bg-surface px-4 py-3.5 text-sm font-extrabold">Ver partidos</button>
        </div>
      </section>

      {featured && (
        <section className="mt-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">{featured.status === 'LIVE' ? 'Jugándose ahora' : 'Próximo partido'}</p>
          <MatchCard m={featured} />
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-2xl font-extrabold">Cómo funciona</h2>
        <p className="mb-4 mt-1 text-sm text-muted">Tres pasos. Mirar no pide cuenta.</p>
        <div className="space-y-3">
          {STEPS.map(({ Icon, title, text }, i) => (
            <div key={title} className="flex items-start gap-3.5 rounded-2xl border border-line bg-surface p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-extrabold text-accent">{i + 1}</span>
              <div className="min-w-0 flex-1"><p className="font-extrabold">{title}</p><p className="text-sm text-muted">{text}</p></div>
              <Icon size={20} className="mt-1 shrink-0 text-muted" />
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
