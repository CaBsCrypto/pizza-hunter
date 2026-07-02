# Pizza Hunter — Tablero de tickets

_Fuente de verdad para el avance de los sprints. Derivado de `BACKLOG_Y_SPRINTS.md`._
_Última actualización: 2026-07-01 · Scrum Master._

## Cómo usar este tablero
- Cada ticket tiene un estado en el checkbox del título: `[ ]` pendiente · `[~]` en curso · `[x]` hecho · `[!]` bloqueado.
- Al empezar un ticket, cambia `[ ]`→`[~]` y pon tu nombre en **Owner**.
- Al cerrarlo, marca `[x]` y verifica que **todos** los criterios de aceptación se cumplen.
- No se cierra un ticket con tests en rojo o criterios a medias.
- Puntos: **S**=2 · **M**=5 · **L**=8.

## Estado legend
`[ ]` To Do   `[~]` In Progress   `[x]` Done   `[!]` Blocked

---

## Panel de avance

| Sprint | Objetivo | Tickets | Puntos | Hechos |
|--------|----------|---------|--------|--------|
| 0 | Estabilización y quick wins | 6 | 15 | 0 |
| 1 | Motor unificado | 7 | 38 | 1 |
| 2 | Netcode y seguridad | 7 | 43 | 0 |
| 3 | Performance y móvil | 8 | 34 | 0 |
| 4 | Balance y retención | 9 | 34 | 0 |
| 5 | UX, onboarding y accesibilidad | 11 | 32 | 0 |

> Progreso global: **1 / 48 tickets** cerrados (Fase 0 del motor ya entregada).

---

## SPRINT 1 — Motor unificado _(en curso)_

### [x] PH-001 · Andamiaje del motor compartido (Fase 0)
- **Epic:** A · **Prioridad:** Alta · **Puntos:** 5 · **Owner:** Claude · **Estado:** Done
- **Descripción:** Crear `src/shared/constants.ts` y `src/shared/simulation.ts` (motor puro con `SimEnv` inyectable) y añadir campos opcionales a `Player`.
- **Criterios de aceptación:**
  - [x] `constants.ts` centraliza radios², cooldowns, timers y tunables.
  - [x] `simulation.ts` expone colisiones, proyectiles, IA de bots, movimiento, orbs, spawn y leaderboard.
  - [x] `types.ts` con `respawnTime?`/`isBot?`.
  - [x] `tsc --noEmit` en verde.
- **Archivos:** `src/shared/*`

### [ ] PH-002 · Conectar el modo solo al motor compartido
- **Epic:** A (A1) · **Prioridad:** Alta · **Puntos:** 8 · **Depende de:** PH-001
- **Descripción:** Reescribir el loop de `gameStore.ts` para delegar en `stepBot`/`stepMovement`/`stepProjectiles`/`maybeSpawnRandomOrb`/`buildLeaderboard`. Eliminar la lógica duplicada.
- **Criterios de aceptación:**
  - [ ] `gameStore.ts` ya no contiene lógica de colisión/IA/proyectiles propia.
  - [ ] Comportamiento en partida idéntico al actual (bots, escudos, boost, spill, timer, leaderboard).
  - [ ] `SimEnv` del solo usa `Date.now`/`Math.random`/`uuid` y `emitShootEffect` vía CustomEvent.
  - [ ] `tsc` en verde; humo manual jugando una ronda completa.
- **Archivos:** `src/store/gameStore.ts`

### [ ] PH-003 · Conectar el servidor al motor compartido
- **Epic:** A (A2) · **Prioridad:** Alta · **Puntos:** 8 · **Depende de:** PH-002
- **Descripción:** Reescribir el tick de `server.ts` para usar el mismo motor. Unificar `spawnOrb`, caps (`ORB_SOFT_CAP`/`MAX_ORBS`) y probabilidades hoy divergentes entre modos.
- **Criterios de aceptación:**
  - [ ] `server.ts` delega bots/proyectiles/orbs/leaderboard en `simulation.ts`.
  - [ ] Sin divergencias de constantes entre solo y servidor (mismo spawn %, escudo %, caps).
  - [ ] `SimEnv` del server usa `emitShootEffect` vía `io.to().emit`.
  - [ ] Verificado con 2 pestañas en una sala.
