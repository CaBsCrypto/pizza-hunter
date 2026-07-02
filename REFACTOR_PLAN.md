# Plan de refactorización — Pizza Hunter (`slice-hunter`)

_Última actualización: 2026-07-01_

## Objetivo

Eliminar la duplicación del motor de juego, centralizar el balance, y convertir el
multiplayer en **input-autoritativo** para cerrar el agujero de cheating. Todo sin
romper el juego en solitario, que hoy funciona.

## Diagnóstico de partida

| Problema | Dónde | Impacto |
|---|---|---|
| Lógica de simulación duplicada casi 1:1 | `src/store/gameStore.ts` (loop solo) y `server.ts` (loop MP) | Cada cambio de balance se hace 2 veces; ya divergen |
| El servidor confía en la posición/score que manda el cliente | `server.ts` `update_state` | Cheating trivial: score infinito, invencibilidad, teleport |
| Números mágicos de colisión dispersos | ambos loops + `GameScene.tsx` | Imposible ajustar balance con confianza |
| Obstáculos móviles por `Date.now()` local | `getMovingObstacles()` | Desync cliente/servidor → "muertes fantasma" en MP |
| Deps sin usar: `@geckos.io/*`, `@google/genai`, `better-sqlite3` | `package.json` | Peso muerto, superficie de confusión |
| Servidor persistente sobre Vercel serverless | despliegue | El MP probablemente no corre en prod |

## Principio rector

**Una sola fuente de verdad para las reglas del juego.** El movimiento, las
colisiones, la IA y el spawn viven en `src/shared/`. `server.ts` y el modo solo
solo aportan el *entorno* (red, efectos, RNG) vía callbacks.

---

## Fases

### Fase 0 — Andamiaje compartido _(este primer paso)_
- `src/shared/constants.ts`: todos los tunables (radios², cooldowns, timers, balance).
- `src/shared/simulation.ts`: motor puro y agnóstico del entorno:
  - helpers de colisión (`hitsTable`, `hitsMovingObstacle`, `hitsAnySegment`),
  - `stepProjectiles`, `stepBotAI`, `stepEntityMovement`,
  - `collectOrbs`, `spillOrbsOnDeath`, `findSafeSpawn`, `buildLeaderboard`.
- Efectos secundarios (emitir `shoot_effect`, sonidos, RNG) inyectados por callback,
  para que el mismo código valga en cliente y servidor.
- Añadir campos opcionales `respawnTime?`, `isBot?` al tipo `Player` (aditivo, seguro).

> Entrega de este paso: los módulos nuevos compilan con `tsc --noEmit`. Todavía
> **no** se conectan a los consumidores (eso es Fase 1) para mantener el cambio
> revisable y sin riesgo.

### Fase 1 — Conectar el modo solo
- Reescribir el loop de `gameStore.ts` para delegar en `simulation.ts`.
- Verificación: jugar solo, comprobar que bots, colisiones, escudos, disparo,
  timer y leaderboard se comportan igual que antes.
- Riesgo: bajo (solo cliente). Es el mejor banco de pruebas del motor.

### Fase 2 — Conectar el servidor
- Reescribir el tick de `server.ts` para delegar en el mismo `simulation.ts`.
- Bots, proyectiles y orbs pasan a ser 100% el motor compartido.
- Verificación: 2 pestañas en una sala, confirmar sincronía de bots/obstáculos.
- Riesgo: medio. Aquí se elimina la divergencia de reglas.

### Fase 3 — MP input-autoritativo (anti-cheat)
- El cliente deja de enviar `segments/score`; envía solo `inputs {left,right,boost}`
  + `seq` (número de secuencia) y `shoot`.
- El servidor simula el movimiento de **todos** los jugadores desde sus inputs con
  `stepEntityMovement` (el mismo que usan los bots).
- El cliente hace **predicción local + reconciliación**: aplica sus inputs de
  inmediato y corrige cuando llega el estado autoritativo.
- Obstáculos móviles: el servidor manda una `serverTime` en cada `state`; el cliente
  interpola con ese reloj, no con `Date.now()` local.
- Verificación: intentar los exploits actuales (forzar score/invencibilidad desde
  consola) y confirmar que el servidor los ignora.
