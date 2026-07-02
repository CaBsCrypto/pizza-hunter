/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tunables centralizados del juego. Única fuente de verdad para balance,
 * colisiones y tiempos. Antes estaban dispersos como números mágicos en
 * `server.ts`, `gameStore.ts` y `GameScene.tsx`.
 *
 * Convención: las constantes terminadas en `_SQ` son distancias AL CUADRADO,
 * pensadas para comparar contra `dx*dx + dy*dy` y evitar `Math.sqrt` por tick.
 * Las terminadas en `_PAD` son márgenes que se SUMAN a un radio antes de elevar
 * al cuadrado (p. ej. `(table.radius + PAD)²`).
 */

// ----- Ronda / temporización -----
export const ROUND_DURATION_S = 90;          // duración de la ronda
export const TICK_RATE = 60;                 // ticks por segundo (re-export lógico)
export const TICK_DELTA = 1 / TICK_RATE;     // dt fijo por tick

// ----- Protección / invencibilidad (ms) -----
export const SPAWN_PROTECTION_MS = 3500;     // i-frames al aparecer
export const RESPAWN_DELAY_MS = 3000;        // espera antes de reaparecer (bots)
export const SHIELD_IFRAME_PROJECTILE_MS = 1500; // i-frames tras romper escudo por disparo
export const SHIELD_IFRAME_CRASH_MS = 1800;  // i-frames tras romper escudo por choque
export const BODYSHOT_IFRAME_MS = 600;       // i-frames breves tras recibir body-shot

// ----- Combate: proyectiles -----
export const PROJECTILE_SPEED = 35;
export const PROJECTILE_LIFE_S = 1.5;
export const PROJECTILE_RADIUS = 0.8;
export const PROJECTILE_SPAWN_DIST = 1.8;    // distancia por delante de la cabeza al disparar
export const PLAYER_SHOOT_COOLDOWN_MS = 320; // cooldown de disparo del jugador
export const PROJECTILE_TABLE_PAD = 0.4;     // proyectil vs mesa
export const PROJECTILE_HEAD_HIT_SQ = 2.5;   // proyectil vs cabeza rival
export const PROJECTILE_BODY_HIT_SQ = 1.8;   // proyectil vs segmento de cuerpo

// ----- Combate: efecto del impacto -----
export const KILL_THRESHOLD_SCORE = 7;       // <= este score, un body-shot mata
export const BODYSHOT_LOSS_PCT = 0.25;       // % de pizzas perdidas por body-shot
export const BODYSHOT_MIN_LOSS = 2;          // mínimo de pizzas perdidas
export const SHIELD_EAT_BONUS = 8;           // pizzas ganadas al consumir un escudo

// ----- Colisiones de la serpiente -----
export const SNAKE_TABLE_PAD = 0.65;         // cabeza vs mesa
export const SNAKE_MOVING_OBSTACLE_PAD = 0.6;// cabeza vs mesero/roomba
export const SNAKE_SEGMENT_HIT_SQ = 2.25;    // cabeza vs segmento de otro jugador
export const WALL_MARGIN = 0.75;             // margen antes del muro

// ----- Orbs (pizzas) -----
export const ORB_COLLECT_SQ = 4.0;           // radio de recogida
export const ORB_SOFT_CAP = 130;             // por encima, baja el ritmo de spawn (solo)
export const ORB_SPAWN_CHANCE = 0.2;         // prob. de spawn por tick cuando hace falta
export const SHIELD_SPAWN_CHANCE = 0.06;     // prob. de que un orb sea escudo
export const ORB_SPAWN_TABLE_PAD = 2.0;      // no aparecer dentro de mesas
export const SHIELD_COLOR = '#00d2d3';

// ----- Boost -----
export const BOOST_COST_PER_S = 2;           // score consumido por segundo
export const BOOST_MIN_SCORE = 5;            // no se puede boostear por debajo
export const BOOST_TRAIL_CHANCE = 0.1;       // prob. de soltar rastro por tick

// ----- Spawn seguro -----
export const SPAWN_MAX_ATTEMPTS = 40;        // intentos de encontrar hueco sin mesa
export const SPAWN_TABLE_PAD = 3.0;          // separación mínima de mesas al aparecer

// ----- IA de bots -----
export const BOT_SHOOT_COOLDOWN_MS = 1800;
export const BOT_SHOOT_RANGE = 24;           // alcance máximo para decidir disparar
export const BOT_SHOOT_RANGE_SQ = BOT_SHOOT_RANGE * BOT_SHOOT_RANGE;
export const BOT_AIM_TOLERANCE_RAD = 0.45;   // ~±25° de tolerancia para apuntar
export const BOT_TURN_FACTOR = 0.75;         // fracción de TURN_SPEED al perseguir
export const BOT_TABLE_AVOID_PAD = 2.5;      // distancia a la que empieza a esquivar mesas
export const BOT_TABLE_AVOID_BLEND = 0.22;   // suavizado de la evasión de mesas
export const BOT_WALL_AVOID_MARGIN = 10;     // distancia al muro a la que reorienta
export const BOT_WALL_AVOID_BLEND = 0.15;    // suavizado de la evasión de muros
export const BOT_BOOST_TOGGLE_CHANCE = 0.01; // prob. por tick de alternar boost
export const BOT_BOOST_MIN_SCORE = 8;        // solo considera boostear por encima

// ----- Paletas -----
export const PLAYER_COLORS = [
  '#ff4757', // pepperoni red
  '#ffa502', // cheese gold
  '#2ed573', // basil green
  '#1e90ff', // pizza neon blue
  '#ff6b81', // sweet pink
  '#cd6133', // dusty clay
];

export const BOT_NAMES = [
  'Chef Luigi 🧑‍🍳',
  'Chef Mario 🍕',
  'Chef Beatrice 🍝',
  'Chef Giovanni 🍅',
  'Chef Sofia 🧀',
  'Chef Marco 🌶️',
];
