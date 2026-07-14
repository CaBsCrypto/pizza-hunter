/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { GameState, Player, Orb, INITIAL_LENGTH, getTables } from '../shared/types';
import * as Sim from '../shared/simulation';
import * as C from '../shared/constants';

/** Entorno del motor compartido para el modo solo: reloj/RNG/UUID del navegador. */
const soloEnv: Sim.SimEnv = {
  now: () => Date.now(),
  random: () => Math.random(),
  uuid: () => Math.random().toString(36).substring(2, 11),
  emitShootEffect: (playerId, x, y) => {
    window.dispatchEvent(new CustomEvent('local_shoot_effect', { detail: { playerId, x, y } }));
  },
};

/** Layout de mesas es determinista y estático: se calcula una sola vez. */
const soloTables = getTables();

interface LobbyInfo {
  roomId: string;
  roomCode: string | null;
  maxPlayers: number;
  playersCount: number;
  players: { id: string; name: string; color: string }[];
  hostId: string;
  status: 'waiting' | 'playing';
}

interface GameStore {
  socket: Socket | null;
  gameState: GameState | null;
  playerId: string | null;
  isSolo: boolean;
  roomSize: number;
  roomCode: string;
  isPrivate: boolean;
  lobbyInfo: LobbyInfo | null;
  connect: () => void;
  setSoloMode: (solo: boolean) => void;
  setRoomConfig: (size: number, isPrivate: boolean, code: string) => void;
  joinGame: (playerName?: string, playerColor?: string) => void;
  startGameNow: () => void;
  sendPlayerState: (data: any) => void;
  sendCollectOrb: (orbId: string) => void;
  sendShoot: (data: { x: number; y: number; vx: number; vy: number }) => void;
  quitGame: () => void;
}

export const globalGameState: { current: GameState | null } = { current: null };
let lastUiUpdate = 0;
let soloIntervalId: any = null;

