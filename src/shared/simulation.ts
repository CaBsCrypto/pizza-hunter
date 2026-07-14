/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MOTOR DE SIMULACIÓN COMPARTIDO
 * ------------------------------
 * Reglas del juego (movimiento, colisiones, IA, proyectiles, orbs, leaderboard)
 * en un único lugar, sin acoplarse a la red ni al render. Tanto el modo solo
 * (`src/store/gameStore.ts`) como el servidor (`server.ts`) delegan aquí para
 * eliminar la duplicación 1:1 que había entre ambos.
 *
 * Los efectos de entorno (tiempo, RNG, generación de IDs, efectos de disparo)
 * se inyectan vía `SimEnv`, de modo que el mismo código corre igual en cliente
 * y servidor. Esto es la base para migrar el multiplayer a input-autoritativo
 * (Fase 3): el servidor podrá simular a los jugadores humanos con `stepMovement`,
 * el mismo que ya usan los bots.
 */

import {
  GameState,
  Player,
  Orb,
  Projectile,
  LeaderboardEntry,
  TableObstacleType,
  MovingObstacleType,
  WORLD_SIZE,
  BASE_SPEED,
  BOOST_SPEED,
  TURN_SPEED,
  INITIAL_LENGTH,
  SEGMENT_SPACING,
  MAX_ORBS,
  getMovingObstacles,
} from './types';
import * as C from './constants';

/** Entorno inyectable: aísla al motor de la red, el reloj y el RNG. */
export interface SimEnv {
  /** Reloj en ms (Date.now en ambos entornos). */
  now(): number;
  /** RNG en [0,1). */
  random(): number;
  /** Generador de IDs únicos. */
  uuid(): string;
  /** Efecto visual/sonoro de disparo. Solo=CustomEvent, servidor=io.emit. */
  emitShootEffect?(playerId: string, x: number, y: number): void;
}

// ---------------------------------------------------------------------------
// Helpers de colisión (todo con distancias al cuadrado; sin Math.sqrt por tick)
// ---------------------------------------------------------------------------

export function isInvincible(p: Player, now: number): boolean {
  return p.invincibleUntil ? now < p.invincibleUntil : false;
}

