# Sprint 4 — Resumen completo (28/10 al 03/11/2026)

Ramas: `feature/sprint4-backend` (último commit `61709b8`) y `feature/sprint4-frontend` (último commit `b276e2e`). Base de desarrollo: branch de Neon `dev-torneos`. Deploys: Render `pps-2026-3.onrender.com` y proyecto nuevo de Vercel. Copia del tema anterior en la rama `backup/tema-original`.

## 1. Tareas postergadas del Sprint 3 (28/10)
- **Reloj persistido en BD:** tabla `MatchClock`. Tras un reinicio de Render el reloj se recupera en pausa en el último valor; la mesa reanuda a mano. Aviso "Reloj recuperado" en Control.
- **Partidos fuera del fixture:** se pueden agregar con el torneo en curso, con opción de sumar o no a la tabla; pestaña "Fuera del fixture" pública y en admin; asignar un partido existente a un torneo.
- **Torneo pausado:** la organización ve en el fixture los partidos ocultos con la etiqueta "Pausado".
- **Selector "Reparto de rondas"** al armar la llave (cada N días, mismo día, fin de semana).
- **Sentry** en backend y frontend.
- **Playoffs:** "Ver completo" a pantalla completa con zoom, pellizco y arrastre.
- **Reloj flotante (Picture-in-Picture):** chincheta en las tarjetas y botón "Fijar reloj"; funciona en PC, Android e iPhone. Límite: Live Activities / Dynamic Island requieren app nativa.
- **Ciclo del partido:** ENTRETIEMPO tras el 1er tiempo; FINALIZADO solo cuando la mesa o el árbitro lo cierran; aviso por modalidad (Foam "MUERTE SÚBITA", Cloth "SET FINALIZADO").

## 2. Cuentas y acceso
- Usuario de login (mail o usuario), visible solo para admin.
- Perfil: tarjeta "Cuenta y seguridad" (mail, usuario, contraseña con la actual).
- Login estilo BeSoccer: ojito, "¿Olvidaste tu contraseña?", Google (Apple queda para después).
- Onboarding `/bienvenida`: equipos y torneos favoritos la primera vez.
- Rótulo de rol combinado ("Árbitro / Jugador"); ya no existe "Mesa" como rol explícito.
- Menú lateral: tarjeta de usuario con roles en fila propia.
- **Visitas sin sesión (03/11):** Ranking y Sedes siguen en el menú, pero piden iniciar sesión; la pantalla "Sanciones" solo existe para quien tiene sesión.

## 3. Inicio y navegación
- Nuevo Inicio para todos los roles: tira de días por jornada, tira de torneos, "En vivo (n)", tarjeta de partido compacta (solo el escudo abre el banner del equipo).
- Favoritos en el Inicio: bloque "Tus partidos", corazón en los días en que juega un equipo favorito, torneos favoritos destacados.
- Lupa de búsqueda con búsquedas recientes. Noticias fija en la barra inferior.
- "Partidos" de solo lectura para todos los roles, con vista por día (tira de días, calendario, filtros plegables y bloque por torneo).
- Botón "Volver" en todas las pantallas internas; encabezado adaptado a pantallas angostas; tiras deslizables con mouse y rueda en PC.
- Botón "Ver banner" para el admin en la búsqueda y en la lista de equipos.
- **Bug del menú (03/11):** "Mis asignaciones" quedaba marcada también dentro de Historial; ahora los ítems con otro ítem colgando de su ruta se marcan solo en la ruta exacta (`navEnd`).

## 4. Control de mesa, canchas y jornadas
- Control de mesa para todos los jugadores; mesa única por partido (la primera persona con permiso opera, las demás en solo lectura; el bloqueo se libera al salir o 15 s tras desconectarse).
- Línea de tiempo del marcador (sets con su momento), guardada para siempre. 03/11: en Control la lista de sets es un desplegable de alto fijo; el Dashboard de canchas ya no muestra la lista de sets.
- Dashboard de canchas: pestaña "Todas" y una por cancha, jornada por vez, 8 próximos por cancha con "Ver más".
- "Armar jornada" (`/admin/jornada`): tablero canchas × horarios, manual y autoarmar, minutos por turno a elección (por defecto 40). `POST /matches/bulk-schedule`.
- Administración del partido: datos de solo lectura con lápiz, asignaciones en borrador, suspensión y cancelación al final.
- Torneos: "Reiniciar torneo" (doble confirmación; solo pruebas y demos), sección "Eliminados" (restaurar o borrar), guardar los días de todas las fechas del fixture de una vez.
- Asignaciones: "Mis partidos asignados" y "Control de mesa" se unificaron en **Mis asignaciones** (solo próximos); el **Historial** es una entrada aparte; el organizador también tiene Mis asignaciones en la barra inferior.