export const useGameStore = create<GameStore>((set, get) => {
  // Setup local game tick for Solo Mode
  const startSoloGameLoop = () => {
    if (soloIntervalId) clearInterval(soloIntervalId);

    const tablesList = soloTables;
    const tickRate = 60; // 60 updates per second
    const delta = 1 / tickRate;

    soloIntervalId = setInterval(() => {
      const gs = globalGameState.current;
      if (!gs) return;

      // Decrement timer
      if (gs.timeLeft === undefined) {
        gs.timeLeft = C.ROUND_DURATION_S;
      }
      if (!gs.isRoundOver) {
        gs.timeLeft -= delta;
        if (gs.timeLeft <= 0) {
          gs.timeLeft = 0;
          gs.isRoundOver = true;
        }
      }

      if (gs.isRoundOver) {
        // Round over: leaderboard incluye a todos (no solo vivos)
        gs.leaderboard = Sim.buildLeaderboard(gs.players, true, 6);

        globalGameState.current = gs;
        const now = Date.now();
        if (now - lastUiUpdate > 100) {
          set({ gameState: { ...gs } });
          lastUiUpdate = now;
        }
        return;
      }

      // 0. Proyectiles: avance + colisiones (mesas, jugadores, bots)
      Sim.stepProjectiles(gs, soloEnv, tablesList, delta);

      // 1. Bots: IA (rumbo/disparo) + movimiento + respawn, vía motor compartido
      for (const botId in gs.players) {
        if (botId === 'local-player') continue;
        Sim.stepBot(gs.players[botId], gs, soloEnv, tablesList, delta);
      }

      // 2. Spawn aleatorio de pizzas si hace falta densidad
      if (Object.keys(gs.orbs).length < C.ORB_SOFT_CAP) {
        Sim.maybeSpawnRandomOrb(gs, soloEnv, tablesList);
      }

      // 3. Leaderboard (solo vivos durante la ronda)
      gs.leaderboard = Sim.buildLeaderboard(gs.players, false, 6);

      // 4. Update state / React UI throttling
      globalGameState.current = gs;
      const now = Date.now();
      if (now - lastUiUpdate > 100) {
        set({ gameState: { ...gs } });
        lastUiUpdate = now;
      }
    }, 1000 / tickRate);
  };

  return {
    socket: null,
    gameState: null,
    playerId: null,
    isSolo: true,
    roomSize: 4,
    roomCode: '',
    isPrivate: false,
    lobbyInfo: null,

    connect: () => {
      if (get().socket) return;
      const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
      const socket = io(backendUrl);

      socket.on('connect', () => {
        console.log('Connected to server');
      });

      socket.on('init', (id: string) => {
        set({ playerId: id });
      });

      socket.on('lobby_state', (lobby: LobbyInfo) => {
        set({ lobbyInfo: lobby });
      });

      socket.on('state', (state: GameState) => {
        globalGameState.current = state;
        const now = Date.now();
        if (now - lastUiUpdate > 100) {
          set({ gameState: state });
          lastUiUpdate = now;
        }
      });

      set({ socket });
    },

    setSoloMode: (solo: boolean) => {
      set({ isSolo: solo });
    },

    setRoomConfig: (size: number, isPrivate: boolean, code: string) => {
      set({
        roomSize: size,
        isPrivate: isPrivate,
        roomCode: code.toUpperCase().trim()
      });
    },

    joinGame: (playerName?: string, playerColor?: string) => {
      const { isSolo, socket, roomSize, isPrivate, roomCode } = get();

      if (isSolo) {
        // --- SOLO GAME INITIALIZATION ---
        const tablesList = soloTables;

        // Spawn local player near the center (100% libre de mesas/obstáculos móviles)
        const startX = (Math.random() - 0.5) * 6;
        const startY = (Math.random() - 0.5) * 6;
        const angle = Math.random() * Math.PI * 2;

        const localPlayer: Player = {
          id: 'local-player',
          name: playerName ? `${playerName} (Tú)` : 'Chef (Tú)',
          color: playerColor || '#ffa502',
          segments: Sim.buildSegments(startX, startY, angle),
          score: INITIAL_LENGTH,
          isBoosting: false,
          state: 'alive',
          currentAngle: angle,
          inputs: { left: false, right: false, boost: false },
          invincibleUntil: Date.now() + C.SPAWN_PROTECTION_MS,
        };

        const players: Record<string, Player> = {
          'local-player': localPlayer,
        };

        // Spawn 4 bots vía el motor compartido (misma lógica que usan servidor/loop)
        for (let i = 0; i < 4; i++) {
          const botId = `bot-${i}`;
          players[botId] = Sim.createBot(
            botId,
            C.BOT_NAMES[i % C.BOT_NAMES.length],
            C.PLAYER_COLORS[(i + 1) % C.PLAYER_COLORS.length],
            soloEnv,
            tablesList,
          );
        }

        // Spawn inicial de pizzas (con algunos escudos)
        const orbs: Record<string, Orb> = {};
        for (let i = 0; i < 140; i++) {
          Sim.spawnOrb(orbs, soloEnv, tablesList, {
            isShield: Math.random() < 0.05,
            force: true,
          });
        }

        const initialSoloState: GameState = {
          players,
          orbs,
          leaderboard: [],
          timeLeft: C.ROUND_DURATION_S,
          isRoundOver: false,
        };

        globalGameState.current = initialSoloState;
        set({
          playerId: 'local-player',
          gameState: initialSoloState,
          lobbyInfo: null
        });

        // Start Solo Game loops
        startSoloGameLoop();

      } else {
        // --- MULTIPLAYER ROOMS MATCHMAKING ---
        if (!socket) return;
        
        socket.emit('join', {
          playerName: playerName || 'Chef',
          maxPlayers: roomSize,
          isPrivate: isPrivate,
          roomCode: isPrivate ? roomCode : null,
          playerColor: playerColor || '#ffa502'
        });
      }
    },

    startGameNow: () => {
      const { socket } = get();
      if (socket) {
        socket.emit('start_game_with_bots');
      }
    },

    sendPlayerState: (data) => {
      const { isSolo, socket } = get();
      if (isSolo) {
        const gs = globalGameState.current;
        if (gs && gs.players['local-player']) {
          const local = gs.players['local-player'];
          local.segments = data.segments;
          local.score = data.score;
          local.currentAngle = data.currentAngle;
          local.isBoosting = data.isBoosting;
          
          if (data.state === 'dead') {
            local.state = 'dead';
            local.isBoosting = false;
            Sim.spillOrbsOnDeath(local, gs.orbs, soloEnv, soloTables);
          }
          globalGameState.current = gs;
        }
      } else if (socket) {
        socket.emit('update_state', data);
      }
    },

    sendCollectOrb: (orbId) => {
      const { isSolo, socket } = get();
      if (isSolo) {
        const gs = globalGameState.current;
        if (gs && gs.orbs[orbId]) {
          delete gs.orbs[orbId];
          globalGameState.current = gs;
        }
      } else if (socket) {
        socket.emit('collect_orb', orbId);
      }
    },

    sendShoot: (data) => {
      const { isSolo, socket } = get();
      if (isSolo) {
        const gs = globalGameState.current;
        if (gs) {
          if (!gs.projectiles) gs.projectiles = {};
          const localPlayer = gs.players['local-player'];
          if (localPlayer && localPlayer.state === 'alive') {
            const id = `proj-local-${uuidv4()}`;
            gs.projectiles[id] = {
              id,
              ownerId: 'local-player',
              x: data.x,
              y: data.y,
              vx: data.vx,
              vy: data.vy,
              color: localPlayer.color,
              radius: C.PROJECTILE_RADIUS,
              life: C.PROJECTILE_LIFE_S,
            };
            globalGameState.current = gs;
          }
        }
      } else if (socket) {
        socket.emit('shoot', data);
      }
    },

    quitGame: () => {
      if (soloIntervalId) {
        clearInterval(soloIntervalId);
        soloIntervalId = null;
      }
      
      const { socket } = get();
      if (socket) {
        socket.emit('quit_game');
      }

      globalGameState.current = null;
      set({
        gameState: null,
        playerId: null,
        lobbyInfo: null
      });
    }
  };
});