- **Archivos:** `server.ts`

### [ ] PH-004 · Migrar el movimiento del jugador local al motor
- **Epic:** A (A3) · **Prioridad:** Alta · **Puntos:** 5 · **Depende de:** PH-002
- **Descripción:** Sacar la física del jugador de `GameScene.tsx` (useFrame) y usar `stepMovement`. `GameScene` queda solo como render.
- **Criterios de aceptación:**
  - [ ] El jugador local se simula con `stepMovement`, no con lógica inline en `useFrame`.
  - [ ] Sensación de control equivalente; sin regresión de colisiones.
  - [ ] `GameScene` no contiene reglas de juego (solo render/inputs).
- **Archivos:** `src/components/GameScene.tsx`

### [ ] PH-005 · Reloj de simulación sincronizado (fin de "muertes fantasma")
- **Epic:** A (A5) · **Prioridad:** Crítica · **Puntos:** 5 · **Depende de:** PH-003
- **Descripción:** El servidor envía `serverTime`/`room.startTime` en cada `state`; cliente y servidor alimentan `getMovingObstacles` con ese reloj, no con `Date.now()` local.
- **Criterios de aceptación:**
  - [ ] `getMovingObstacles` recibe tiempo sincronizado en todos los call-sites.
  - [ ] Posición de meseros/roombas coincide entre clientes y servidor.
  - [ ] Sin muertes contra obstáculos "invisibles" en MP con latencia simulada.
- **Archivos:** `server.ts`, `src/components/GameScene.tsx`, `src/shared/*`

### [ ] PH-006 · Fixed timestep para el jugador local
- **Epic:** A (A6) · **Prioridad:** Alta · **Puntos:** 5 · **Depende de:** PH-004
- **Descripción:** Acumulador de tiempo fijo (o clamp de `delta`) para que el jugador no dependa del framerate. Elimina el tunneling por drops de FPS.
- **Criterios de aceptación:**
  - [ ] La simulación del jugador avanza en pasos fijos de 1/60 (acumulador).
  - [ ] A 30 y 144 fps el desplazamiento/giro por segundo es idéntico.
  - [ ] Sin atravesar obstáculos en stutters (probar con throttling de CPU).
- **Archivos:** `src/components/GameScene.tsx`

### [ ] PH-007 · Reemplazar literales de colisión por constantes
- **Epic:** A (A4) · **Prioridad:** Media · **Puntos:** 2 · **Depende de:** PH-003
- **Descripción:** Eliminar cualquier literal residual (`< 2.5`, `+0.65`, etc.) que quede tras la migración; todo desde `constants.ts`.
- **Criterios de aceptación:**
  - [ ] `grep` de números mágicos de colisión en `server.ts`/`gameStore.ts`/`GameScene.tsx` = 0.
  - [ ] `constants.ts` es la única fuente de radios/padding.
- **Archivos:** varios

---

## SPRINT 0 — Estabilización y quick wins _(recomendado hacer antes o en paralelo al Sprint 1)_

### [ ] PH-010 · Eliminar dependencias muertas
- **Epic:** F (F1) · **Prioridad:** Media · **Puntos:** 2
- **Descripción:** Quitar `@geckos.io/client`, `@geckos.io/server`, `@google/genai`, `better-sqlite3`, `motion` de `package.json`.
- **Criterios de aceptación:**
  - [ ] `grep` confirma cero imports de esas libs en `src/` y `server.ts`.
  - [ ] `npm install` + `npm run build` en verde.
  - [ ] Bundle medido antes/después.
- **Archivos:** `package.json`, `package-lock.json`

### [ ] PH-011 · Limitar `dpr` del Canvas
- **Epic:** C (C2) · **Prioridad:** Alta · **Puntos:** 2
- **Descripción:** Añadir `dpr={[1, 1.5]}` al `<Canvas>`.
- **Criterios de aceptación:**
  - [ ] Canvas no renderiza a `devicePixelRatio` completo en móvil retina.
  - [ ] FPS móvil medido antes/después.
- **Archivos:** `src/App.tsx`

