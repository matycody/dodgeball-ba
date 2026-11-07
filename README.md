# 🏐 Dodgeball BA — Cronómetro y gestión de partidos

Aplicación web (PWA) para seguir y administrar los partidos de **Dodgeball Buenos Aires** en tiempo real: reloj de partido y de set sincronizado para todos, torneos con fixture, tablas y llaves, roles, sanciones, estadísticas y predicciones. Trabajo de la Práctica Profesional Supervisada (PPS 2026) con cliente real.

**Producción:** https://dodgeball-ba.vercel.app · API: https://dodgeball-ba.onrender.com

## Qué incluye
- **Cronómetro en vivo:** dos relojes independientes (partido de 2 tiempos de 20 min y set de 3 min), pausa grupal, tiempo muerto, modalidades Foam y Cloth con sus automatismos, reloj flotante (Picture-in-Picture) y modo offline. El reloj llega por Socket.IO segundo a segundo y se recupera si el servidor se reinicia.
- **Torneos:** ligas, copas y llaves con zonas y playoffs; fixture a mano o por sorteo; tabla con desempates; podio y campeón; dashboard de canchas y "Armar jornada".
- **Roles:** visitante, usuario, jugador, árbitro/mesa y organización, con menús propios.
- **Disciplina:** tarjetas en partido, suspensiones, sanciones a jugadores sin partido y quita de puntos a equipos.
- **Contenido:** equipos y jugadores con banner público, Ranking, Sedes, Noticias, Reglas del juego, Prode (predicciones con puntos, sin dinero) y Mis estadísticas.
- **Planilla de juego por foto:** lectura con IA (Gemini) y confirmación de la mesa; la foto queda como evidencia.
- **Calidad y operación:** reporte de problemas con capturas, monitoreo con Sentry, tutoriales dentro de la app y pruebas de carga y E2E.

## Stack
| Capa | Tecnología | Servicio | Carpeta |
|---|---|---|---|
| Frontend | React + Vite (PWA) | Vercel | `frontend/` |
| Backend | Node.js, Express, Socket.IO | Render | `backend/` |
| Base de datos | PostgreSQL + Prisma | Neon | `backend/prisma/` |
| Autenticación y archivos | Supabase Auth y Storage | Supabase | — |
| Extras | Sentry (errores), Gemini (planillas) | — | — |

El frontend habla con el backend por HTTP (REST) y por WebSocket (Socket.IO); Supabase valida las sesiones.

## Documentación
Todo está en [`docs/`](docs/README.md):

| Documento | Contenido |
|---|---|
| [Manual de usuario](docs/manual-usuario.md) | Uso de la app por rol, con capturas |
| [Documentación técnica](docs/documentacion-tecnica.md) | Arquitectura, variables de entorno, API, Socket.IO, modelo de datos |
| [Deploy](docs/deploy.md) | Render, Vercel, migraciones, Supabase, Neon |
| [Sentry](docs/sentry.md) | Monitoreo de errores |
| [Pruebas](docs/pruebas.md) | Vitest, E2E, carga y estrés |
| [Bitácora](docs/bitacora/) | Informes por sprint |

## Levantar el proyecto en local
Hace falta **Git** y **Node.js 24 (LTS)**. El backend corre en el puerto 3001 y el frontend en el 5173, cada uno en su terminal.

1. **Credenciales:** no están en el repo. Pedíselas al equipo por un canal privado: connection string de Neon (directa, sin `-pooler`), URL y claves `anon` y `service_role` de Supabase, y un mail de administrador.
2. **Clonar:**
   ```bash
   git clone https://github.com/matycody/dodgeball-ba.git
   cd dodgeball-ba
   ```
3. **Backend:**
   ```bash
   cd backend
   npm install
   ```
   Crear `backend/.env`:
   ```
   PORT=3001
   DATABASE_URL=<connection string de Neon>
   SUPABASE_URL=<url del proyecto>
   SUPABASE_ANON_KEY=<clave anon>
   SUPABASE_SERVICE_ROLE_KEY=<clave service_role>
   ADMIN_EMAILS=<mail de admin>
   ```
   Después:
   ```bash
   npx prisma generate
   npm run dev
   ```
   La clave `service_role` es secreta: va solo en el backend. Las variables opcionales (Gemini, Sentry, caché) están en la documentación técnica.
4. **Frontend** (otra terminal):
   ```bash
   cd frontend
   npm install
   ```
   Crear `frontend/.env.local`:
   ```
   VITE_BACKEND_URL=http://localhost:3001
   VITE_SUPABASE_URL=<la misma URL>
   VITE_SUPABASE_ANON_KEY=<la misma clave anon>
   ```
   y `npm run dev` (abre http://localhost:5173). Vite lee las variables solo al arrancar.
5. **Verificar:** `http://localhost:3001/health` debe responder `{"status":"ok"}` y la consola del navegador debe decir `[socket] conectado`.

> ⚠️ No corras `npx prisma migrate deploy` ni `npm run seed` contra una base compartida o de producción sin backup. Las migraciones se aplican a mano (ver [Deploy](docs/deploy.md)).

## Scripts
| Carpeta | Comando | Qué hace |
|---|---|---|
| `backend` | `npm run dev` / `npm start` | Levanta el servidor |
| `backend` | `npm run seed` | Crea los administradores de `ADMIN_EMAILS` en una base vacía |
| `backend` | `npm run smoke` | Más de 130 chequeos contra un backend en marcha |
| `backend` | `npm test` | Tests unitarios (Vitest) |
| `frontend` | `npm run dev` / `build` / `preview` | Desarrollo, compilación y prueba del build (PWA) |
| `frontend` | `npm run lint` | ESLint |
| `frontend` | `npm run test:e2e` | Pruebas E2E con Playwright |

La PWA solo existe en el build: para probarla, `npm run build` y `npm run preview`.

## Deploy
Producción sale de `main`: Render (backend, carpeta `backend`) y Vercel (frontend, carpeta `frontend`) redeployan con cada push. Las migraciones de la base **no** son automáticas. Cada push reinicia el backend y pausa los relojes en vivo, así que no conviene pushear durante un partido. Detalle en [docs/deploy.md](docs/deploy.md).

## Problemas comunes
| Problema | Qué hacer |
|---|---|
| `node` o `npm` no se reconocen | Cerrá y abrí la terminal; si sigue, reinstalá Node.js |
| Error de scripts en PowerShell | `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` o usá cmd/Git Bash |
| `ENOENT ... package.json` | Corré los comandos dentro de `backend/` o `frontend/`, no en la raíz |
| `Port 3001 is already in use` | Cerrá el otro proceso o cambiá `PORT` y `VITE_BACKEND_URL` |
| El backend no arranca | Revisá `DATABASE_URL` y que hayas corrido `npx prisma generate` |
| Error al loguear o `Missing SUPABASE...` | Revisá las claves de Supabase en ambos archivos y reiniciá |
| El frontend no conecta con el backend | Verificá que el backend corra y `VITE_BACKEND_URL`; reiniciá Vite |
| La primera carga de producción tarda | Render gratuito se duerme: esperá ~1 min y recargá |
| No llega el mail con el código | Mirá spam; hay límite por hora; o creá el usuario en Supabase con "Auto Confirm User" |
| `npm install` tarda muchísimo | La carpeta está en OneDrive/Drive: cloná el repo en otra ubicación |

## Equipo
- Matías Luis Sosa — Backend
- Rodrigo Ezequiel Olivera Calvo — Frontend
- Product Owner: la cátedra
