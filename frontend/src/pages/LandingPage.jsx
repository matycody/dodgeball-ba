import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus, LogIn, Clock, Trophy, Medal, Swords, Heart, Zap, ArrowRight, Timer } from 'lucide-react'
import { useMatchesFeed } from '../hooks/useMatchesFeed'
import { useMatchesStore } from '../stores/matchesStore'
import MatchCard from '../components/MatchCard'
import TeamBadge from '../components/TeamBadge'
import AuthBackground from '../components/AuthBackground'
import Reveal from '../components/Reveal'
import ThemeSwitch from '../components/ThemeSwitch'
import { useReveal, useCountUp } from '../hooks/useReveal'
import { api } from '../lib/api'
import { phaseCmp } from '../lib/format'

export const LANDING_KEY = 'dba_landing_visto'
export const landingSeen = () => { try { return sessionStorage.getItem(LANDING_KEY) === '1' } catch { return false } }

const FEATURES = [
  { Icon: Clock, title: 'Marcador y relojes en vivo', text: 'El reloj del partido y el del set llegan segundo a segundo, sin recargar la página.' },
  { Icon: Trophy, title: 'Torneos y posiciones', text: 'Zonas, fixture y playoffs de cada torneo, siempre al día y con el resultado de cada fecha.' },
  { Icon: Medal, title: 'Estadísticas y récords', text: 'Historial de cada equipo, cara a cara, rachas y los récords de la liga.' },
  { Icon: Swords, title: 'Prode', text: 'Predecí los resultados y sumá puntos contra otros hinchas. Sin plata de por medio.' },
  { Icon: Heart, title: 'Tus equipos y torneos', text: 'Marcá tus favoritos y encontrá sus partidos apenas abrís la app.' },
  { Icon: Zap, title: 'Instalala en tu celular', text: 'Funciona como una app, sin tienda de por medio, y entra directo a tus partidos.' },
]

const YEAR = new Date().getFullYear() // los números de la portada son de la temporada en curso
const fmt = (n) => Number(n ?? 0).toLocaleString('es-AR')

function Stat({ value, label, delay = 0 }) {
  const [ref, shown] = useReveal()
  const n = useCountUp(value, shown) // el número sube desde 0 al aparecer
  return (
    <div ref={ref} style={{ '--d': delay + 'ms' }} className={'reveal ' + (shown ? 'in ' : '') + 'login-glass e-lift rounded-2xl px-4 py-5 text-center'}>
      <p className="font-mono text-3xl font-extrabold tabular-nums text-fg sm:text-4xl">{value == null ? '—' : fmt(n)}</p>
      <p className="mt-1.5 text-xs font-semibold leading-snug text-muted">{label}</p>
    </div>
  )
}

