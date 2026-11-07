# Sentry — puesta en marcha (Dodgeball BA)

El código ya está listo: Sentry se activa solo si existe el DSN. Falta crear el proyecto y cargar las variables.
Plan gratuito alcanza (5.000 errores/mes). Solo se registran errores: sin trazas ni datos personales.

## 1. Crear el proyecto (una vez, 10 min)
1. Entrar a sentry.io con la cuenta del equipo y crear la organización (si no existe).
2. Crear **dos proyectos** (así los errores del servidor y del navegador no se mezclan):
   - `dodgeball-backend` → plataforma **Node.js / Express**.
   - `dodgeball-frontend` → plataforma **React**.
3. En cada uno, copiar el **DSN** (Settings → Client Keys). Son dos DSN distintos.

## 2. Variables de entorno
| Dónde | Variable | Valor |
|---|---|---|
| Render (servicio del backend) | `SENTRY_DSN` | DSN de `dodgeball-backend` |
| Render | `SENTRY_TEST_KEY` | una clave larga inventada (solo para probar; borrarla después) |
| Vercel (proyecto del frontend) | `VITE_SENTRY_DSN` | DSN de `dodgeball-frontend` |
| Local (`backend/.env`, `frontend/.env.local`) | vacías | así el desarrollo no manda ruido |

Después de cargarlas: **redeploy** de Render y de Vercel (las variables `VITE_` se leen al construir).

## 3. Probar que llega todo
- **Backend:** abrir `https://<backend>.onrender.com/debug-sentry?key=<SENTRY_TEST_KEY>`. Devuelve error 500 y en Sentry aparece "Prueba de Sentry (backend)".
- **Frontend:** abrir la web, consola del navegador → `__sentryTest()`. Aparece "Prueba de Sentry (frontend)".
- Cada evento muestra `release` (commit) y `environment` (production). Si falta alguno, revisar la variable correspondiente.
- Al terminar: **borrar `SENTRY_TEST_KEY` de Render** (con eso `/debug-sentry` vuelve a dar 404).

## 4. Alertas (lo que hace que sirva)
En cada proyecto → Alerts → Create Alert:
- **Error nuevo:** "A new issue is created" → enviar mail a todo el equipo.
- **Pico:** más de 10 eventos en 5 minutos → mail. (Útil durante un torneo en vivo.)
- Settings → Notifications: dejar activado el mail por "Issue Alerts".

## 5. Rutina
- Revisar Issues una vez al día en torneos; marcar "Resolve" al arreglar (si vuelve a pasar, reabre solo con el commit).
- Los reportes que manda la gente (menú → Reportes) y Sentry se complementan: Sentry ve los errores de código, los reportes ven lo que se ve mal o confunde.

## 6. Opcional, después de la entrega (mejora el detalle)
Sin esto, los errores del frontend aparecen con código minificado (poco legible).
1. En Sentry: Settings → Auth Tokens → crear token con permiso `project:releases` y `org:read`.
2. `cd frontend && npm i -D @sentry/vite-plugin`.
3. En `vite.config.js`: `build: { sourcemap: 'hidden' }` y agregar el plugin `sentryVitePlugin({ org, project: 'dodgeball-frontend', authToken: process.env.SENTRY_AUTH_TOKEN })` al final de `plugins`.
4. En Vercel: variable `SENTRY_AUTH_TOKEN` (solo en Build).
No conviene tocarlo la noche de una entrega: cambia el build de Vercel.

## 7. Qué NO se manda (ya configurado)
`sendDefaultPii: false` (sin IP ni mails), `tracesSampleRate: 0` (sin rendimiento). Solo errores no controlados del servidor (5xx), de sockets y del navegador.
