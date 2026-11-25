# Pruebas — Dodgeball BA

## Tipos de prueba
| Tipo | Herramienta | Dónde | Estado |
|---|---|---|---|
| Unitarias | Vitest | `backend` (`npm test`): motor de timers y partidos extra | 21/21 aprobadas (Sprint 3) |
| Humo contra un backend en marcha | `npm run smoke` | `backend` | 210 chequeos (última corrida: 210 OK, 0 fallas, 07/11/2026); crea y borra datos `SMOKE`. Correr solo contra `dev-torneos` |
| E2E | Playwright | `frontend` (`npm run test:e2e`), contra la web de producción | 24 aprobadas, 2 omitidas (piden `E2E_EMAIL` y `E2E_PASSWORD`) |
| Carga HTTP | autocannon (`backend/carga-prod.mjs`) | producción, solo lectura | Ver informe |
| Sockets | `socket-carga.js` y Artillery | producción | 100, 150 y 190 espectadores sin perder ticks |
| Manuales | Checklist de cada historia | local y producción | Ver pendientes |

## Resultados de estrés (06 y 07/11/2026)
- 190 espectadores simultáneos recibiendo el reloj de un partido en vivo, sin perder ticks.
- `/matches`: 56 a 75 req/s sin errores hasta 200 conexiones; el primer corte apareció con 400 conexiones (4 timeouts).
- Antes de los arreglos del 06/11, `/matches` caía a 3 req/s (comprimía 366 KB en cada pedido). Arreglos: microcaché de 5 s, gzip precomprimido, ETag/304, consultas en lote y pool de Prisma configurable.
- El techo coincide con `/health` (~63 req/s): lo marca el plan gratuito de Render (0,1 CPU), no el código.
- Detalle completo, tablas y método en [informe-pruebas-estres.md](informe-pruebas-estres.md).

## Estado al 24/11/2026
- **E2E (Playwright) contra producción: 26 de 26 aprobadas** (`login.spec.js` y `publico.spec.js`, celular y escritorio). Hay que exportar `E2E_BASE_URL`, `E2E_EMAIL` y `E2E_PASSWORD` en la terminal: Playwright no lee `.env.local`. Se actualizaron el enlace "Crear cuenta" y el buscador (mínimo 2 caracteres).
- **Estrés (24/11):** quiebre HTTP inestable entre 200 y 400 conexiones (infraestructura de Render gratuito), 30 minutos a 200 conexiones sin degradación (0,002 % de error), sockets 195 de 195 y límite por IP verificado (205 lanzados: 198 conectados, 7 rechazados), y escrituras concurrentes de sets sin duplicados (409 claro). Detalle en `docs/informe-pruebas-estres.md`.
- Script nuevo `concurrent-writes.mjs` (escrituras simultáneas de sets; local, no se sube al repo).
- Sin volver a correr desde el 07/11: `npm test` (Vitest) y `npm run smoke` (solo contra `dev-torneos`).

## Pruebas pendientes
- Resistencia de 1 hora y sockets desde varias IP reales (el techo HTTP ya se midió el 24/11).
- E2E con sesión por rol (árbitro, mesa, organizador): hoy solo cubre login y páginas públicas.
- Manuales: sanciones a equipos y a jugadores sin partido, planilla por foto con Gemini, mesa única con dos cuentas, reportes de problemas, tutoriales.
- Nunca correr pruebas de escritura masiva contra producción sin backup.
