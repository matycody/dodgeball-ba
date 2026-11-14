import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus, LogIn } from 'lucide-react'
import { useMatchesFeed } from '../hooks/useMatchesFeed'
import { useMatchesStore } from '../stores/matchesStore'
import MatchCard from '../components/MatchCard'
import { phaseCmp } from '../lib/format'

export const LANDING_KEY = 'dba_landing_visto'
export const landingSeen = () => { try { return sessionStorage.getItem(LANDING_KEY) === '1' } catch { return false } }

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

      <footer className="mt-12 border-t border-line pt-6 text-center">
        <p className="text-sm font-semibold text-fg">La plataforma oficial de seguimiento y gestión de partidos de Dodgeball Buenos Aires.</p>
      </footer>
    </main>
  )
}