/** ¿El punto (x,y) colisiona con alguna mesa, dado un margen `pad`? */
export function hitsTable(
  x: number,
  y: number,
  pad: number,
  tables: TableObstacleType[],
): boolean {
  for (const t of tables) {
    const dx = x - t.x;
    const dy = y - t.y;
    const r = t.radius + pad;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

/** ¿El punto (x,y) colisiona con un obstáculo móvil en el instante dado? */
export function hitsMovingObstacle(
  x: number,
  y: number,
  pad: number,
  timeSeconds: number,
): boolean {
  const obstacles: MovingObstacleType[] = getMovingObstacles(timeSeconds);
  for (const m of obstacles) {
    const dx = x - m.x;
    const dy = y - m.y;
    const r = m.radius + pad;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

/**
 * ¿La cabeza (x,y) choca contra el cuerpo de otro jugador vivo (no invencible)?
 * Ignora a `selfId` para no chocar consigo mismo.
 */
export function hitsAnySegment(
  x: number,
  y: number,
  selfId: string,
  players: Record<string, Player>,
  now: number,
): boolean {
  for (const otherId in players) {
    if (otherId === selfId) continue;
    const other = players[otherId];
    if (other.state !== 'alive') continue;
    if (isInvincible(other, now)) continue;
    for (const seg of other.segments) {
      const dx = x - seg.x;
      const dy = y - seg.y;
      if (dx * dx + dy * dy < C.SNAKE_SEGMENT_HIT_SQ) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Orbs (pizzas)
// ---------------------------------------------------------------------------

export interface SpawnOrbOpts {
  x?: number;
  y?: number;
  value?: number;
  color?: string;
  isShield?: boolean;
  /** Ignora el tope de orbs (para botín/rastro). */
  force?: boolean;
  /** Tope de orbs; por defecto MAX_ORBS. */
  cap?: number;
}

/** Añade un orb al mapa, buscando un hueco libre de mesas si no se dan coords. */
export function spawnOrb(
  orbs: Record<string, Orb>,
  env: SimEnv,
  tables: TableObstacleType[],
  opts: SpawnOrbOpts = {},
): void {
  const cap = opts.cap ?? MAX_ORBS;
  if (!opts.force && Object.keys(orbs).length >= cap) return;

  let x = opts.x;
  let y = opts.y;
  if (x === undefined || y === undefined) {
    let placed = false;
    for (let i = 0; i < 15 && !placed; i++) {
      const tx = (env.random() - 0.5) * (WORLD_SIZE - 8);
      const ty = (env.random() - 0.5) * (WORLD_SIZE - 8);
      if (!hitsTable(tx, ty, C.ORB_SPAWN_TABLE_PAD, tables)) {
        x = tx;
        y = ty;
        placed = true;
      }
    }
    if (!placed) {
      x = (env.random() - 0.5) * (WORLD_SIZE - 8);
      y = (env.random() - 0.5) * (WORLD_SIZE - 8);
    }
  }

  const id = env.uuid();
  const isShield = !!opts.isShield;
  orbs[id] = {
    id,
    x: x!,
    y: y!,
    value: isShield ? 0 : opts.value ?? 1,
    color: isShield
      ? C.SHIELD_COLOR
      : opts.color ?? C.PLAYER_COLORS[Math.floor(env.random() * C.PLAYER_COLORS.length)],
    isShield,
  };
}

/** Derrama pizzas por el cuerpo al morir (una de cada dos cajas). */
export function spillOrbsOnDeath(
  entity: Player,
  orbs: Record<string, Orb>,
  env: SimEnv,
  tables: TableObstacleType[],
): void {
  entity.segments.forEach((seg, i) => {
    if (i % 2 === 0) {
      spawnOrb(orbs, env, tables, {
        x: seg.x + (env.random() - 0.5) * 2,
        y: seg.y + (env.random() - 0.5) * 2,
        value: 1,
        color: entity.color,
        force: true,
      });
    }
  });
}

/** Recoge orbs bajo la cabeza (x,y). Muta score/hasShield y borra los orbs. */
export function collectOrbs(
  entity: Player,
  x: number,
  y: number,
  orbs: Record<string, Orb>,
): void {
  for (const orbId in orbs) {
    const orb = orbs[orbId];
    const dx = x - orb.x;
    const dy = y - orb.y;
    if (dx * dx + dy * dy < C.ORB_COLLECT_SQ) {
      if (orb.isShield) entity.hasShield = true;
      else entity.score += orb.value;
      delete orbs[orbId];
    }
  }
}

/** Spawn aleatorio de pizzas por tick cuando la densidad lo permite. */
export function maybeSpawnRandomOrb(
  state: GameState,
  env: SimEnv,
  tables: TableObstacleType[],
): void {
  if (env.random() < C.ORB_SPAWN_CHANCE) {
    const isShield = env.random() < C.SHIELD_SPAWN_CHANCE;
    spawnOrb(state.orbs, env, tables, { isShield });
  }
}

// ---------------------------------------------------------------------------
// Spawns
// ---------------------------------------------------------------------------

/** Busca un punto de aparición sin mesas cerca. `span` acota el área usable. */
export function findSafeSpawn(
  env: SimEnv,
  tables: TableObstacleType[],
  span: number,
): { x: number; y: number } {
  for (let i = 0; i < C.SPAWN_MAX_ATTEMPTS; i++) {
    const tx = (env.random() - 0.5) * span;
    const ty = (env.random() - 0.5) * span;
    if (!hitsTable(tx, ty, C.SPAWN_TABLE_PAD, tables)) return { x: tx, y: ty };
  }
  return { x: (env.random() - 0.5) * 10, y: (env.random() - 0.5) * 10 };
}

/** Construye los segmentos iniciales de una serpiente en (x,y) con un ángulo. */
export function buildSegments(x: number, y: number, angle: number) {
  return Array.from({ length: INITIAL_LENGTH }, (_, i) => ({
    x: x - Math.cos(angle) * i * SEGMENT_SPACING,
    y: y - Math.sin(angle) * i * SEGMENT_SPACING,
  }));
}

/** Crea un bot listo para insertar en `players`. */
export function createBot(
  id: string,
  name: string,
  color: string,
  env: SimEnv,
  tables: TableObstacleType[],
  span: number = WORLD_SIZE - 30,
): Player {
  const { x, y } = findSafeSpawn(env, tables, span);
  const angle = env.random() * Math.PI * 2;
  return {
    id,
    name,
    color,
    segments: buildSegments(x, y, angle),
    score: INITIAL_LENGTH,
    isBoosting: false,
    state: 'alive',
    currentAngle: angle,
    inputs: { left: false, right: false, boost: false },
    isBot: true,
  };
}

/** Reaparece un bot muerto in situ (reutiliza el mismo objeto). */
export function respawnBot(
  bot: Player,
  env: SimEnv,
  tables: TableObstacleType[],
): void {
  const { x, y } = findSafeSpawn(env, tables, WORLD_SIZE - 24);
  const angle = env.random() * Math.PI * 2;
  bot.segments = buildSegments(x, y, angle);
  bot.score = INITIAL_LENGTH;
  bot.currentAngle = angle;
  bot.state = 'alive';
  bot.isBoosting = false;
}

// ---------------------------------------------------------------------------
// Proyectiles
// ---------------------------------------------------------------------------

/** Crea un proyectil disparado por `owner` en su dirección actual. */
export function fireProjectile(
  owner: Player,
  projectiles: Record<string, Projectile>,
  env: SimEnv,
): Projectile {
  const head = owner.segments[0];
  const a = owner.currentAngle;
  const x = head.x + Math.cos(a) * C.PROJECTILE_SPAWN_DIST;
  const y = head.y + Math.sin(a) * C.PROJECTILE_SPAWN_DIST;
  const proj: Projectile = {
    id: `proj-${owner.id}-${env.uuid()}`,
    ownerId: owner.id,
    x,
    y,
    vx: Math.cos(a) * C.PROJECTILE_SPEED,
    vy: Math.sin(a) * C.PROJECTILE_SPEED,
    color: owner.color,
    radius: C.PROJECTILE_RADIUS,
    life: C.PROJECTILE_LIFE_S,
  };
  projectiles[proj.id] = proj;
  env.emitShootEffect?.(owner.id, x, y);
  return proj;
}

/** Aplica el impacto de un proyectil sobre un jugador (headshot o body-shot). */
function applyProjectileHit(
  proj: Projectile,
  victim: Player,
  isHead: boolean,
  state: GameState,
  env: SimEnv,
  tables: TableObstacleType[],
): void {
  const now = env.now();
  if (victim.hasShield) {
    victim.hasShield = false;
    victim.invincibleUntil = now + C.SHIELD_IFRAME_PROJECTILE_MS;
    return;
  }

  const eliminate = () => {
    victim.state = 'dead';
    victim.isBoosting = false;
    if (victim.isBot) victim.respawnTime = now + C.RESPAWN_DELAY_MS;
    spillOrbsOnDeath(victim, state.orbs, env, tables);
  };

  if (isHead) {
    eliminate(); // headshot directo
    return;
  }

  // body-shot: muerte si tiene pocas pizzas, si no pierde un porcentaje
  if (victim.score <= C.KILL_THRESHOLD_SCORE) {
    eliminate();
    return;
  }
  const lost = Math.max(C.BODYSHOT_MIN_LOSS, Math.floor(victim.score * C.BODYSHOT_LOSS_PCT));
  victim.score -= lost;
  victim.invincibleUntil = now + C.BODYSHOT_IFRAME_MS;
  for (let k = 0; k < lost; k++) {
    const angle = env.random() * Math.PI * 2;
    const d = 1.2 + env.random() * 2;
    spawnOrb(state.orbs, env, tables, {
      x: proj.x + Math.cos(angle) * d,
      y: proj.y + Math.sin(angle) * d,
      value: 1,
      color: victim.color,
      force: true,
    });
  }
}

/** Avanza todos los proyectiles un tick y resuelve sus colisiones. */
export function stepProjectiles(
  state: GameState,
  env: SimEnv,
  tables: TableObstacleType[],
  dt: number,
): void {
  if (!state.projectiles) state.projectiles = {};
  const now = env.now();
  const boundary = WORLD_SIZE / 2;

  for (const projId in state.projectiles) {
    const proj = state.projectiles[projId];
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    proj.life -= dt;

    if (Math.abs(proj.x) > boundary || Math.abs(proj.y) > boundary) proj.life = 0;
    if (proj.life <= 0) {
      delete state.projectiles[projId];
      continue;
    }

    if (hitsTable(proj.x, proj.y, C.PROJECTILE_TABLE_PAD, tables)) {
      delete state.projectiles[projId];
      continue;
    }

    let consumed = false;
    for (const pid in state.players) {
      const victim = state.players[pid];
      if (victim.state !== 'alive' || pid === proj.ownerId) continue;
      if (isInvincible(victim, now)) continue;

      // 1. cabeza
      const head = victim.segments[0];
      if (head) {
        const dx = proj.x - head.x;
        const dy = proj.y - head.y;
        if (dx * dx + dy * dy < C.PROJECTILE_HEAD_HIT_SQ) {
          applyProjectileHit(proj, victim, true, state, env, tables);
          consumed = true;
          break;
        }
      }
      // 2. cuerpo
      for (let i = 1; i < victim.segments.length; i++) {
        const seg = victim.segments[i];
        const dx = proj.x - seg.x;
        const dy = proj.y - seg.y;
        if (dx * dx + dy * dy < C.PROJECTILE_BODY_HIT_SQ) {
          applyProjectileHit(proj, victim, false, state, env, tables);
          consumed = true;
          break;
        }
      }
      if (consumed) break;
    }

    if (consumed) delete state.projectiles[projId];
  }
}

// ---------------------------------------------------------------------------
// Movimiento (compartido por bots hoy y por jugadores humanos en Fase 3)
// ---------------------------------------------------------------------------

/** Recorta la cola para que la longitud coincida con el score. */
function trimToScore(entity: Player): void {
  const target = Math.floor(entity.score);
  while (entity.segments.length > target) entity.segments.pop();
}

/**
 * Avanza una serpiente un tick a partir de su `currentAngle` e `isBoosting`.
 * Resuelve muros, mesas, obstáculos móviles, otros cuerpos, boost, crecimiento
 * y recogida de pizzas. Devuelve `true` si murió en este tick.
 *
 * Sirve para los bots ya, y es la pieza que el servidor usará para simular a los
 * jugadores humanos desde sus inputs (input-autoritativo).
 */
export function stepMovement(
  entity: Player,
  state: GameState,
  env: SimEnv,
  tables: TableObstacleType[],
  dt: number,
): boolean {
  const now = env.now();
  const head = entity.segments[0];
  const speed = entity.isBoosting ? BOOST_SPEED : BASE_SPEED;

  const nextHead = {
    x: head.x + Math.cos(entity.currentAngle) * speed * dt,
    y: head.y + Math.sin(entity.currentAngle) * speed * dt,
  };

  const boundary = WORLD_SIZE / 2;
  const wallBoundary = boundary - C.WALL_MARGIN;
  const wallCollided =
    nextHead.x <= -wallBoundary ||
    nextHead.x >= wallBoundary ||
    nextHead.y <= -wallBoundary ||
    nextHead.y >= wallBoundary;

  nextHead.x = Math.max(-boundary, Math.min(boundary, nextHead.x));
  nextHead.y = Math.max(-boundary, Math.min(boundary, nextHead.y));

  let collided = false;
  if (!isInvincible(entity, now)) {
    if (wallCollided) {
      collided = true;
    } else if (hitsTable(nextHead.x, nextHead.y, C.SNAKE_TABLE_PAD, tables)) {
      collided = true;
    } else if (
      hitsMovingObstacle(nextHead.x, nextHead.y, C.SNAKE_MOVING_OBSTACLE_PAD, now / 1000)
    ) {
      collided = true;
    } else if (hitsAnySegment(nextHead.x, nextHead.y, entity.id, state.players, now)) {
      collided = true;
    }
  }

  if (collided) {
    if (entity.hasShield) {
      entity.hasShield = false;
      entity.invincibleUntil = now + C.SHIELD_IFRAME_CRASH_MS;
      return false;
    }
    entity.state = 'dead';
    entity.isBoosting = false;
    if (entity.isBot) entity.respawnTime = now + C.RESPAWN_DELAY_MS;
    spillOrbsOnDeath(entity, state.orbs, env, tables);
    return true;
  }

  // avanza
  entity.segments.unshift(nextHead);
  if (entity.isBoosting) {
    entity.score -= C.BOOST_COST_PER_S * dt;
    if (entity.score <= C.BOOST_MIN_SCORE) {
      entity.isBoosting = false;
      entity.score = C.BOOST_MIN_SCORE;
    }
    if (env.random() < C.BOOST_TRAIL_CHANCE) {
      const tail = entity.segments[entity.segments.length - 1];
      spawnOrb(state.orbs, env, tables, {
        x: tail.x,
        y: tail.y,
        value: 1,
        color: entity.color,
        force: true,
      });
    }
  }
  trimToScore(entity);
  collectOrbs(entity, nextHead.x, nextHead.y, state.orbs);
  return false;
}

// ---------------------------------------------------------------------------
// IA de bots
// ---------------------------------------------------------------------------

/** Normaliza un ángulo a (-π, π]. */
function wrapAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

/** Decide el rumbo del bot y, si procede, dispara. No mueve la cabeza. */
export function stepBotAI(
  bot: Player,
  state: GameState,
  env: SimEnv,
  tables: TableObstacleType[],
  dt: number,
): void {
  const now = env.now();
  const head = bot.segments[0];

  // 1. OBJETIVO: Pizza más cercana (Con preferencia de ítems valiosos para Wario y Mario)
  let nearest: Orb | null = null;
  let minDistSq = Infinity;
  for (const oid in state.orbs) {
    const orb = state.orbs[oid];
    const dx = orb.x - head.x;
    const dy = orb.y - head.y;
    const d = dx * dx + dy * dy;
    
    // El bot-0 (Mario/Velocista) y bot-2 (Wario/Defensivo) valoran más los escudos u orbes valiosos
    const isSpecial = orb.value > 1 || oid.startsWith('shield');
    const weight = ((bot.id === 'bot-0' || bot.id === 'bot-2') && isSpecial && d < 1200) ? 0.3 : 1.0;
    const weightedD = d * weight;
    
    if (weightedD < minDistSq) {
      minDistSq = weightedD;
      nearest = orb;
    }
  }

  // 2. DISPARO A RIVAL EN LÍNEA (El bot-1 Cacciatore dispara un 30% más rápido)
  if (!bot.lastShootTime) bot.lastShootTime = 0;
  const shootCooldown = bot.id === 'bot-1' ? (C.BOT_SHOOT_COOLDOWN_MS * 0.7) : C.BOT_SHOOT_COOLDOWN_MS;
  if (now - bot.lastShootTime > shootCooldown) {
    let target: Player | null = null;
    let bestSq = C.BOT_SHOOT_RANGE_SQ;
    for (const otherId in state.players) {
      if (otherId === bot.id) continue;
      const other = state.players[otherId];
      if (other.state !== 'alive') continue;
      const oh = other.segments[0];
      if (!oh) continue;
      const dx = oh.x - head.x;
      const dy = oh.y - head.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < bestSq) {
        const diff = wrapAngle(Math.atan2(dy, dx) - bot.currentAngle);
        if (Math.abs(diff) < C.BOT_AIM_TOLERANCE_RAD) {
          bestSq = distSq;
          target = other;
        }
      }
    }
    if (target) {
      bot.lastShootTime = now;
      fireProjectile(bot, state.projectiles ?? (state.projectiles = {}), env);
    }
  }

  // 3. SELECCIÓN DE RUMBO
  // El bot-1 (Luigi/Cacciatore) prioriza perseguir y embestir al rival más cercano si está a menos de 20 metros
  let huntTarget: Player | null = null;
  if (bot.id === 'bot-1') {
    let bestDistSq = 400; // 20 metros de rango de caza
    for (const otherId in state.players) {
      if (otherId === bot.id) continue;
      const other = state.players[otherId];
      if (other.state !== 'alive') continue;
      const oh = other.segments[0];
      if (!oh) continue;
      const dx = oh.x - head.x;
      const dy = oh.y - head.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        huntTarget = other;
      }
    }
  }

  if (huntTarget && bot.id === 'bot-1') {
    const targetHead = huntTarget.segments[0];
    const diff = wrapAngle(Math.atan2(targetHead.y - head.y, targetHead.x - head.x) - bot.currentAngle);
    const maxTurn = TURN_SPEED * dt * C.BOT_TURN_FACTOR * 1.2; // Gira un poco más rápido persiguiendo
    bot.currentAngle += Math.max(-maxTurn, Math.min(maxTurn, diff));
  } else if (nearest) {
    const diff = wrapAngle(Math.atan2(nearest.y - head.y, nearest.x - head.x) - bot.currentAngle);
    const maxTurn = TURN_SPEED * dt * C.BOT_TURN_FACTOR;
    bot.currentAngle += Math.max(-maxTurn, Math.min(maxTurn, diff));
  }

  // 4. EVASIÓN DE MESAS (El bot-2 Wario esquiva con mayor margen de anticipación)
  const avoidPad = bot.id === 'bot-2' ? (C.BOT_TABLE_AVOID_PAD + 1.2) : C.BOT_TABLE_AVOID_PAD;
  for (const t of tables) {
    const dx = head.x - t.x;
    const dy = head.y - t.y;
    const avoid = t.radius + avoidPad;
    if (dx * dx + dy * dy < avoid * avoid) {
      const diff = wrapAngle(Math.atan2(dy, dx) - bot.currentAngle);
      bot.currentAngle += diff * C.BOT_TABLE_AVOID_BLEND;
    }
  }

  // 5. EVASIÓN DE MUROS (El bot-2 Wario dobla antes cerca del borde del mapa)
  const avoidMargin = bot.id === 'bot-2' ? (C.BOT_WALL_AVOID_MARGIN + 2.5) : C.BOT_WALL_AVOID_MARGIN;
  const limit = WORLD_SIZE / 2 - avoidMargin;
  if (Math.abs(head.x) > limit || Math.abs(head.y) > limit) {
    const diff = wrapAngle(Math.atan2(-head.y, -head.x) - bot.currentAngle);
    bot.currentAngle += diff * C.BOT_WALL_AVOID_BLEND;
  }

  // 6. DECISIÓN DE BOOST (El bot-0 Mario/Velocista usa nitro mucho más a menudo)
  const boostChance = bot.id === 'bot-0' ? 0.15 : C.BOT_BOOST_TOGGLE_CHANCE;
  const minScore = bot.id === 'bot-0' ? 6 : C.BOT_BOOST_MIN_SCORE;
  if (bot.score > minScore && env.random() < boostChance) {
    bot.isBoosting = !bot.isBoosting;
  }
  if (bot.score <= C.BOOST_MIN_SCORE) bot.isBoosting = false;
}

/** Tick completo de un bot: respawn si toca, IA de rumbo/disparo y movimiento. */
export function stepBot(
  bot: Player,
  state: GameState,
  env: SimEnv,
  tables: TableObstacleType[],
  dt: number,
): void {
  if (bot.state === 'dead') {
    if (env.now() > (bot.respawnTime ?? 0)) respawnBot(bot, env, tables);
    return;
  }
  stepBotAI(bot, state, env, tables, dt);
  stepMovement(bot, state, env, tables, dt);
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

/** Top-N por score. Si `includeAll` es false, solo cuenta a los vivos. */
export function buildLeaderboard(
  players: Record<string, Player>,
  includeAll: boolean,
  limit = 10,
): LeaderboardEntry[] {
  return Object.values(players)
    .filter((p) => includeAll || p.state === 'alive')
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((p) => ({ id: p.id, name: p.name, score: Math.floor(p.score), color: p.color }));
}
