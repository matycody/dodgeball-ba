# Informe de pruebas de estrés — Post Sprint 4

Nov 6, 2026 · @ADMINS

## Resumen

El backend aguantó 190 espectadores simultáneos con un partido real en vivo y sostuvo unos 75 req/s en `/matches` hasta 200 conexiones sin errores; el primer corte apareció con 400 conexiones (4 timeouts, p97,5 de 9,3 s).

La prueba destapó dos problemas reales, ya corregidos. Con 60 conexiones, `/matches` colapsaba (3 req/s y 180 errores) porque la respuesta de 366 KB se comprimía en cada pedido sobre la CPU limitada de Render. Además, bajo carga la base de datos devolvía errores (10 respuestas 5xx en `/stats/records`) y el caché los amplificaba al hacer que todos los que esperaban recalcularan a la vez. Después de los arreglos, `/matches` pasó de 3 a 56 req/s con 60 conexiones, sin errores.

El techo medido (60 a 75 req/s) coincide con el de `/health` (63 req/s), un endpoint trivial: apunta a la capacidad de la instancia de Render y no al código.

## Condiciones de la prueba

Todas las pruebas se hicieron directamente sobre producción y de solo lectura, el 06/11/2026 entre las 21:40 y las 22:57 (hora de Argentina).

- **Backend:** `https://dodgeball-ba.onrender.com` (Render, con la base en Neon `sa-east-1` por el host `-pooler`). **Frontend:** `https://dodgeball-ba.vercel.app`.
- **Origen de la carga:** una sola PC (la de Matías), en Buenos Aires, desde una única IP.
- **Herramientas:** Playwright (E2E), autocannon desde `backend/carga-prod.mjs` con `Accept-Encoding: gzip` como un navegador real, y `socket-carga.js` (cuenta los ticks del reloj que recibe cada espectador).
- **Datos de producción:** 15 torneos y 28 equipos. `/matches` devuelve 100 partidos por página: 366 KB sin comprimir y unos 27 KB con gzip.
- **Sockets:** sobre un partido real en vivo, solo escuchando.
- **Versión final probada:** rama `main`, commit `d783cea`. Cada push a `main` redeploya Render; algunas corridas coincidieron con un deploy y se repitieron.

## Resultados HTTP

Con 60 conexiones, `/matches` rinde 56 req/s con una mediana de 701 ms, contra 76 req/s y 608 ms el 22/10. Antes de los arreglos de hoy rendía 3 req/s.

| 60 conexiones, 20 s | 22/10 (Sprint 3) | Hoy, antes de los arreglos | Hoy, después |
| --- | --- | --- | --- |
| `/matches` req/s | 76 | 3 | 55,9 |
| `/matches` mediana | 608 ms | 1813 ms | 701 ms |
| `/matches` p97,5 | 2902 ms | 2277 ms | 5988 ms |
| `/matches` errores | 0 | 180 (120 errores y 60 no 2xx) | 0 |
| `/health` req/s | 306 | 71 | 62,8 |
| `/health` mediana | 171 ms | 888 ms | 903 ms |

El p97,5 de 5988 ms es el primer cálculo en frío: al arrancar la prueba las 60 conexiones esperan juntas el mismo recálculo de unos 5 s, y después el caché las atiende rápido.

Los demás endpoints públicos, con 30 conexiones durante 15 s y sin errores en ninguno:

| Endpoint | Req/s | Mediana | p97,5 | Errores |
| --- | --- | --- | --- | --- |
| `/tournaments` | 53,6 | 417 ms | 1217 ms | 0 |
| `/teams` | 78,9 | 297 ms | 1231 ms | 0 |
| `/stats/records` | 65,7 | 297 ms | 3068 ms | 0 |
| `/stats/champions` | 80,1 | 294 ms | 909 ms | 0 |
| `/tournaments/:id` | 88,3 | 290 ms | 898 ms | 0 |
| `/teams/:id/posiciones` | 55,9 | 289 ms | 4925 ms | 0 |
| `/matches/:id` | 72,6 | 289 ms | 2354 ms | 0 |

