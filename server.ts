/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import {
  Player,
  Orb,
  Projectile,
  LeaderboardEntry,
  WORLD_SIZE,
  TICK_RATE,
  INITIAL_LENGTH,
  SEGMENT_SPACING,
  getTables,
} from './src/shared/types.ts';
import * as Sim from './src/shared/simulation.ts';
import * as C from './src/shared/constants.ts';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3008;

interface Room {
  id: string;
  code: string | null; // room code if private
  maxPlayers: number;
  players: Record<string, Player>;
  orbs: Record<string, Orb>;
  projectiles: Record<string, Projectile>;
  leaderboard: LeaderboardEntry[];
  status: 'waiting' | 'playing' | 'gameover';
  hostId: string;
  timeLeft?: number;
}

const rooms: Record<string, Room> = {};
const tablesList = getTables();

/** Entorno del motor compartido para el servidor: reloj/RNG/UUID de Node + emit de efectos. */
function makeServerEnv(roomId: string): Sim.SimEnv {
  return {
    now: () => Date.now(),
    random: () => Math.random(),
    uuid: () => uuidv4(),
    emitShootEffect: (playerId, x, y) => {
      io.to(roomId).emit('shoot_effect', { playerId, x, y });
    },
  };
}

function broadcastLobbyState(roomId: string) {
  const room = rooms[roomId];
  if (!room) return;
  
  const connectedPlayers = Object.values(room.players).filter(p => !p.id.startsWith('bot-'));
  const playersList = connectedPlayers.map(p => ({
    id: p.id,
    name: p.name,
    color: p.color
  }));

  io.to(roomId).emit('lobby_state', {
    roomId: room.id,
    roomCode: room.code,
    maxPlayers: room.maxPlayers,
    playersCount: connectedPlayers.length,
    players: playersList,
    hostId: room.hostId,
    status: room.status,
  });
}

function removePlayerFromRoom(socketId: string, roomId: string) {
  const room = rooms[roomId];
  if (!room) return;

  const player = room.players[socketId];
  if (player) {
    if (player.state === 'alive') {
      Sim.spillOrbsOnDeath(player, room.orbs, makeServerEnv(roomId), tablesList);
    }
    delete room.players[socketId];
  }

  const remainingRealPlayers = Object.keys(room.players).filter(id => !id.startsWith('bot-'));
  if (remainingRealPlayers.length === 0) {
    console.log(`Room ${roomId} is empty. Deleting.`);
    delete rooms[roomId];
  } else {
    if (room.hostId === socketId) {
      room.hostId = remainingRealPlayers[0];
    }
    if (room.status === 'waiting') {
      broadcastLobbyState(roomId);
    }
  }
}

function createRoom(maxPlayers: number, roomCode: string | null = null, hostId: string): Room {
  const roomId = `room-${uuidv4()}`;
  const newRoom: Room = {
    id: roomId,
    code: roomCode,
    maxPlayers: maxPlayers,
    players: {},
    orbs: {},
    projectiles: {},
    leaderboard: [],
    status: 'waiting',
    hostId: hostId,
  };

  // Spawn initial pizzas (with some shields)
  const env = makeServerEnv(roomId);
  for (let i = 0; i < 130; i++) {
    Sim.spawnOrb(newRoom.orbs, env, tablesList, { isShield: Math.random() < C.SHIELD_SPAWN_CHANCE, force: true });
  }

  rooms[roomId] = newRoom;
  console.log(`Created room ${roomId} (Code: ${roomCode}, Limit: ${maxPlayers})`);
  return newRoom;
}