// Pantalla de bienvenida para quien entra sin sesión: presenta la liga, muestra un partido en vivo (o el próximo), los números y los equipos
export default function LandingPage() {
  const navigate = useNavigate()
  useMatchesFeed(7)
  const byId = useMatchesStore((s) => s.byId)
  const [totals, setTotals] = useState(null)
  const [teams, setTeams] = useState([])

  useEffect(() => {
    let alive = true
    api('GET', '/stats/records?yearFrom=' + YEAR + '&yearTo=' + YEAR).then((r) => alive && setTotals(r?.totals ?? null)).catch(() => {})
    api('GET', '/teams').then((d) => alive && setTeams(Array.isArray(d) ? d : [])).catch(() => {})
    return () => { alive = false }
  }, [])

  const featured = useMemo(() => {
    const all = Object.values(byId)
    const live = all.filter((m) => m.status === 'LIVE')
    if (live.length) return live[0]
    const next = all.filter((m) => ['READY', 'SCHEDULED'].includes(m.status) && m.scheduledAt && new Date(m.scheduledAt) > Date.now() - 36e5)
    return next.sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt)) || phaseCmp(a, b))[0] ?? null
  }, [byId])

  // Escudos para la cinta: solo equipos que tienen alguno cargado
  const crests = useMemo(() => teams.filter((t) => t.logo || Object.keys(t.branchLogos ?? {}).length).slice(0, 24), [teams])

  const [leaving, setLeaving] = useState(false)
  const enter = () => {
    try { sessionStorage.setItem(LANDING_KEY, '1') } catch { /* sin storage: se muestra de nuevo al volver */ }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { navigate('/', { replace: true }); return }
    setLeaving(true) // la pantalla se desvanece antes de entrar
    setTimeout(() => navigate('/', { replace: true }), 345)
  }

  const showStats = totals && (totals.teams || totals.matches)

  return (
    <>
      <AuthBackground compact />
      <div className={'motion-ok e-root relative z-10 min-h-screen overflow-x-clip ' + (leaving ? 'e-leave' : '')}>
        {/* Barra superior */}
        <header className="e-in mx-auto flex max-w-6xl items-center justify-between px-5 pb-2 pt-[calc(0.75rem+env(safe-area-inset-top))] md:px-8">
          <div className="flex items-center gap-2.5">
            <img src="/logo-dba-rect.png" alt="" className="h-9 w-auto" />
            <span className="hidden whitespace-nowrap text-base font-extrabold tracking-tight sm:inline">Dodgeball BA</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitch />
            <Link to="/login" className="login-glass e-lift e-press flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-accent"><LogIn size={16} /> Ingresar</Link>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-5 pb-16 md:px-8">
          {/* Portada */}
          <section className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 pt-8 md:pt-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14">
            <div className="landing-scrim min-w-0">
              <span style={{ '--d': '138ms' }} className="e-in inline-block rounded-full border border-accent/60 bg-accent-soft px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.22em] text-accent">Liga oficial · Buenos Aires</span>
              <h1 style={{ '--d': '276ms' }} className="e-in mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                El dodgeball de Buenos Aires,{' '}
                <span className="text-accent">en tiempo real.</span>
              </h1>
              <p style={{ '--d': '460ms' }} className="e-in mt-5 max-w-xl text-base text-muted sm:text-lg">
                Resultados, posiciones y estadísticas de cada torneo. Seguí cada partido segundo a segundo, desde donde estés.
              </p>
              <div style={{ '--d': '621ms' }} className="e-in mt-7 flex flex-col gap-3 sm:flex-row">
                <Link to="/registro" className="e-shine e-lift e-press flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-extrabold text-black"><UserPlus size={17} /> Crear mi cuenta</Link>
                <button type="button" onClick={enter} className="login-glass e-lift e-press flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-extrabold">Modo visitante <ArrowRight size={16} /></button>
              </div>
              <Link to="/cronometro" style={{ '--d': '690ms' }} className="e-in login-glass e-lift e-press mt-3 flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-extrabold sm:inline-flex"><Timer size={17} className="text-accent" /> Cronómetro offline</Link>
            </div>

            <div style={{ '--d': '483ms' }} className="login-glass e-in-right min-w-0 rounded-3xl p-4 sm:p-5">
              {featured ? (
                <>
                  <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted">
                    <span className="relative grid h-2 w-2 place-items-center">
                      {featured.status === 'LIVE' && <span className="e-ping absolute inset-0 rounded-full bg-live" />}
                      <span className={'h-2 w-2 rounded-full ' + (featured.status === 'LIVE' ? 'bg-live' : 'bg-accent')} />
                    </span>
                    {featured.status === 'LIVE' ? 'Jugándose ahora' : 'Próximo partido'}
                  </p>
                  <MatchCard m={featured} />
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                  <img src="/logo-dba-rect.png" alt="" className="h-16 w-auto" />
                  <p className="text-sm font-bold">Dodgeball Buenos Aires</p>
                  <p className="text-xs text-muted">Cuando haya un partido en juego, lo ves acá en vivo.</p>
                </div>
              )}
            </div>
          </section>

          {/* Números de la liga */}
          {showStats && (
            <section className="mt-12" aria-label={'La liga en ' + YEAR}>
              <Reveal as="p" className="mb-3 text-xs font-extrabold uppercase tracking-[0.22em] text-accent">Temporada {YEAR}</Reveal>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat value={totals.teams} label="Equipos de todo el país" delay={0} />
                <Stat value={totals.tournaments} label="Torneos anuales" delay={103} />
                <Stat value={totals.matches} label={'Partidos completos en ' + YEAR} delay={207} />
                <Stat value={totals.sets} label={'Sets disputados en ' + YEAR} delay={310} />
              </div>
            </section>
          )}

          {/* Qué podés hacer */}
          <section className="mt-16">
            <Reveal>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Todo el dodgeball en un solo lugar</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">Hecha con la organización de la liga: lo que ves es lo que pasa en la cancha.</p>
            </Reveal>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ Icon, title, text }, i) => (
                <Reveal key={title} delay={(i % 3) * 104} className="login-glass e-lift group rounded-2xl p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"><Icon size={22} /></span>
                  <h3 className="mt-4 text-base font-extrabold">{title}</h3>
                  <p className="mt-1 text-sm text-muted">{text}</p>
                </Reveal>
              ))}
            </div>
          </section>

          {/* Equipos */}
          {crests.length >= 6 && (
            <section className="mt-16" aria-label="Equipos de la liga">
              <Reveal as="h2" className="text-2xl font-extrabold tracking-tight sm:text-3xl">Los equipos de la liga</Reveal>
              <Reveal delay={138} className="dba-marquee mt-6">
                <div className="dba-marquee-track">
                  {[...crests, ...crests].map((t, i) => (
                    <div key={t.id + '-' + i} aria-hidden={i >= crests.length} className="flex w-24 shrink-0 flex-col items-center gap-2 text-center">
                      <TeamBadge team={t} size="xl" />
                      <span className="w-full truncate text-[11px] font-bold text-muted">{t.name}</span>
                    </div>
                  ))}
                </div>
              </Reveal>
            </section>
          )}

          {/* Cierre */}
          <Reveal as="section" className="login-glass mt-16 rounded-3xl px-6 py-10 text-center sm:py-12">
            <img src="/logo-dba-rect.png" alt="" className="mx-auto h-12 w-auto" />
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">Entrá a la cancha</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">Creá tu cuenta para seguir a tus equipos, jugar el prode y no perderte ningún partido.</p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/registro" className="e-shine e-lift e-press flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-extrabold text-black"><UserPlus size={17} /> Crear mi cuenta</Link>
              <Link to="/login" className="e-lift e-press flex items-center justify-center gap-2 rounded-xl border-2 border-line bg-surface px-6 py-3.5 text-sm font-extrabold"><LogIn size={17} /> Ya tengo cuenta</Link>
            </div>
          </Reveal>

          <Reveal as="footer" className="mt-12 flex flex-col items-center gap-3 border-t border-line pt-6 text-center">
            <p className="max-w-xl text-sm font-semibold text-fg">La plataforma oficial de seguimiento y gestión de partidos de Dodgeball Buenos Aires.</p>
            <div className="flex gap-5 text-xs font-bold text-muted">
              <button type="button" onClick={enter}>Modo visitante</button>
              <Link to="/login">Ingresar</Link>
              <Link to="/registro">Crear cuenta</Link>
            </div>
            <p className="text-[11px] text-muted">© {new Date().getFullYear()} Dodgeball Buenos Aires</p>
          </Reveal>
        </main>
      </div>
    </>
  )
}