Una sola consulta sin caché tarda entre 1,5 y 5 s según el endpoint (`/matches` 3 a 5 s, `/teams/:id/posiciones` 4 a 5 s, `/stats/records` 2 s, `/stats/champions` 1,5 s). Las colas de 3 a 5 s de la tabla son ese primer cálculo.

`/sanciones-publicas` pide sesión (401) y quedó fuera de la prueba.

## Punto de quiebre de `/matches`

El rendimiento se estanca en unos 75 req/s desde las 200 conexiones y la espera crece con la cola; el primer error aparece con 400 conexiones, con 4 timeouts de más de 10 s.

| Conexiones | Req/s | Mediana | p97,5 | Máximo | Errores |
| --- | --- | --- | --- | --- | --- |
| 60 | 59,8 | 766 ms | 3201 ms | 3512 ms | 0 |
| 100 | 63,5 | 1410 ms | 3793 ms | 4260 ms | 0 |
| 200 | 75,0 | 2912 ms | 5803 ms | 6032 ms | 0 |
| 400 | 75,1 | 3976 ms | 9298 ms | 9839 ms | 4 timeouts |

Ningún escalón devolvió respuestas 4xx o 5xx: las peticiones de más esperan en cola y no se rechazan. La prueba se cortó sola al aparecer el primer error, como estaba previsto.

Como estimación, si cada pantalla de la app hace unos 5 pedidos, 75 req/s equivalen a unas 15 cargas de pantalla por segundo sostenidas desde una sola instancia.

## Sockets

190 espectadores simultáneos recibieron el reloj de un partido real en vivo, sin rechazos ni errores de conexión. El 22/10 el máximo probado fue de 100 (27 / 28 / 29 ticks por usuario).

| Espectadores | Conectados | Rechazados | Errores | Recibieron ticks | Ticks por usuario (mín / prom / máx) |
| --- | --- | --- | --- | --- | --- |
| 100 | 100 | 0 | 0 | 100 de 100 | 28 / 29,0 / 29 |
| 150 | 150 | 0 | 0 | 150 de 150 | 26 / 27,1 / 29 |
| 190 | 190 | 0 | 0 | 190 de 190 | 25 / 26,2 / 29 |

En 30 s se esperan unos 30 ticks. El promedio baja con más usuarios porque las conexiones entran escalonadas y las últimas se suman unos segundos tarde; no hay evidencia de ticks perdidos una vez conectados.

Desde una sola PC el tope es de 190 a 200 espectadores, porque el servidor limita las conexiones por IP a 200 (`MAX_CONN_PER_IP`). No se probó con operadores enviando comandos del reloj mientras había espectadores.

## E2E con Playwright

La suite completa contra `https://dodgeball-ba.vercel.app` terminó con 24 pruebas aprobadas y 2 omitidas, sin fallas.

La primera corrida tuvo 4 fallas, todas en el login. Eran un selector desactualizado: el botón pasó de "Ingresar" a "Iniciar sesión" en el rediseño del Sprint 4 y la prueba seguía buscando el nombre viejo. No era un error de la app. Se corrigió en `frontend/e2e/login.spec.js` (commit d28d1ce, rama `main`).

Las 2 pruebas omitidas requieren credenciales (`E2E_EMAIL` y `E2E_PASSWORD`), que no se cargaron para no escribir en producción.

## Hallazgos y arreglos