let chefCounter = 1;

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (config: { playerName: string; maxPlayers: number; isPrivate: boolean; roomCode: string | null; playerColor?: string }) => {
    let maxPlayers = config.maxPlayers || 4;
    let roomCode = config.roomCode ? config.roomCode.trim().toUpperCase() : null;
    let selectedRoom: Room | null = null;

    // 1. Matching Room Logic
    if (roomCode) {
      // Join / Create Private Room
      for (const rid in rooms) {
        if (rooms[rid].code === roomCode) {
          selectedRoom = rooms[rid];
          break;
        }
      }
      if (!selectedRoom) {
        // Create private room with host
        selectedRoom = createRoom(maxPlayers, roomCode, socket.id);
      }
    } else {
      // Find suitable public room
      for (const rid in rooms) {
        const r = rooms[rid];
        const realCount = Object.keys(r.players).filter(pid => !pid.startsWith('bot-')).length;
        if (r.code === null && r.maxPlayers === maxPlayers && r.status === 'waiting' && realCount < maxPlayers) {
          selectedRoom = r;
          break;
        }
      }
      if (!selectedRoom) {
        selectedRoom = createRoom(maxPlayers, null, socket.id);
      }
    }

    if (!selectedRoom) return;

    const roomId = selectedRoom.id;
    socket.data.roomId = roomId;
    socket.join(roomId);

    // Create player representation
    const name = config.playerName ? `${config.playerName}` : `Chef-${chefCounter++}`;
    const color = config.playerColor || C.PLAYER_COLORS[Math.floor(Math.random() * C.PLAYER_COLORS.length)];
    // Spawn players near the center (safe zone free of obstacles) with spawn protection
    const startX = (Math.random() - 0.5) * 6;
    const startY = (Math.random() - 0.5) * 6;
    const angle = Math.random() * Math.PI * 2;

    selectedRoom.players[socket.id] = {
      id: socket.id,
      name,
      color,
      segments: Sim.buildSegments(startX, startY, angle),
      score: INITIAL_LENGTH,
      isBoosting: false,
      state: 'alive',
      currentAngle: angle,
      inputs: { left: false, right: false, boost: false },
      invincibleUntil: Date.now() + C.SPAWN_PROTECTION_MS,
    };

    socket.emit('init', socket.id);

    // Auto-start if public room becomes full of real players
    const realPlayers = Object.keys(selectedRoom.players).filter(id => !id.startsWith('bot-'));
    if (realPlayers.length >= selectedRoom.maxPlayers) {
      selectedRoom.status = 'playing';
      selectedRoom.timeLeft = 90; // 1:30 minutes round duration
    }

    if (selectedRoom.status === 'waiting') {
      broadcastLobbyState(roomId);
    } else {
      // Start match!
      io.to(roomId).emit('lobby_state', { status: 'playing' });
    }
  });

  socket.on('start_game_with_bots', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms[roomId];
    if (room && room.status === 'waiting') {
      const realPlayersCount = Object.keys(room.players).filter(id => !id.startsWith('bot-')).length;
      const botsToSpawn = room.maxPlayers - realPlayersCount;

      const env = makeServerEnv(roomId);
      for (let i = 0; i < botsToSpawn; i++) {
        const botId = `bot-${uuidv4()}`;
        room.players[botId] = Sim.createBot(
          botId,
          C.BOT_NAMES[i % C.BOT_NAMES.length],
          C.PLAYER_COLORS[(i + 2) % C.PLAYER_COLORS.length],
          env,
          tablesList,
        );
      }

      room.status = 'playing';
      room.timeLeft = C.ROUND_DURATION_S;
      io.to(roomId).emit('lobby_state', { status: 'playing' });
    }
  });

  socket.on('update_state', (data: { segments: any[], score: number, currentAngle: number, isBoosting: boolean, state: string, hasShield?: boolean, invincibleUntil?: number }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms[roomId];
    if (!room) return;

    const player = room.players[socket.id];
    if (player && player.state === 'alive') {
      player.segments = data.segments;
      player.score = data.score;
      player.currentAngle = data.currentAngle;
      player.isBoosting = data.isBoosting;
      player.hasShield = !!data.hasShield;
      if (data.invincibleUntil !== undefined) {
        player.invincibleUntil = data.invincibleUntil;
      }

      const env = makeServerEnv(roomId);

      // Drop pizza trail behind boosting players
      if (player.isBoosting && player.segments.length > 0 && Math.random() < C.BOOST_TRAIL_CHANCE) {
        const tail = player.segments[player.segments.length - 1];
        if (tail) {
          Sim.spawnOrb(room.orbs, env, tablesList, { x: tail.x, y: tail.y, color: player.color, force: true });
        }
      }

      if (data.state === 'dead') {
        player.state = 'dead';
        Sim.spillOrbsOnDeath(player, room.orbs, env, tablesList);
      }
    }
  });

  socket.on('collect_orb', (orbId: string) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms[roomId];
    if (room && room.orbs[orbId]) {
      delete room.orbs[orbId];
    }
  });

  socket.on('shoot', (data: { x: number; y: number; vx: number; vy: number }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms[roomId];
    if (!room) return;

    const player = room.players[socket.id];
    if (player && player.state === 'alive') {
      const projId = `proj-${socket.id}-${uuidv4()}`;
      room.projectiles[projId] = {
        id: projId,
        ownerId: socket.id,
        x: data.x,
        y: data.y,
        vx: data.vx,
        vy: data.vy,
        color: player.color,
        radius: C.PROJECTILE_RADIUS,
        life: C.PROJECTILE_LIFE_S,
      };
      io.to(roomId).emit('shoot_effect', { playerId: socket.id, x: data.x, y: data.y });
    }
  });

  socket.on('quit_game', () => {
    const roomId = socket.data.roomId;
    if (roomId) {
      removePlayerFromRoom(socket.id, roomId);
      socket.leave(roomId);
      socket.data.roomId = null;
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const roomId = socket.data.roomId;
    if (roomId) {
      removePlayerFromRoom(socket.id, roomId);
    }
  });
});

// Server update tick loop (handles broadcasting & server-side bots) — delega en el motor compartido.
const delta = 1 / TICK_RATE;
setInterval(() => {
  for (const roomId in rooms) {
    const room = rooms[roomId];
    if (room.status === 'playing') {
      if (room.timeLeft === undefined) {
        room.timeLeft = C.ROUND_DURATION_S;
      }
      room.timeLeft -= delta;
      if (room.timeLeft <= 0) {
        room.timeLeft = 0;
        room.status = 'gameover';
        broadcastLobbyState(room.id);
      }
    }

    if (room.status === 'playing') {
      const env = makeServerEnv(roomId);

      // 0. Proyectiles: avance + colisiones (mesas, jugadores, bots)
      Sim.stepProjectiles(room, env, tablesList, delta);

      // 1. Bots: IA (rumbo/disparo) + movimiento + respawn, vía motor compartido
      for (const pid in room.players) {
        if (!pid.startsWith('bot-')) continue;
        Sim.stepBot(room.players[pid], room, env, tablesList, delta);
      }

      // 2. Spawn aleatorio de pizzas si hace falta densidad
      Sim.maybeSpawnRandomOrb(room, env, tablesList);
    }

    // Leaderboard (gameover incluye a todos; en juego solo a los vivos)
    room.leaderboard = Sim.buildLeaderboard(room.players, room.status === 'gameover', 10);

    // Broadcast room game state to its sockets
    io.to(room.id).emit('state', {
      players: room.players,
      orbs: room.orbs,
      projectiles: room.projectiles,
      leaderboard: room.leaderboard,
      timeLeft: room.timeLeft !== undefined ? Math.max(0, Math.ceil(room.timeLeft)) : undefined,
      isRoundOver: room.status === 'gameover',
    });
  }
}, 1000 / TICK_RATE);

async function startServer() {
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
