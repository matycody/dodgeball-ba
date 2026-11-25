# Dodgeball BA — contexto para Claude Code

TP de la Práctica Profesional Supervisada (PPS 2026, Scrum, cliente real: Dodgeball Buenos Aires). Cronómetro y gestión de partidos de dodgeball en tiempo real. Documentación completa en `docs/` (empezar por `docs/README.md`).

## Equipo
- Matías Luis Sosa (Backend) y Rodrigo Ezequiel Olivera Calvo (Frontend). Product Owner: la cátedra.
- Responder en español, directo y sin relleno.

## Stack (fijo)
- Frontend: React + Vite (PWA) en Vercel (`frontend/`).
- Backend: Node.js, Express, Socket.IO en Render (`backend/`).
- Base de datos: PostgreSQL + Prisma en Neon (`backend/prisma/`).
- Auth y archivos: Supabase (Auth nunca a mano). Extras: Sentry (errores) y Gemini (lectura de planillas).
- Producción: https://dodgeball-ba.vercel.app y https://dodgeball-ba.onrender.com (base en la rama `production` de Neon; desarrollo y pruebas en `dev-torneos`). Render en plan gratuito.

## Reglas del dominio
- Dos relojes independientes: partido (2 tiempos de 20 min) y set (3 min). El reloj llega por Socket.IO segundo a segundo; no reducir los ticks ni contar el tiempo en el cliente.
- Foam: al vencer el set, muerte súbita. Cloth: al vencer el set, se suman 2 puntos al equipo con más jugadores en cancha y el set se reinicia.
- FINALIZADO solo lo pone la mesa o el árbitro, no el 00:00.
- Contrato de sockets con prefijo `match:` (ver `docs/documentacion-tecnica.md`).
- Roles: visitante, usuario, jugador, árbitro/mesa y organización (ADMIN). Mesa única por partido.
- La etapa de promoción (ascenso/permanencia) no define campeón ni podio.

## Trabajo en git
- Los cambios deben entrar por una rama `feature/...` y un PR. La protección de `main` en GitHub todavía no está activada (pendiente), así que no pushear directo salvo pedido de Matías.
- Cada merge a `main` redeploya Render y Vercel y reinicia el backend, que pausa los relojes en vivo: no mergear durante un partido.
- Commitear y pushear solo cuando Matías lo pida ("commit"). Los commits terminan con las líneas de atribución de la sesión.

## Base de datos y migraciones
- Render solo corre `npm install`: las migraciones se aplican a mano (`npx prisma migrate deploy` y `npx prisma generate`) con la URL directa de Neon (sin `-pooler`), siempre con backup previo. Avisar antes de tocar producción.
- Nunca correr scripts de escritura masiva (`seed`, `copiar-bd`, `cargar-torneos`) contra producción sin backup y confirmación.

## Seguridad
- No poner credenciales, claves ni DSN en el repo, en la documentación ni en chats. Solo nombres de variables.
- `SUPABASE_SERVICE_ROLE_KEY` va solo en el backend; el frontend usa la clave `anon`.

## Definition of Done
Una historia está terminada cuando: funciona en local y cumple el criterio de aceptación; no rompe lo existente ni deja errores de consola; tiene datos de prueba realistas; está probada manualmente; está deployada y accesible; Confluence queda al día si cambia la arquitectura o el alcance; y recién entonces el issue de Jira pasa a "Listo".

## Gestión
- Jira: proyecto `PC` en proyectopps2026.atlassian.net. Confluence: espacio `DDS`.
- Comunicación: Discord; sesiones de trabajo viernes y sábados de 18:00 a 22:00.

## Estado y pendiente
- Entrega y defensa final: sábado 05/12/2026 (absorbe la Entrega 7). Producción estable, claves rotadas. Pendiente: activar la protección de `main`.
- Pendiente (posterior a la entrega): estadísticas de quemadas y catches, alinear automatismos con el reglamento WDBF 2026, limpiar usuarios y fichas demo de producción, pruebas de estrés largas, filtros de build en Render y dominio propio. Ver `docs/bitacora/`.