### [ ] PH-012 · Gating de Bloom/postprocessing en móvil
- **Epic:** C (C4) · **Prioridad:** Alta · **Puntos:** 2
- **Descripción:** Desactivar o reducir `EffectComposer`/`Bloom` en móvil (matchMedia/detección GPU).
- **Criterios de aceptación:**
  - [ ] En móvil el composer se desactiva o baja resolución/intensidad.
  - [ ] En desktop el efecto se mantiene.
- **Archivos:** `src/App.tsx`

### [ ] PH-013 · Restringir CORS y validar entradas de sala
- **Epic:** B (B7) · **Prioridad:** Media · **Puntos:** 2
- **Descripción:** CORS del socket al dominio del front; acotar `maxPlayers` a un rango; validar formato de `roomCode`.
- **Criterios de aceptación:**
  - [ ] `cors.origin` = dominio(s) del front (env), no `*`.
  - [ ] `maxPlayers` clampeado (p.ej. 2-10).
  - [ ] `roomCode` validado (longitud/charset).
- **Archivos:** `server.ts`

### [ ] PH-014 · Actualizar README y metadata
- **Epic:** F (F2) · **Prioridad:** Baja · **Puntos:** 2
- **Descripción:** Reemplazar boilerplate de AI Studio/Gemini por doc real del proyecto; corregir `metadata.json`.
- **Criterios de aceptación:**
  - [ ] `README.md` describe Pizza Hunter, stack, run local y deploy.
  - [ ] `metadata.json` sin capacidades Gemini falsas.
- **Archivos:** `README.md`, `metadata.json`

### [ ] PH-015 · Spike de hosting del servidor (decisión)
- **Epic:** B (B5) · **Prioridad:** Alta · **Puntos:** 5
- **Descripción:** Evaluar Railway/Render/Fly para el socket server persistente; PoC de despliegue y front en Vercel apuntando vía `VITE_BACKEND_URL`.
- **Criterios de aceptación:**
  - [ ] Documentada la opción elegida con coste y pasos.
  - [ ] PoC: servidor desplegado respondiendo `/api/health` y aceptando sockets.
  - [ ] Front en Vercel conecta al server remoto en una sala de prueba.
- **Archivos:** infra, `.env`, docs

---

## SPRINT 2 — Netcode y seguridad

### [ ] PH-020 · Deploy del socket server a host persistente
- **Epic:** B (B5) · **Prioridad:** Alta · **Puntos:** 5 · **Depende de:** PH-015
- **AC:** server en prod estable; front en Vercel conectado; variables de entorno gestionadas; healthcheck y logs.

### [ ] PH-021 · MP input-autoritativo
- **Epic:** B (B1) · **Prioridad:** Crítica · **Puntos:** 8 · **Depende de:** PH-003, PH-005, PH-006
- **AC:** el cliente envía solo `{left,right,boost,shoot,seq}`; el servidor simula a los humanos con `stepMovement`; `update_state` deja de aceptar posición/score.

### [ ] PH-022 · Predicción local + reconciliación
- **Epic:** B (B2) · **Prioridad:** Alta · **Puntos:** 8 · **Depende de:** PH-021
- **AC:** el cliente aplica sus inputs de inmediato y corrige contra el estado autoritativo por `seq`; sin "rubber-banding" perceptible en latencia normal.

### [ ] PH-023 · Autoridad de `collect_orb` y `shoot`
- **Epic:** B (B3) · **Prioridad:** Alta · **Puntos:** 5 · **Depende de:** PH-021
- **AC:** el server valida proximidad de cabeza al recoger; calcula origen/velocidad del proyectil desde `currentAngle`; aplica cooldown server-side.

### [ ] PH-024 · Muerte resuelta por el servidor
- **Epic:** B (B4) · **Prioridad:** Alta · **Puntos:** 5 · **Depende de:** PH-021
- **AC:** la muerte por colisión la determina el servidor; no depende del mensaje `state:'dead'` del cliente; sin jugadores "zombi".

### [ ] PH-025 · Reconexión con token + TTL de salas
- **Epic:** B (B6) · **Prioridad:** Media · **Puntos:** 5 · **Depende de:** PH-020
- **AC:** ventana de reconexión que preserva al jugador; salas huérfanas (solo bots) expiran; cliente maneja `disconnect`/`reconnect`.

