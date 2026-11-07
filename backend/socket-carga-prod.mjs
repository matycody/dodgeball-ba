// Carga de sockets de SOLO LECTURA: N espectadores anónimos mirando un partido en vivo.
// Uso: node socket-carga-prod.mjs <matchId> [espectadores=100] [segundos=30]
// BASE_URL (opcional): por defecto https://dodgeball-ba.onrender.com
// Ojo: el servidor limita las conexiones por IP (MAX_CONN_PER_IP, 200): desde una sola PC el tope es ~190.
// Para que haya ticks, el reloj del partido tiene que estar corriendo (en pausa solo llega el estado al unirse).
import { io } from 'socket.io-client'

const BASE = process.env.BASE_URL || 'https://dodgeball-ba.onrender.com'
const matchId = process.argv[2]
const N = Number(process.argv[3]) || 100
const SEGUNDOS = Number(process.argv[4]) || 30
const ESCALONADO_MS = 25 // las conexiones entran de a poco, como en la vida real

if (!matchId) { console.error('Uso: node socket-carga-prod.mjs <matchId> [espectadores] [segundos]'); process.exit(1) }

const pausa = (ms) => new Promise((r) => setTimeout(r, ms))

// Estado del partido antes de empezar (REST, solo lectura)
try {
  const r = await fetch(`${BASE}/matches/${matchId}`, { headers: { 'accept-encoding': 'gzip' } })
  const m = r.ok ? await r.json() : null
  console.log(m ? `Partido: ${m.teamA?.name ?? '?'} vs ${m.teamB?.name ?? '?'} | estado ${m.status}` : `No se pudo leer el partido (HTTP ${r.status})`)
  if (m && m.status !== 'LIVE') console.log('AVISO: el partido no está EN VIVO; puede que no haya ticks.')
} catch (e) { console.log('No se pudo consultar el partido:', e.message) }

console.log(`Base: ${BASE} | espectadores: ${N} | duración: ${SEGUNDOS} s | ${new Date().toISOString()}`)

const r = { conectados: 0, rechazados: 0, errores: 0, desconexiones: 0 }
const usuarios = []

function crear(i) {
  const u = { ticks: 0, primerTickMs: null, unidoEn: null, conectado: false }
  usuarios.push(u)
  const s = io(BASE, { transports: ['websocket'], reconnection: false, timeout: 20000 })
  u.socket = s
  s.on('connect', () => {
    u.conectado = true
    r.conectados++
    u.unidoEn = Date.now()
    s.emit('match:join', { matchId })
  })
  s.on('match:tick', (p) => {
    if (p && p.matchId !== matchId) return
    u.ticks++
    if (u.primerTickMs === null) u.primerTickMs = Date.now() - u.unidoEn
  })
  s.on('connect_error', (e) => {
    if (/demasiadas/i.test(e.message || '')) r.rechazados++
    else r.errores++
  })
  s.on('disconnect', () => { if (u.conectado) r.desconexiones++ })
}

for (let i = 0; i < N; i++) { crear(i); await pausa(ESCALONADO_MS) }
console.log(`Conexiones lanzadas (${N}); midiendo ${SEGUNDOS} s...`)
await pausa(SEGUNDOS * 1000)

const con = usuarios.filter((u) => u.conectado)
const ticks = con.map((u) => u.ticks)
const primeros = con.map((u) => u.primerTickMs).filter((x) => x !== null)
const suma = (a) => a.reduce((x, y) => x + y, 0)
const resumen = {
  espectadores: N,
  conectados: r.conectados,
  rechazados: r.rechazados,
  errores: r.errores,
  desconexiones: r.desconexiones,
  recibieron_ticks: `${con.filter((u) => u.ticks > 0).length} de ${con.length}`,
  ticks_por_usuario: ticks.length ? `${Math.min(...ticks)} / ${(suma(ticks) / ticks.length).toFixed(1)} / ${Math.max(...ticks)}` : '-',
  primer_tick_ms_prom_max: primeros.length ? `${Math.round(suma(primeros) / primeros.length)} / ${Math.max(...primeros)}` : '-',
}
console.log('\n== Resultado (ticks mín / prom / máx; esperados ~' + SEGUNDOS + ' si el reloj corre) ==')
console.table([resumen])
usuarios.forEach((u) => u.socket.close())
await pausa(500)
process.exit(0)