| Hallazgo | Causa | Arreglo | Commit |
| --- | --- | --- | --- |
| `/matches` colapsaba a 3 req/s con 120–180 errores | Compresión gzip repetida por cada pedido sobre una respuesta de 366 KB, más pedidos simultáneos recalculando lo mismo | Microcaché de 5 s con respuesta gzip precomprimida, espera compartida entre pedidos iguales, versión vencida servida mientras se renueva y descarte de cálculos viejos tras una escritura | 15697b6, 5df1219, d783cea |
| Cálculo de forma de equipos lento | Una consulta por equipo | Una sola consulta para todos los resultados, con memoización | 15697b6, 9032978 |
| Errores de Prisma ilegibles en los logs de Render | Mensajes largos con códigos de color | Función `briefErr` que deja el código y las últimas 2 líneas | 9032978, d783cea |
| Errores de Prisma bajo carga paralela | Probable agotamiento del pool de conexiones (la causa no se confirmó en los logs) | Pool configurable: máximo 15 conexiones, espera de conexión de 20 s | d783cea |
| `/health` con 45 de 50 respuestas 5xx | Coincidió con un deploy de Render; no fue un error de código | Regla: probar solo después de "Your service is live" | — |
| Login E2E fallando | Selector desactualizado | Botón "Iniciar sesión" | d28d1ce |

Resultado de `/matches`: de 3 req/s a unos 56–75 req/s, con 0 errores hasta 200 conexiones.

## Limitaciones y próximos pasos

**Limitaciones**

- No se confirmó el tipo de instancia ni la región de Render; el `/health` bajó de 306 a unos 63 req/s respecto del servicio anterior y puede deberse a eso.
- No hay métricas de CPU ni memoria del servidor durante las pruebas.
- La causa del error de Prisma no se confirmó en los logs.
- El primer cálculo en frío (tras un deploy o una escritura) sigue tardando 3–5 s.
- No se probaron escrituras bajo carga.
- Las pruebas de sockets salen de una sola IP, con tope de 200 conexiones.
- Cada push a `main` redeploya y pausa los relojes de partidos en vivo.

**Próximos pasos**

1. Confirmar en Render el tipo de instancia y la región, y mirar CPU y memoria durante una corrida.
2. Precalentar el caché al arrancar y después de cada escritura.
3. Aligerar `/matches` (`phasesFor` y `ranksFor`).
4. Probar escrituras concurrentes y una prueba de resistencia de 30 a 60 minutos.
5. Repetir sockets desde otra IP o con `MAX_CONN_PER_IP` más alto, y con operadores enviando comandos.
6. Correr Playwright con `E2E_EMAIL` y `E2E_PASSWORD` en un entorno de prueba.
7. Activar la protección de la rama `main`.

## Ronda del 07/11/2026

La segunda ronda confirma que el techo es el plan gratuito de Render (0,1 CPU) y que las optimizaciones sin costo lo corrieron hacia arriba: el reloj en vivo sigue exacto, un tick por segundo, y la suite E2E pasa completa.

| Prueba | Resultado |
| --- | --- |
| Techo de Render | Incluso `/health` rinde \~51–61 req/s: el límite es la CPU, no la lógica |
| CDN de Vercel (`/edge`) | Las lecturas públicas responden HIT desde el borde; sin costo |
| Protección DDoS de Vercel | Bloquea una sola IP a más de \~1000 req/s (403 y corte TLS): no se prueba carga alta contra Vercel |
| Quiebre HTTP contra Render | 400 conexiones simultáneas, 0 errores ni timeouts |
| Sockets | 100, 150 y 190 espectadores sin perder ticks (reloj corriendo) |
| Playwright (celular y escritorio) | 24 pasaron, 2 omitidas (requieren `E2E_EMAIL` y `E2E_PASSWORD`) |

Cambios aplicados: caché en memoria con ETag/304, gzip precomprimido y recalentado de las rutas más pedidas; cabeceras `s-maxage=5` para que el CDN reutilice respuestas; consultas de posiciones, fases y forma en lote; ventana de forma limitada a 540 días; UptimeRobot cada pocos minutos para que Render no se duerma.

Playwright mostró un fallo en `liga: lista los torneos` (solo celular): el test esperaba textos que la página ya no muestra una vez cargada. Se corrigió el test (ahora espera las pestañas "En curso" y "Finalizadas"), no la app.

Pendiente: buscar el techo real con 600, 800 y 1000 conexiones sin partidos en vivo; probar escrituras concurrentes; más de 190 sockets desde varias IP; filtros de build en Render para que cada push de frontend no reinicie el backend (reinicia y pausa los relojes en vivo).