### [ ] PH-026 · Anti-cheat: pruebas de intrusión
- **Epic:** B · **Prioridad:** Alta · **Puntos:** 5 · **Depende de:** PH-021..PH-024
- **AC:** batería de exploits (score/invencibilidad/teleport/collect remoto desde consola) queda rechazada; documentado como test de regresión.

---

## SPRINT 3 — Performance y móvil

### [ ] PH-030 · Fusionar geometría del ChefModel / LOD móvil
- **Epic:** C (C1) · **Prioridad:** Crítica · **Puntos:** 8
- **AC:** cabeza del chef a 1-3 meshes por color (mergeGeometries) o LOD; draw calls de cabezas de ~610 a ~15; sin regresión visual notable.

### [ ] PH-031 · Sombras optimizadas
- **Epic:** C (C3) · **Prioridad:** Alta · **Puntos:** 5
- **AC:** shadow map 1024²/512² móvil; `castShadow` solo en lo esencial; frustum de sombra acotado; FPS medido.

### [ ] PH-032 · Selectors Zustand y separación de estado UI/simulación
- **Epic:** C (C6) · **Prioridad:** Media · **Puntos:** 5
- **AC:** consumidores usan selectors granulares; el árbol 3D no depende de `gameState` reactivo; menos re-renders (medido con profiler).

### [ ] PH-033 · Pools de objetos (trail y obstáculos móviles)
- **Epic:** C (C7) · **Prioridad:** Media · **Puntos:** 2
- **AC:** trail y `getMovingObstacles` reutilizan buffers; sin `push`/`{...}` por frame en el hot path; menor GC.

### [ ] PH-034 · Code-splitting del cliente
- **Epic:** C (C5) · **Prioridad:** Media · **Puntos:** 5
- **AC:** `GameScene`/Canvas cargados con `lazy()`; `manualChunks` separa three/postprocessing; TTI del menú mejora (medido).

### [ ] PH-035 · Targets táctiles ≥44px
- **Epic:** E (E5) · **Prioridad:** Alta · **Puntos:** 2
- **AC:** swatches de color y botón copiar-código ≥44px de área táctil.

### [ ] PH-036 · Robustez de controles táctiles
- **Epic:** E (E6) · **Prioridad:** Alta · **Puntos:** 2
- **AC:** `onTouchCancel` resetea inputs; sin disparo "pegado"; dead-zone ~10-15% en joystick.

### [ ] PH-037 · Safe-area y orientación
- **Epic:** E (E8) · **Prioridad:** Media · **Puntos:** 2
- **AC:** `viewport-fit=cover` + `env(safe-area-inset-*)`; aviso de rotar en portrait.

---

## SPRINT 4 — Balance y retención

### [ ] PH-040 · Respawn automático del jugador
- **Epic:** D (D1) · **Prioridad:** Alta · **Puntos:** 5
- **AC:** el jugador reaparece como los bots con score reducido; no queda fuera de la ronda; sin reinicio forzado a 5.

### [ ] PH-041 · Hacer rentable el combate (body-shot)
- **Epic:** D (D2) · **Prioridad:** Alta · **Puntos:** 2
- **AC:** bajar `BODYSHOT_IFRAME_MS` y/o pizzas caen hacia el atacante; validado en playtest que atacar aporta score.

### [ ] PH-042 · Rebalance headshot / body-shot
- **Epic:** D (D3) · **Prioridad:** Alta · **Puntos:** 5
- **AC:** radios cabeza/cuerpo separados y ajustados; el instakill deja de ser trivial contra bots y viable con habilidad entre humanos.

### [ ] PH-043 · Ajuste de escudo
- **Epic:** D (D4) · **Prioridad:** Media · **Puntos:** 2
- **AC:** `SHIELD_EAT_BONUS` ajustado (~+3/+4) o decisión guardar-vs-comer reforzada; comer escudo deja de ser estrategia dominante.

### [ ] PH-044 · Ajuste de boost
- **Epic:** D (D5) · **Prioridad:** Media · **Puntos:** 2
- **AC:** coste/rastro de boost crea tensión risk/reward real (validado en playtest).

