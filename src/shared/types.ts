/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export type Projectile = {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  life: number;
};

export type GameState = {
  players: Record<string, Player>;
  orbs: Record<string, Orb>;
  projectiles?: Record<string, Projectile>;
  leaderboard: LeaderboardEntry[];
  timeLeft?: number;
  isRoundOver?: boolean;
};

export type PlayerState = 'alive' | 'dead' | 'spectating';

export type Player = {
  id: string;
  name: string;
  color: string;
  segments: { x: number; y: number }[];
  score: number;
  isBoosting: boolean;
  state: PlayerState;
  currentAngle: number;
  inputs: { left: boolean; right: boolean; boost: boolean };
  invincibleUntil?: number;
  hasShield?: boolean;
  lastShootTime?: number;
  /** Momento (Date.now) tras el cual un bot puede reaparecer. Uso interno de la simulación. */
  respawnTime?: number;
  /** Marca a los jugadores controlados por IA para el motor compartido. */
  isBot?: boolean;
};

export type Orb = {
  id: string;
  x: number;
  y: number;
  value: number;
  color: string;
  isShield?: boolean;
};

export type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  color: string;
};

export interface TableObstacleType {
  x: number;
  y: number;
  radius: number;
}

export interface MovingObstacleConfig {
  id: string;
  cx: number;
  cy: number;
  patrolRadius: number;
  speed: number;
  type: 'waiter' | 'roomba';
}

export interface MovingObstacleType {
  id: string;
  x: number;
  y: number;
  radius: number;
  type: 'waiter' | 'roomba';
  angle: number;
}

export const MOVING_OBSTACLES_CONFIGS: MovingObstacleConfig[] = [
  { id: 'waiter-1', cx: -32, cy: 32, patrolRadius: 10, speed: 0.9, type: 'waiter' },
  { id: 'waiter-2', cx: 32, cy: -32, patrolRadius: 12, speed: 0.8, type: 'waiter' },
  { id: 'waiter-3', cx: 20, cy: 20, patrolRadius: 8, speed: 1.1, type: 'waiter' },
  { id: 'roomba-1', cx: -30, cy: -30, patrolRadius: 14, speed: 1.4, type: 'roomba' },
  { id: 'roomba-2', cx: -15, cy: 35, patrolRadius: 9, speed: 1.2, type: 'roomba' },
  { id: 'roomba-3', cx: 35, cy: 15, patrolRadius: 11, speed: 1.0, type: 'roomba' },
];

export const WORLD_SIZE = 150;
export const BASE_SPEED = 12; // Slightly reduced for better maneuverability around tables
export const BOOST_SPEED = 22; // Slightly reduced for precise booster drifts
export const TICK_RATE = 60; // 60 updates per second
export const ORB_SPAWN_RATE = 0.1; // Orbs per tick
export const MAX_ORBS = 200; // Good density for pizzas
export const INITIAL_LENGTH = 5; // Start with a smaller trail of boxes
export const SEGMENT_SPACING = 0.8; // Pizza boxes spacing
export const TURN_SPEED = Math.PI * 1.35; // Tighter turning radius for table dodging

// Deterministic tables generator to keep server and client in perfect sync
export function getTables(): TableObstacleType[] {
  const tables: TableObstacleType[] = [];
  const spacing = 18;
  const radius = 2.4; // Collidable radius of the tables

  for (let x = -60; x <= 60; x += spacing) {
    for (let y = -60; y <= 60; y += spacing) {
      // Skip the very center area so players can spawn safely
      const distToCenter = Math.sqrt(x * x + y * y);
      if (distToCenter < 18) continue;

      // Deterministic offset based on coordinates to make layout interesting but synced
      const offsetX = Math.sin(x * 12.3 + y * 7.4) * 3.5;
      const offsetY = Math.cos(x * 7.4 + y * 12.3) * 3.5;

      tables.push({
        x: x + offsetX,
        y: y + offsetY,
        radius,
      });
    }
  }
  return tables;
}

// Generate moving obstacles (waiters and cleaning robots) based on synchronized epoch time
export function getMovingObstacles(timeSeconds: number): MovingObstacleType[] {
  const obstacles: MovingObstacleType[] = [];

  MOVING_OBSTACLES_CONFIGS.forEach((cfg) => {
    const angle = timeSeconds * cfg.speed;
    const x = cfg.cx + Math.cos(angle) * cfg.patrolRadius;
    const y = cfg.cy + Math.sin(angle) * cfg.patrolRadius;
    const radius = cfg.type === 'waiter' ? 1.4 : 1.0;

    obstacles.push({
      id: cfg.id,
      x,
      y,
      radius,
      type: cfg.type,
      angle: angle + Math.PI / 2, // Tangent orientation facing forward
    });
  });

  return obstacles;
}