## 5. Sanciones disciplinarias
### 5.1 En partido (28/10)
- Tarjetas: Advertencia, Amarilla (5 min), Azul (Cloth: 3 min o 2 sets), Roja. Foam: la 2.ª advertencia elimina; Cloth no. La salida en falso en Cloth no es sanción.
- Las sanciones corren con el reloj del partido y se congelan en pausa.
- Departamento de sanciones (`/admin/sanciones`): pendientes, vigentes y evaluadas; la roja expulsa y el admin decide la suspensión (resto de la jornada y/o N fechas, su modalidad o todas). Las fechas cuentan partido por partido.
- El jugador suspendido aparece marcado en la plantilla y en su perfil.
- 03/11: botones de Amarilla/Azul/Roja con tarjeta del color al costado.

### 5.2 A equipos (03/11)
- **Quita de puntos** en la tabla de una zona (por rama y categoría). Modelo `TeamPenalty` (zona, equipo, puntos, motivo `kind`, faltantes, detalle). La tabla resta antes de ordenar y muestra `−N` con la lista de sanciones.
- Motivos: faltan árbitros o mesa (cada equipo presenta 2 de línea + 1 de mesa; 1 punto por persona faltante, máx. 3), no se presentó, llegó tarde, sin jugadores suficientes, agresión, otro (1–20 puntos).
- Con el torneo cerrado no se carga ni se quita (hay que reabrir).
- Endpoints: `POST/DELETE /tournaments/:id/stages/:stageId/penalties`, `GET /sanctions/team-penalties`.

### 5.3 A jugadores sin partido (03/11)
- Para faltas fuera del partido propio. La suspensión ya no necesita una roja: `PlayerSuspension.sanctionId` opcional, `tournamentId` opcional, `reason`, `sourceAt`, `categories`.
- Alcance por modalidad y rama, varias a la vez; bloquea al jugador en esos partidos de sus equipos.
- Endpoints: `GET/POST /sanctions/standalone`, `DELETE /sanctions/standalone/:id`; `/sanctions/active` y `/sanctions/reds` aceptan `?tournamentId`.

### 5.4 Dónde se ve
- Admin → Torneo → pestaña Sanciones (equipos + jugadores del torneo).
- Departamento de sanciones general: pestañas Jugadores y Equipos, con filtro por torneo.
- `/sanciones` para todos con sesión (solo lectura). Backend `GET /sanciones-publicas`.

## 6. Vista del partido y reloj
- Vista de partido para todos con pestañas: Resumen (relojes, tiempo muerto, reloj flotante), Jugadores (con sanciones), detalles con árbitros y mesa, cara a cara por modalidad.
- La cabecera en vivo ya no repite los relojes. Sonido silenciado por defecto.
- Reloj al finalizar: queda en 00:00 y 2.º tiempo.
- Persistencia tras reinicio de Render: se corrigió la carrera (se recuperan los relojes antes de aceptar conexiones); columnas `matchEnded` y `sanctions` en `MatchClock`.

## 7. Predicciones (Prode, sin dinero)
- Puntos con cuotas decimales, bonus por anticipación, base flotante hasta "Habilitado", ranking por torneo y anual; bloqueo por equipo propio.
- Quien es designado árbitro o mesa pierde su predicción de ese partido (se anula, con aviso y etiqueta "Anulada").
- Se guardan las cuotas del cierre; quien no puede predecir ve igual las cuotas hasta que se habilita.
- Sección Predicciones: calendario, torneos, favoritos, mis predicciones, clasificación.
- 03/11 — sin empate en llaves: en llaves, playoffs y ascenso/descenso solo hay dos opciones; el backend rechaza `DRAW` en esos partidos.
- 03/11: pestañas, chips y opciones elegidas con fondo sólido.