- Riesgo: alto. Es la parte de red; se hace al final y con las fases previas ya sólidas.

### Fase 4 — Limpieza y despliegue
- Quitar `@geckos.io/*`, `@google/genai` (o justificar su uso).
- Code-splitting de three.js para bajar el bundle (hoy ~1.4 MB).
- Mover el socket server a un host persistente (Railway/Render/Fly.io); front en Vercel.
- Actualizar `README.md` y `metadata.json` con el nombre real del proyecto.

### Fase 5 — Persistencia (better-sqlite3)
- Definir schema mínimo: tabla `players` (id, nombre, color) y `matches`/`scores`
  (partida, jugador, score final, orbes, timestamp) para leaderboard histórico.
- Conectar al final de cada partida en `server.ts` (cuando `status` pasa a `finished`).
- No usarla para estado en vivo (eso sigue en memoria); solo para historial/stats
  post-partida, para no meter I/O de disco en el loop de 60Hz.
- Verificación: jugar una partida, confirmar fila insertada y leaderboard histórico
  consultable.
- Riesgo: bajo, es aditivo y no toca el loop de juego.

### Fase 6 — Rigor de código (paralelo, puede empezar ya)
- `tsconfig.json`: activar `strict: true`, `noImplicitAny`, `noUnusedLocals`,
  `noUnusedParameters`. Arreglar los `any` señalados (`leaderboard: any[]` en
  `server.ts`, `data: any` en `gameStore.ts`) como parte de esta fase, no antes,
  para que Fase 0–2 no se bloqueen por ruido de tipos.
- Añadir ESLint (`@typescript-eslint`) + Prettier con config mínima; correr sobre
  todo el repo y arreglar solo lo que rompe el build, no todo el estilo de golpe.
- Tests: priorizar `src/shared/simulation.ts` (motor puro, fácil de testear sin
  DOM/red) con Vitest — colisiones, `stepProjectiles`, `collectOrbs`, spawn seguro.
  No testear `GameScene.tsx` (render) ni `server.ts` directamente todavía.
- Este trabajo puede intercalarse con Fase 1–2: cada archivo que se reescribe para
  delegar en `simulation.ts` debería salir ya tipado en strict y con tests del
  motor que toca.

---

## Orden recomendado

`Fase 0 → 1 → 2` da el 80 % del valor (una sola fuente de verdad, balance
centralizado, fin del desync de obstáculos) con riesgo bajo-medio. `Fase 3` es la
inversión grande y se apoya en que 0–2 estén cerradas. `Fase 4` puede intercalarse
en cualquier momento.

## Archivos afectados

- **Nuevos:** `src/shared/constants.ts`, `src/shared/simulation.ts`, `src/server/db.ts`
  (Fase 5), `.eslintrc`/`prettier.config.js` (Fase 6)
- **Modificados:** `src/shared/types.ts` (campos opcionales), `src/store/gameStore.ts`
  (Fase 1), `server.ts` (Fases 2–3–5), `src/components/GameScene.tsx` (Fase 3:
  predicción/reconciliación), `package.json` (Fase 4), `tsconfig.json` (Fase 6)

## Checklist

- [ ] Fase 0 — `constants.ts` + `simulation.ts` compilan
- [x] Fase 1 — solo delega en el motor y se comporta igual
- [x] Fase 2 — servidor delega en el motor; sincronía verificada
- [ ] Fase 3 — MP input-autoritativo; exploits bloqueados
- [ ] Fase 4 — deps limpias, bundle reducido, host persistente, docs al día
- [ ] Fase 5 — schema de persistencia + leaderboard histórico
- [ ] Fase 6 — strict mode, ESLint/Prettier, tests de `simulation.ts`

## Notas de riesgo

- **No cambiar balance y arquitectura a la vez.** El motor compartido debe
  reproducir el comportamiento actual exactamente antes de tocar tunables.
- **Determinismo:** para que predicción/reconciliación funcione, mismo `dt` fijo en
  cliente y servidor y RNG solo para spawns (no para física).
- **Regresión visual:** `GameScene.tsx` es solo render; no debe contener reglas.
