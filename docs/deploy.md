# Deploy — Dodgeball BA

Producción: frontend en Vercel https://dodgeball-ba.vercel.app y backend en Render https://dodgeball-ba.onrender.com. Base de datos en Neon (rama `production`), autenticación y archivos en Supabase.

## 1. Flujo de cambios
- Rama `main`: cada push redeploya solo el backend (Render) y el frontend (Vercel).
- Desde el 04/11/2026 el equipo sube directo a `main` (acuerdo para ir más rápido). Lo previsto en el curso es rama `feature/...` + PR + aprobación; proteger `main` queda pendiente.
- Cada push reinicia el backend de Render: los relojes de partidos en vivo vuelven en pausa (se recuperan desde `MatchClock`) y la mesa los reanuda. **No pushear durante un partido en vivo.**

## 2. Render (backend)
- Servicio `dodgeball-ba`, rama `main`, Root Directory `backend`, Build `npm install`, Start `npm start`. Escucha en `process.env.PORT`.
- Plan gratuito: duerme sin tráfico (primera respuesta ~30 s). Antes de una demo abrir `/health` unos minutos antes (o usar UptimeRobot).
- Variables de entorno (Settings → Environment). Detalle completo en `documentacion-tecnica.md`:

| Variable | Notas |
|---|---|
| `DATABASE_URL` | Neon `production`, con `?sslmode=require`. Host `-pooler` en Render |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Mal cargadas causaron fallas de login/socket |
| `ADMIN_EMAILS` | Admins iniciales, separados por coma |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Lectura de planillas (capa gratis) |
| `SENTRY_DSN` | DSN del proyecto de backend |
| `SENTRY_TEST_KEY` | Solo para probar; borrarla después |

## 3. Vercel (frontend)
- Proyecto `dodgeball-ba`, rama de producción `main`, Root Directory `frontend`, framework Vite.
- Variables: `VITE_BACKEND_URL` (https://dodgeball-ba.onrender.com), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN` (DSN del proyecto de frontend), `VITE_OAUTH_PROVIDERS=google`.
- Las variables `VITE_` se leen al compilar: al cambiar una hay que **redeployar**.
- Si un deploy "Ready" no se ve, confirmar que está promovido a Production (pill azul) y que "Auto-assign Custom Production Domains" está activo.
- Plan Hobby: tope de 100 deploys por día. Cada push consume uno.
- Con la PWA instalada, limpiar datos del sitio (o recargar con Ctrl+F5) para ver versiones nuevas.

## 4. Migraciones de base de datos (manuales)
Render solo corre `npm install`: las migraciones **no** se aplican solas.
1. Backup en Neon: crear una rama (`backup-pre-...`) justo antes.
2. En `backend/`, con `DATABASE_URL` apuntando a la base destino, usar la **URL directa** de Neon (sin `-pooler`; el pooler da P1002 por el bloqueo de migraciones):
   ```
   npx prisma migrate deploy
   npx prisma generate
   ```
   En PowerShell: `$env:DATABASE_URL="..."` antes de los comandos.
3. Si aparece P1002 por una sesión colgada: en el SQL Editor de Neon, `select pg_terminate_backend(pid) from pg_stat_activity where ...` sobre la sesión que retiene el lock.
4. Reiniciar el backend y buscar en el log `[clock] relojes recuperados: N`.
5. Probar en la app real.

Última migración aplicada en producción: `20261107120000_bug_reports`.

## 5. Supabase
- Auth: en Redirect URLs incluir `https://dodgeball-ba.vercel.app` y `/recuperar`.
- Storage: buckets de fotos, escudos y planillas; bucket privado `bug-reports` (se crea en la primera subida).
- Proveedor Google habilitado (cliente OAuth en Google Cloud); Apple pendiente.

## 6. Neon
- Ramas: `production` (hoy copia de `dev-torneos`), `dev-torneos` (desarrollo) y backups.
- Scripts útiles en `backend/scripts`: `copiar-bd.js` (copia datos entre ramas; `--aplicar`, `--vaciar-destino`), `cargar-torneos.js` (Nacional 2026), `fusionar-equipos.js`.

## 7. CORS
El origin del frontend (`https://dodgeball-ba.vercel.app`) debe figurar en el CORS de Express y de Socket.IO. Si falta, el socket no conecta en producción y el error solo se ve en la consola del navegador.

## 8. Checklist antes de una demo
1. Backend despierto (`/health` responde `{"status":"ok"}`).
2. Último deploy de Vercel promovido a Production.
3. Consola del navegador: `[socket] conectado` contra `onrender.com`.
4. Nadie va a pushear a `main` durante la demo.
5. Sentry sin issues nuevos sin revisar.

## 9. Claves y accesos (qué guardar)
Guardar en un gestor de contraseñas compartido, nunca en el repo: cuenta de Google de AI Studio (para `GEMINI_API_KEY`), accesos a Render, Vercel, Neon, Supabase y Sentry.
