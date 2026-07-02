# Pizza Hunter — Backlog priorizado y plan de sprints

_Consolidado por el Scrum Master a partir de la auditoría de 5 enjambres especialistas
(Arquitectura/Netcode/Seguridad, Físicas/Colisiones, Game Design/Balance/IA,
UI-UX/Móvil/Accesibilidad, Performance/Rendering). Fecha: 2026-07-01._

## Veredicto ejecutivo

El juego es **jugable y con identidad visual fuerte**, pero descansa sobre tres
deudas estructurales que se refuerzan entre sí:

1. **Motor duplicado x3** (solo, servidor, jugador local) ya divergente, con un motor
   unificado (`simulation.ts`) escrito pero **sin conectar**. Es el nudo del que cuelga
   casi todo lo demás.
2. **Multiplayer cliente-autoritativo**: el servidor copia posición/score/invencibilidad
   del cliente sin validar → cheating trivial. Además el backend persistente **no corre
   en Vercel serverless**.
3. **Coste de render en móvil**: el `ChefModel` (~122 meshes por cabeza), sombras 2048²,
   `dpr` sin límite y Bloom sin gating hunden los FPS donde más se juega un .io.

En paralelo hay problemas de **balance** (atacar no compensa, no hay respawn del jugador,
sin snowball ni meta-juego) y de **UX/accesibilidad** (onboarding oculto en móvil,
identificación solo por color, sin manejo de errores de red).

### Qué se conserva (no tocar)
Instancing sólido (mesas, orbs, proyectiles, segmentos, trail → pocos draw calls),
render 3D desacoplado de React vía ref (`globalGameState.current`), distancias al
cuadrado en el hot path, generadores deterministas de mesas, caps defensivos de
entidades. El diseño de `simulation.ts` con `SimEnv` inyectable es correcto.

---

## Backlog consolidado

Leyenda — **Sev**: Crítica / Alta / Media / Baja · **Esf**: S(≈2 pts) / M(≈5) / L(≈8) ·
Fuente entre paréntesis (A=Arquitectura, F=Físicas, G=GameDesign, U=UX, P=Performance).

### EPIC A — Motor de simulación unificado (deuda técnica raíz)

| ID | Historia | Sev | Esf | Fuente |
|----|----------|-----|-----|--------|
| A1 | Conectar el modo solo (`gameStore.ts`) a `simulation.ts` y borrar el loop duplicado | Alta | L | A3,F5 |
| A2 | Conectar el servidor (`server.ts`) a `simulation.ts`; unificar `spawnOrb`, caps y probabilidades divergentes | Alta | L | A3,F5,F6 |
| A3 | Migrar el movimiento del jugador local a `stepMovement` (hoy en `GameScene`) | Alta | M | F3,F7 |
| A4 | Reemplazar los literales de colisión de los loops por las constantes de `constants.ts` | Media | S | F6 |
| A5 | Reloj de simulación sincronizado: enviar `serverTime` y alimentar `getMovingObstacles` con él (fin de "muertes fantasma") | Crítica | M | A6,F1 |
| A6 | Fixed timestep (acumulador) para el jugador local; hoy integra con `delta` variable de `useFrame` | Alta | M | F3 |

### EPIC B — Netcode, seguridad y despliegue

| ID | Historia | Sev | Esf | Fuente |
|----|----------|-----|-----|--------|
| B1 | MP input-autoritativo: cliente envía solo `{left,right,boost,shoot,seq}`, servidor simula con `stepMovement` | Crítica | L | A1,F7 |
| B2 | Predicción local + reconciliación en el cliente | Alta | L | A1,F7 |
| B3 | Validar `collect_orb` (proximidad de cabeza) y `shoot` (origen/velocidad server-side + cooldown) | Alta | M | A2 |
| B4 | Que el servidor resuelva la muerte por colisión (no depender del mensaje `state:'dead'` del cliente) | Alta | M | A9,F7 |
| B5 | Mover el socket server a host persistente (Railway/Render/Fly); front en Vercel con `VITE_BACKEND_URL` | Alta | M | A5 |
| B6 | Reconexión con token + TTL de salas huérfanas; manejo de `disconnect`/`reconnect` | Media | M | A8 |
| B7 | Validar `maxPlayers` (rango) y formato/colisión de `roomCode`; restringir CORS al dominio del front | Media | S | A11,A12 |

