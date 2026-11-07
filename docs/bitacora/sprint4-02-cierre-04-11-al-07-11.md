# Sprint 4 — Cierre (04/11 al 07/11/2026)

Complementa al resumen del 28/10–03/11. Entrega 6 cierra el sábado 07/11/2026 a las 23:59.

## Infraestructura y rename (04/11)
- Repo renombrado a `dodgeball-ba`; Vercel https://dodgeball-ba.vercel.app y Render https://dodgeball-ba.onrender.com (rama `main`, base `production`).
- Backup de Neon `backup-pre-sprint4-2026-11-04`; 36 migraciones aplicadas en production; PRs de backend, frontend y rename (#22) mergeados. Desde ese día se pushea directo a `main`.
- Production quedó como copia exacta de `dev-torneos` (329 partidos) con `backend/scripts/copiar-bd.js --aplicar --vaciar-destino`.
- Supabase con las URLs nuevas. Dominio propio descartado por ahora.
- Pantallas nuevas: "Reglas del juego" (WDBF) y "Acerca de / Contacto".

## Torneos y fixture
- **Armar el fixture:** una sola tarjeta con dos modos (a mano o sorteo). Día, hora y cancha opcionales. Un equipo no puede jugar dos veces en la misma fecha (`TEAM_IN_FECHA`); un cruce repetido en la zona pide confirmar (`REPEATED_PAIR`, se reenvía con `force`).
- **Dentro de cada fecha:** subir y bajar partidos, borrarlos con la X y moverlos a otra fecha (solo SCHEDULED o READY). `PATCH /matches/:id` con `matchdayId`, altas y bajas de fechas, `PUT /tournaments/:id/matchdays/:id/order`.
- **Llaves sin perder el fixture:** guardar la estructura agregando solo llaves actualiza en el lugar.
- **Podio:** automático (final y partido por el 3.º, o tabla de liga sin empates) o a mano para 2.º y 3.º (`TournamentPlace`, migración `20261105160000_tournament_places`). Tarjeta "Podio" en el Resumen. `PUT /tournaments/:id/podium`.
- **Carga masiva:** `backend/scripts/cargar-torneos.js` (5 torneos del Nacional 2026; `--aplicar`, `--solo`) y `fusionar-equipos.js` (une duplicados: Lamadrid, Linces, Riestra). Los días de esas fechas son supuestos hasta confirmarlos.
- **Caso corregido:** Mixto Cloth Apertura, el campeón figuraba PCH (ganó el playoff de ascenso/permanencia). Reabrir y cerrar, o corregir desde "Podio".

## Reportes de problemas (07/11)
- Menú, al pie: "Reportar un problema" (con o sin cuenta). Tipo, texto y hasta 3 capturas; se suman solos pantalla, dispositivo y últimos errores de consola.
- Organización: "Reportes" (burbuja de nuevos, filtros por estado y tipo, nota interna, cambio de estado, borrado). Modelo `BugReport`, migración `20261107120000_bug_reports` (aplicada en producción el 07/11), bucket privado `bug-reports`. Rutas `/reports`; límite de 8 por hora por IP.

## Tutoriales
- Reaparecían en cada ingreso porque la marca de visto se guardaba solo al cerrarlos y era por usuario. Ahora se marca al empezar, por dispositivo.
- Botón "No mostrar más" (ojo tachado): los apaga para siempre, guardado en la cuenta (`user_metadata.pref_tours_off`). Se reactivan con "Ver los tutoriales de nuevo" en Perfil.

## Sentry
- El código ya estaba; faltaba configurarlo. Guía en `docs/sentry.md` (dos proyectos, `SENTRY_DSN`, `SENTRY_TEST_KEY`, `VITE_SENTRY_DSN`, alertas). Se sumó `release` por commit. Source maps: opcional, después de la entrega.

## Pruebas de estrés (06 y 07/11, producción, solo lectura)
- 190 espectadores simultáneos con el reloj de un partido en vivo sin perder ticks; `/matches` sostiene 56 a 75 req/s sin errores hasta 200 conexiones; primer corte con 400 (4 timeouts). Antes de los arreglos del 06/11, `/matches` caía a 3 req/s por comprimir 366 KB en cada pedido.
- Arreglos: microcaché de 5 s con gzip precomprimido, ETag/304, consultas en lote, pool de Prisma configurable.
- El techo coincide con `/health` (~63 req/s): lo marca el plan gratuito de Render (0,1 CPU). E2E: 24 aprobadas y 2 omitidas (requieren `E2E_EMAIL` y `E2E_PASSWORD`).
- Pendiente: techo con 600–1000 conexiones, escrituras concurrentes, sockets desde varias IP, resistencia de 30 a 60 min, filtros de build en Render (cada push reinicia el backend y pausa relojes en vivo) y proteger `main`.

## Entregables actualizados el 07/11
- Manual de usuario, documentación técnica (reportes, Sentry, rendimiento, pruebas de estrés) y presentación (diapositiva "Calidad", torneos y pendientes).

## Pendiente / para decidir
- Limpiar usuarios y fichas demo de producción (botón de organización con vista previa, solo fichas sin cuenta vinculada, backup antes). Después de cerrar la entrega.
- Confirmar los días reales de los torneos del Nacional; cargar el resto.
- Sentry: activado el 07/11 con alertas por mail; la clave de prueba se borró de Render.
- Jira a "Listo" y Confluence al día, según la Definition of Done.