## 8. Perfiles, equipos y estadísticas
- Banners estilo OneFootball: jugador (Resumen / Estadísticas / Carrera) y equipo (Resumen / Partidos / Posiciones / Estadísticas / Plantel / Historial); "Mi equipo", "Mis partidos" y "Favoritos" rediseñados.
- Plantel por rama; historial real del equipo (campeón, subcampeón, 3.º, zona).
- Escudos completos y por rama (`TeamBranch.logo`). Sedes: gestión de admin y página pública `/sedes`.
- **Ranking:** Resumen (campeón, ranking, récords), Estadísticas, Salón de la fama, Torneos, Equipos y Cara a cara; filtros por año, modalidad y rama. Backend `/stats/records`.
- **Competiciones:** listado rediseñado con avance y en vivo; finalizadas con campeón.
- **Mis estadísticas:** récord, % de victorias, racha, próximo partido, podios, últimos partidos y sanciones; "Quemadas y catches" como próximamente. `GET /me/stats`.
- Cara a cara: selector de equipos con escudos y buscador.

## 9. Campeón, podios, posiciones y torneos
- **Podio 2-1-3:** Salón de la fama, medallero en el banner del equipo y campeón destacado en el Resumen del torneo. Backend `services/podium.js`.
- **Corrección de campeón:** la etapa de promoción ya no define campeón ni podio (caso Mixto Cloth Apertura: figuraba PCH en vez de Panthers). Torneos ya cerrados: reabrir y volver a cerrar.
- **Posiciones del equipo:** colores de ascenso (verde), descenso (rojo) y playoff de ascenso/permanencia (naranja) con leyenda; insignia de posición redonda.
- **Torneos cerrados:** `PATCH /tournaments/:id/stages/:stageId` corrige nombre, fase, categoría y cupos sin tocar fixture ni resultados.
- **Nombre del formato:** `Tournament.formatLabel` opcional. Imagen propia del torneo (`Tournament.logo`).
- Noticias: portada desde archivo o enlace; lectura sobre fondo liso.

## 10. Tema visual
- Oscuro "azul noche" y claro "celeste cielo": solo tarjetas, barras y etiquetas; el fondo de Dodgeball Buenos Aires no se toca.
- 03/11 sólidos: `--accent-soft` opaco y tarjetas con fondo sólido.
- 03/11 skin "Acero" (opcional, modo oscuro): fondo negro total, tarjetas gris acero (`data-skin="acero"`, Perfil → tema).
- 03/11 imágenes: todos los campos de subida aceptan cualquier formato (se guarda WebP); límite 15 MB. HEIC de iPhone puede fallar.

## 11. Orden del repo
- Los scripts de carga de resultados (uso único) se sacaron de git.

## 12. Pendiente (al 03/11)
- **Migraciones** en dev y producción (`npx prisma migrate deploy && npx prisma generate`): `20261030130000_set_timeline`, `20261030150000_tournament_deleted_at`, `20261030170000_venues`, `20261030180000_match_sanctions`, `20261030190000_player_suspensions`, `20261030200000_suspension_scope`, `20261030210000_team_branch_logo`, `20261102170000_match_clock_sanctions`, `20261102180000_tournament_logo`, `20261103180000_tournament_format_label`, `20261103190000_team_penalty`, `20261103200000_team_penalty_kind`, `20261103210000_player_suspension_standalone`, `20261103220000_suspension_categories`, más las 4 del Prode. (Aplicadas luego en producción el 04/11.)
- **Datos:** reabrir/cerrar torneos con promoción; corregir cupos de Cloth Masculino; confirmar posiciones de promoción de Foam Mixto; marcar los Clausura como Finalizados; borrar torneo de promoción duplicado en desarrollo.
- **Sin probar (03/11):** sanciones a equipos y a jugadores sin partido (quita de puntos, bloqueo por categorías, Vigentes, `/sanciones`), Ranking/Sedes con visitas, imágenes de distintos formatos, skin Acero en celular.
- **Decisiones abiertas:** tema claro estilo Acero; si el motivo de la sanción se muestra a todos o solo a la organización; sanción a equipo ligada a un partido o con W.O.
- **Ideas no pedidas:** cuotas del Prode ponderadas por votos; estadísticas de quemadas y catches con registro de eventos en la mesa; reusar el selector de equipos con escudos.
- **Cierre:** backup de Neon antes de producción, `migrate deploy`, PRs a `main`, Jira a "Listo" con la Definition of Done y Confluence al día.
- **Configuración:** URLs de Supabase (incluir `/recuperar`), desconectar proyectos viejos de Vercel sin borrarlos.