### EPIC C — Performance y rendimiento móvil

| ID | Historia | Sev | Esf | Fuente |
|----|----------|-----|-----|--------|
| C1 | Fusionar geometría del `ChefModel` (~122 → 1-3 meshes/color) o LOD móvil. ~610 → ~15 draw calls | Crítica | L | P1 |
| C2 | `dpr={[1,1.5]}` en el Canvas (una línea, gran impacto móvil) | Alta | S | P4 |
| C3 | Sombras a 1024²/512² y `castShadow` solo en lo esencial | Alta | M | P2 |
| C4 | Gating de Bloom/postprocessing en móvil (matchMedia/detección GPU) | Alta | S | P3 |
| C5 | Code-splitting: `lazy()` de `GameScene`/Canvas y `manualChunks` para three/postprocessing | Media | M | P9,A12 |
| C6 | Selectors Zustand granulares; separar estado UI (timer/leaderboard) del de simulación | Media | M | P5 |
| C7 | Pools de objetos para trail y `getMovingObstacles` (reducir presión de GC) | Media | S | P6,P7 |
| C8 | Spatial hashing/grid para colisiones si sube el nº de bots o `MAX_ORBS` (no urgente) | Baja | M | P12,F* |

### EPIC D — Balance, combate y retención

| ID | Historia | Sev | Esf | Fuente |
|----|----------|-----|-----|--------|
| D1 | Respawn automático del jugador (como bots) con score reducido; no expulsarlo de la ronda | Alta | M | G3 |
| D2 | Hacer el combate rentable: bajar `BODYSHOT_IFRAME_MS`, o pizzas caen hacia el atacante | Alta | S | G1 |
| D3 | Rebalancear headshot/body-shot (radio de cabeza, daño progresivo, separar radios) | Alta | M | G2 |
| D4 | Ajustar escudo (`SHIELD_EAT_BONUS` +8 → +3/+4) para forzar decisión guardar-vs-comer | Media | S | G4 |
| D5 | Subir coste de boost o `BOOST_TRAIL_CHANCE` para crear tensión risk/reward | Media | S | G5 |
| D6 | IA de bots por niveles: predicción de disparo, evasión de proyectiles, ponderar orbs por valor/riesgo | Media | M | G6,G8 |
| D7 | Beneficio al tamaño (cadencia/rango escala con score) para crear dinámica líder-vs-resto | Media | M | G7 |
| D8 | Tracking de kills en `LeaderboardEntry` + metas persistentes (skins por hitos, contador de partidas) | Media | M | G9 |
| D9 | Decidir e implementar auto-colisión con la cola propia (saltando ~4 segmentos de cuello) | Media | S | F2 |

### EPIC E — UX, móvil y accesibilidad

| ID | Historia | Sev | Esf | Fuente |
|----|----------|-----|-----|--------|
| E1 | Manejo de errores de red en UI: sala llena, código inválido, sin conexión, reintentando | Crítica | M | U1 |
| E2 | Onboarding visible en móvil + micro-tutorial contextual de mecánicas | Alta | S | U2,G10 |
| E3 | Identificación de jugadores no dependiente del color (iniciales/íconos/patrón) + marcador del propio chef | Alta | M | U3 |
| E4 | HUD: barra de combustible de boost y estado de cooldown/munición de disparo | Alta | M | U4 |
| E5 | Targets táctiles ≥44px (swatches de color, copiar código) | Alta | S | U5 |
| E6 | `onTouchCancel` en controles virtuales para evitar disparo "pegado"; dead-zone en joystick | Alta | S | U6,U12 |
| E7 | Contraste WCAG AA en microcopy (`text-white/40-50`, tamaños 9-10px) | Media | S | U7 |
| E8 | `viewport-fit=cover` + `env(safe-area-inset-*)`; aviso de orientación en portrait | Media | S | U9 |
| E9 | `prefers-reduced-motion`: variante atenuada de countdown/pulsos/bloom | Media | S | U10 |
| E10 | Accesibilidad de menús por teclado (foco visible, Enter, `aria-label`) | Media | M | U11 |
| E11 | Clarificar copy ("¡INICIAR ENTRADAS!", "COMENZAR YA CON BOTS", "Comer Escudo +8") | Baja | S | U8 |

