# Dodgeball BA — Sprint 4: resumen final (28/10 al 07/11/2026)

Documento para el nuevo chat: (1) configurar Jira con lo nuevo y (2) preparar el informe de la Entrega 6 (cierra sáb 07/11/2026 23:59).
Complementa `sprint4-resumen-completo.md` (28/10–03/11) y `sprint4-cierre-07-11.md` (04–07/11), que traen el detalle fino.

## 0. Contexto
- Proyecto PPS: cronómetro y gestión de partidos de Dodgeball (cliente: Dodgeball Buenos Aires). Equipo actual: Matías Sosa (backend) y Rodri Olivera Calvo (frontend). Juan Ignacio dejó el equipo. Product Owner: la profesora.
- Stack: React + Vite (PWA) en Vercel · Node + Express + Socket.IO en Render · PostgreSQL + Prisma en Neon · Supabase Auth. Extras: Sentry (errores), Gemini (lectura de planillas).
- Nombre y URLs (renombrado el 04/11 de "PPS" a "Dodgeball BA"): repo `github.com/matycody/dodgeball-ba` (antes PPS-2026), frontend https://dodgeball-ba.vercel.app, backend https://dodgeball-ba.onrender.com.
- Flujo de git: Sprint 4 arrancó con `feature/sprint4-backend` y `feature/sprint4-frontend`; se mergearon a `main` (PRs backend, frontend y rename #22, 04/11). Desde el 04/11 se pushea directo a `main` (decisión del equipo para ir más rápido). Commits recientes: dfcb399, 63c2938, d6c423d.
- Datos: producción (Neon `production`) es copia exacta de `dev-torneos`: todas las tablas, 329 partidos reales (script `backend/scripts/copiar-bd.js`). Backup previo: branch de Neon `backup-pre-sprint4-2026-11-04`. 36 migraciones aplicadas + `20261107120000_bug_reports` (07/11).

## 1. Qué se hizo, por área
### 1.1 Tareas postergadas del Sprint 3 (28/10)
- Reloj persistido en BD (`MatchClock`): tras reinicio de Render se recupera en pausa; aviso "Reloj recuperado". Corregida carrera al arrancar (se recupera antes de aceptar conexiones).
- Partidos fuera del fixture (con torneo en curso, sumando o no a la tabla; asignar partido existente a un torneo).
- Torneo pausado visible para la organización ("Pausado"); selector "Reparto de rondas" al armar llaves; Sentry en backend y frontend.
- Playoffs "Ver completo" a pantalla completa (zoom, pellizco, arrastre).
- Reloj flotante Picture-in-Picture (PC, Android, iPhone). Límite: Live Activities/Dynamic Island requieren app nativa.
- Ciclo del partido: ENTRETIEMPO, FINALIZADO solo por mesa/árbitro, avisos por modalidad (Foam muerte súbita / Cloth set finalizado).

### 1.2 Cuentas y acceso
- Login con mail o usuario (usuario visible solo para admin), pantalla estilo BeSoccer, Google habilitado (Apple pendiente), recuperar contraseña.
- Perfil con "Cuenta y seguridad". Onboarding `/bienvenida` (equipos y torneos favoritos).
- Visitas sin sesión: Ranking y Sedes piden iniciar sesión; Sanciones solo con sesión.

### 1.3 Inicio y navegación
- Nuevo Inicio para todos los roles: tira de días por jornada, tira de torneos, "En vivo (n)", tarjeta compacta (resultado pegado al nombre), "Tus partidos" y favoritos con corazón.
- Lupa de búsqueda con recientes, Noticias fija en barra inferior, "Partidos" de solo lectura para todos, botón "Volver" en pantallas internas, menú "Mis asignaciones" + Historial.

### 1.4 Mesa, canchas y jornadas
- Control de mesa para jugadores; mesa única por partido (bloqueo, se libera al salir o a los 15 s).
- Línea de tiempo del marcador por sets; Dashboard de canchas (Todas + una por cancha, por jornada).
- "Armar jornada" (`/admin/jornada`): tablero canchas × horarios, manual y autoarmar (`POST /matches/bulk-schedule`).
- Horario opcional del partido (`Match.timeSet`). Administración del partido con edición por lápiz y asignaciones en borrador.
- Reiniciar torneo (solo pruebas/demos), sección "Eliminados" (restaurar o borrar).
- Planilla de juego por foto: la mesa sube UNA foto por partido; Gemini lee jugadores y firmas (cruce por DNI); la mesa decide; la foto queda guardada para auditoría; jugadores sin firma se ven grises. Tablas `MatchSheet`, `MatchAttendance`.

### 1.5 Sanciones
- En partido: advertencia, amarilla (5 min), azul (Cloth), roja; corren con el reloj; departamento de sanciones (`/admin/sanciones`) con suspensión por jornada/fechas.
- A equipos: quita de puntos por zona (`TeamPenalty`, motivos: faltan árbitros/mesa, no se presentó, llegó tarde, sin jugadores, agresión, otro).
- A jugadores sin partido (`PlayerSuspension` standalone, alcance por modalidad y rama).
- Pantalla pública `/sanciones` (solo lectura, con sesión).

### 1.6 Vista del partido y reloj
- Vista nueva con pestañas Resumen / Jugadores / detalles / cara a cara. Reloj al finalizar queda en 00:00 2.º tiempo.
- Reloj en tiempo real segundo a segundo por socket (decisión: no reducir ticks).

### 1.7 Predicciones (Prode, sin dinero)
- Cuotas decimales, bonus por anticipación, ranking por torneo y anual, anulación al ser designado árbitro/mesa, sin empate en llaves (backend rechaza `DRAW`).

### 1.8 Perfiles, equipos, estadísticas
- Banners estilo OneFootball de jugador y equipo, escudos completos y por rama, Sedes (`/sedes`), Ranking (Resumen, Estadísticas, Salón de la fama, Torneos, Equipos, Cara a cara), Competiciones, Mis estadísticas (`/me/stats`).
- Estadísticas de quemadas/catches: NO implementadas (bloque "próximamente").

### 1.9 Campeón, podios y torneos
- Podio 2-1-3 automático o manual (`TournamentPlace`, `PUT /tournaments/:id/podium`); la etapa de promoción ya no define campeón.
- Armar fixture (a mano o sorteo; validaciones `TEAM_IN_FECHA`, `REPEATED_PAIR`), mover/ordenar/borrar partidos, llaves sin perder fixture, corrección de torneos cerrados (`PATCH stages/:stageId`), nombre de formato (`formatLabel`), logo del torneo.
- Carga masiva de 5 torneos del Nacional 2026 (`cargar-torneos.js`) y `fusionar-equipos.js` (Lamadrid, Linces, Riestra).

### 1.10 Noticias y contenido
- Noticias estilo OneFootball (`News`, `/noticias`, filtro "Mi equipo"); por ahora publica solo el admin (pendiente definir redactores por permiso).
- Pantallas "Reglas del juego" (reglamento WDBF; 2026 traducido y publicado) y "Acerca de / Contacto" (Instagram dodgeballbuenosaires y dodgeball.ar).

### 1.11 Tema visual
- Oscuro azul noche, claro celeste, skin opcional "Acero"; subida de imágenes en cualquier formato (se guarda WebP, 15 MB).

### 1.12 Infra: rename, deploy y migración a producción (04/11)
- Repo y servicios renombrados a `dodgeball-ba` (Vercel reutilizando proyecto, Render servicio nuevo desde `main`). Supabase con Redirect URLs nuevas. Dominio propio descartado por ahora (sin correo institucional para GitHub Student Pack).
- Render solo corre `npm install`: migraciones manuales (`npx prisma migrate deploy` + `npx prisma generate`). Con Neon usar URL directa (el pooler da P1002 por advisory lock).

### 1.13 Reportes de problemas (07/11)
- "Reportar un problema" en el pie del menú (con o sin cuenta): tipo, texto, hasta 3 capturas + contexto automático (pantalla, dispositivo, errores de consola). Panel admin "Reportes" (nuevos, filtros, nota interna, estado, borrado). `BugReport`, bucket privado `bug-reports`, límite 8/hora por IP.

### 1.14 Tutoriales (07/11)
- Se marcan como vistos al empezar (por dispositivo); botón "No mostrar más" que se guarda en la cuenta (`pref_tours_off`); reactivables en Perfil.

### 1.15 Sentry
- Código listo con `release` por commit; activo desde el 07/11 con alertas por mail (guía `docs/sentry.md`: `SENTRY_DSN`, `SENTRY_TEST_KEY`, `VITE_SENTRY_DSN`).

### 1.16 Rendimiento y pruebas de estrés (06–07/11, en producción, solo lectura)
- 190 sockets simultáneos sin perder ticks; `/matches` 56–75 req/s sin errores hasta 200 conexiones; con 400 conexiones, 4 timeouts. Antes `/matches` caía a 3 req/s.
- Arreglos: microcaché 5 s, gzip precomprimido, ETag/304, consultas en lote, pool Prisma configurable.
- El techo lo marca el plan gratuito de Render (0,1 CPU), no el código. E2E Playwright: 24 aprobadas, 2 omitidas (faltan `E2E_EMAIL`/`E2E_PASSWORD`).
- Meta futura: 500 usuarios simultáneos, 15+ torneos más, 150 jugadores oficiales (requiere pagar infraestructura más adelante).

### 1.17 Entregables actualizados (07/11)
- Manual de usuario, documentación técnica (Claude Docs) y presentación (deck con diapositiva "Calidad"; link https://claude.ai/artifact/EipsTT5tkPoSwP9oE3ki1n). Docs de proyecto en el Project "dogdeball".

## 2. Errores y problemas resueltos
- P1002 (advisory lock) al migrar producción: usar URL directa; sesión pgbouncer colgada cerrada con `pg_terminate_backend`.
- Campeón equivocado en Mixto Cloth Apertura (PCH): la etapa de promoción definía el campeón; corregido en código; torneos ya cerrados requieren reabrir/cerrar o usar tarjeta Podio.
- Tutoriales que reaparecían: marca al empezar + apagado global.
- Push rechazado (non-fast-forward): fetch + rebase.
- Variables mal cargadas (SUPABASE_URL, VITE_SUPABASE_URL, SENTRY_DSN) causaron fallas de login/socket.
- Carrera en recuperación de relojes tras reinicio de Render.

## 3. Pendiente / riesgos
- Verificar en producción: reportes con captura, panel Reportes, tutoriales, link del menú.
- Limpiar usuarios y fichas DEMO de producción (botón con vista previa, solo fichas sin cuenta, backup antes) — después de cerrar la entrega.
- Confirmar días reales de los torneos del Nacional; cargar el resto; correr `fusionar-equipos.js`; cerrar torneos (Mixto Foam final pendiente); revisar otros torneos con campeón mal por promoción.
- Alinear automatismos del reloj con WDBF 2026 (Foam: No Bloqueo y Carga; Cloth: set final de 90 s, tiempo muerto solo entre sets).
- Estadísticas de quemadas y catches (eventos en mesa), Noticias con redactores delegados, app nativa, dominio propio, Apple login.
- Pruebas faltantes: techo 600–1000 conexiones, escrituras concurrentes, sockets desde varias IP, resistencia 30–60 min, 2 E2E omitidas.
- Render: filtros de build (cada push reinicia el backend y pausa relojes en vivo) y proteger `main`.
- Confirmar "329 partidos" del deck contra la base.

## 4. Propuesta para Jira (proyecto `PC`, espacio Confluence `DDS`)
Crear épica "Sprint 4" (o sprint 4 en el tablero) con historias; estado propuesto según Definition of Done (código, PR/revisión, sin errores de consola, datos realistas, prueba manual, deploy público, Confluence).

| Historia / épica | Estado sugerido |
|---|---|
| Reloj persistido en BD | Listo (probar reinicio en prod) |
| Partidos fuera del fixture | Listo |
| Torneo pausado visible / reparto de rondas / playoffs a pantalla completa | Listo |
| Sentry (integración) | Listo (activo con alertas desde el 07/11) |
| Reloj flotante PiP | Listo |
| Cuentas: login por usuario, Google, onboarding favoritos | Listo (Apple pendiente) |
| Nuevo Inicio, navegación, búsqueda | Listo |
| Control de mesa único / Dashboard de canchas / Armar jornada | Listo (probar con datos reales) |
| Planilla por foto (Gemini) | En revisión: probar lectura real |
| Sanciones en partido y departamento | Listo |
| Sanciones a equipos y a jugadores sin partido | En revisión: sin prueba manual completa |
| Vista del partido | Listo |
| Prode | Listo |
| Perfiles, equipos, Ranking, Competiciones, Mis estadísticas | Listo |
| Podios / campeón / corrección de torneos | En revisión: verificar torneos con promoción |
| Fixture: armado y orden de partidos; carga masiva Nacional | En curso: días reales a confirmar |
| Noticias | En curso: redactores pendientes |
| Reglas del juego y Acerca de | Listo |
| Rename + deploy + migración a producción | Listo |
| Reportes de problemas | En revisión: verificar en prod |
| Tutoriales | En revisión |
| Rendimiento y pruebas de estrés | Listo (pruebas largas pendientes) |
| Entregables (manual, doc técnica, presentación) | Listo |
| Nuevas tareas a crear | Estadísticas quemadas/catches, reloj vs WDBF 2026, limpieza de demo, filtros de build en Render, proteger main, pruebas de estrés largas, dominio propio |

Notas: ajustar a la realidad (la estimación original de Sprint 1 y los sprints previos no se tocan). Pasar a "Listo" solo con DoD completo.

## 5. Esquema sugerido para el informe de la Entrega 6
1. Resumen ejecutivo y objetivo del proyecto.
2. Equipo, roles y metodología Scrum (Scrum Master por sprint, cambios de equipo).
3. Alcance entregado (resumen del punto 1, agrupado por funcionalidad con capturas).
4. Arquitectura y stack (HTTP + Socket.IO, Prisma/Neon, Supabase, Sentry, Gemini).
5. Calidad: pruebas manuales, E2E (24/26), pruebas de estrés y resultados, límites del plan gratuito.
6. Gestión: Jira (historias y estados), Confluence, Definition of Done, flujo de git y deploy.
7. Problemas encontrados y lecciones (sección 2).
8. Pendientes y próximos pasos (sección 3).
9. Anexos: manual de usuario, documentación técnica, presentación, informe de estrés, guía de Sentry, manual de deploy.

## 6. Archivos del paquete
sprint4-resumen-final.md (este), sprint4-resumen-completo.md, sprint4-cierre-07-11.md, informe de pruebas de estrés, sentry.md, manual de usuario, documentación técnica, sprint3 resumen y addenda, manual-deploy.md, y link de la presentación.