### [ ] PH-045 · Auto-colisión con la cola propia
- **Epic:** D (D9)/F2 · **Prioridad:** Media · **Puntos:** 2
- **AC:** decisión de diseño documentada; si se implementa, cabeza vs segmentos propios saltando ~4 de cuello, sin falsos positivos.

### [ ] PH-046 · IA de bots por niveles
- **Epic:** D (D6) · **Prioridad:** Media · **Puntos:** 5
- **AC:** predicción de intercepción al disparar, evasión de proyectiles, orbs ponderados por valor/riesgo; 2-3 dificultades.

### [ ] PH-047 · Beneficio de tamaño (dinámica líder-vs-resto)
- **Epic:** D (D7) · **Prioridad:** Media · **Puntos:** 5
- **AC:** cadencia/rango escala con score, equilibrado con mayor vulnerabilidad; crea tensión sin degenerar.

### [ ] PH-048 · Tracking de kills y metas persistentes
- **Epic:** D (D8) · **Prioridad:** Media · **Puntos:** 5
- **AC:** `LeaderboardEntry` con kills; metas simples persistentes (skins por hitos, contador de partidas).

---

## SPRINT 5 — UX, onboarding y accesibilidad

### [ ] PH-050 · Manejo de errores de red en UI
- **Epic:** E (E1) · **Prioridad:** Crítica · **Puntos:** 5
- **AC:** listeners `connect_error`/`disconnect`/sala-llena/código-inválido; banner/toast claro; sin estado "buscando…" infinito.

### [ ] PH-051 · Onboarding móvil + micro-tutorial
- **Epic:** E (E2)/D10 · **Prioridad:** Alta · **Puntos:** 2
- **AC:** controles visibles en móvil; tooltips contextuales de mecánicas (primer escudo, boost, disparo).

### [ ] PH-052 · Identificación no dependiente del color
- **Epic:** E (E3) · **Prioridad:** Alta · **Puntos:** 5
- **AC:** iniciales/íconos/patrón además del color en leaderboard/lobby/mundo; marcador claro del propio chef.

### [ ] PH-053 · Feedback de boost y disparo en el HUD
- **Epic:** E (E4) · **Prioridad:** Alta · **Puntos:** 5
- **AC:** barra de combustible de boost; estado de cooldown/munición del disparo; botón táctil refleja disponibilidad.

### [ ] PH-054 · Contraste WCAG AA en microcopy
- **Epic:** E (E7) · **Prioridad:** Media · **Puntos:** 2
- **AC:** textos secundarios cumplen 4.5:1; tamaños mínimos legibles.

### [ ] PH-055 · `prefers-reduced-motion`
- **Epic:** E (E9) · **Prioridad:** Media · **Puntos:** 2
- **AC:** variante atenuada de countdown/pulsos/bloom cuando el usuario lo pide.

### [ ] PH-056 · Accesibilidad de menús por teclado
- **Epic:** E (E10) · **Prioridad:** Media · **Puntos:** 5
- **AC:** foco visible, Enter para CTAs, orden de tabulación, `aria-label`s.

### [ ] PH-057 · Clarificar copy/microcopy
- **Epic:** E (E11) · **Prioridad:** Baja · **Puntos:** 2
- **AC:** CTAs y etiquetas revisados ("¡INICIAR ENTRADAS!", "COMENZAR YA CON BOTS", "Comer Escudo +8").

### [ ] PH-058 · Correcciones de muro y espaciado de cuerpo
- **Epic:** F (F3) · **Prioridad:** Baja · **Puntos:** 2
- **AC:** clamp a `±wallBoundary` con radio del jugador; cuerpo reindexado por longitud de arco (hitboxes/visual consistentes).

---

## Notas de proceso
- **Congelar cambios de balance durante el Sprint 1** para que el motor unificado nazca al día.
- Añadir CI que corra `tsc --noEmit` y `npm run build` en cada PR (el sandbox truncaba `types.ts`; validar en CI limpio).
- Revisar este tablero en la daily; actualizar el panel de avance al cerrar cada ticket.
