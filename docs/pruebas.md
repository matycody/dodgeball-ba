# Pruebas — Dodgeball BA

## Tipos de prueba
| Tipo | Herramienta | Dónde | Estado |
|---|---|---|---|
| Unitarias | Vitest | `backend` (`npm test`): motor de timers y partidos extra | 21/21 aprobadas (Sprint 3) |
| Humo contra un backend en marcha | `npm run smoke` | `backend` | Más de 130 chequeos; crea y borra usuarios `SMOKE` |
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

## Pruebas pendientes
- Techo con 600 a 1000 conexiones, escrituras concurrentes, sockets desde varias IP y resistencia de 30 a 60 minutos.
- Las 2 pruebas E2E omitidas (cuenta de prueba real).
- Manuales: sanciones a equipos y a jugadores sin partido, planilla por foto con Gemini, mesa única con dos cuentas, reportes de problemas, tutoriales.
- Nunca correr pruebas de escritura masiva contra producción sin backup.