### EPIC F — Higiene y limpieza

| ID | Historia | Sev | Esf | Fuente |
|----|----------|-----|-----|--------|
| F1 | Eliminar deps muertas: `@geckos.io/*`, `@google/genai`, `better-sqlite3`, `motion` | Media | S | A7,P8 |
| F2 | Actualizar `README.md` y `metadata.json` (quitar boilerplate de AI Studio/Gemini) | Baja | S | A7 |
| F3 | Clamp de muro a `±wallBoundary` y considerar el radio del jugador; reindexar cuerpo por longitud de arco | Baja | S | F8,F9,F10 |

---

## Plan de sprints (mejora continua, 2 semanas/sprint)

Principio rector: **no mezclar refactor con cambios de balance**. Primero una sola
fuente de verdad, luego seguridad, luego rendimiento, y el balance/contenido encima de
una base estable.

### Sprint 0 — Estabilización y quick wins _(3-4 días)_
**Meta:** bajar riesgo y coste sin tocar arquitectura.
F1, F2, C2, C4, B7 (CORS), y **decisión de hosting** (B5 spike).
_DoD:_ bundle sin deps muertas, `dpr` limitado, Bloom gated, CORS restringido, decidido dónde vive el server.
_Métrica:_ FPS móvil y tamaño de bundle antes/después.

### Sprint 1 — Motor unificado _(EPIC A)_
**Meta:** una sola implementación de las reglas.
A1 → A2 → A4 → A5 → A3/A6.
_DoD:_ solo y servidor delegan en `simulation.ts`; comportamiento idéntico al actual verificado en partida; obstáculos móviles sincronizados.
_Métrica:_ 0 divergencias de balance entre modos; paridad de comportamiento en pruebas.

### Sprint 2 — Netcode y seguridad _(EPIC B)_
**Meta:** MP fiable y no trampeable, corriendo en prod.
B5 (deploy) → B1 → B2 → B3 → B4 → B6.
_DoD:_ los exploits actuales (score/invencibilidad por consola) quedan bloqueados; MP estable entre 2+ clientes reales con reconexión.
_Métrica:_ intentos de cheat rechazados; tasa de desconexión/reconexión.
_Depende de:_ Sprint 1.

### Sprint 3 — Performance y móvil _(EPIC C + E táctil)_
**Meta:** 60 FPS objetivo en gama media.
C1 → C3 → C6 → C7 → C5; E5, E6, E8.
_DoD:_ draw calls y frame time medidos y dentro de presupuesto en móvil; controles táctiles sin bugs.
_Métrica:_ FPS p50/p95 en dispositivo de referencia; draw calls por frame.

### Sprint 4 — Balance y retención _(EPIC D)_
**Meta:** que atacar y volver a jugar merezcan la pena.
D1 → D2 → D3 → D4 → D5 → D9; luego D6, D7, D8.
_DoD:_ combate como fuente viable de score; respawn del jugador; tuning validado en playtest.
_Métrica:_ % de score vía combate vs farmeo; duración media de sesión; retorno tras récord.

### Sprint 5 — UX, onboarding y accesibilidad _(EPIC E resto)_
**Meta:** que un jugador nuevo entienda y juegue sin fricción, y sea accesible.
E1 → E2 → E3 → E4; E7, E9, E10, E11; F3.
_DoD:_ onboarding móvil, feedback de HUD completo, identificación no-color, auditoría WCAG AA básica pasada.
_Métrica:_ tasa de finalización de la primera partida; checklist de accesibilidad.

---

## Dependencias clave

- **A5/A6** (reloj y timestep) son requisito para **B1/B2** (reconciliación necesita determinismo).
- **B5** (hosting) desbloquea todo el MP real; hacer el spike en Sprint 0.
- **EPIC A** es prerrequisito de casi todo lo demás: es el primer sprint por diseño.
- **EPIC D** (balance) se hace al final a propósito, sobre motor estable.

## Riesgos

- Tocar balance en los loops viejos mientras se migra → el motor nuevo nace obsoleto. Congelar cambios de balance durante Sprint 1.
- Nota de entorno: el montaje de terminal truncaba `types.ts` en la auditoría; es artefacto del sandbox, el archivo real es correcto. Verificar builds en CI limpio.
