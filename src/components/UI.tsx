/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLink,
  Trophy,
  LogOut,
  Users,
  Bot,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Play,
  Crown,
  Zap,
  Shield,
  Award,
  Flame,
  ChevronDown,
  X
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { ChefModel } from './GameScene';

const DRIVER_COLORS = [
  { name: 'Ámbar', hex: '#ffa502', text: 'text-amber-400', bg: 'bg-[#ffa502]' },
  { name: 'Pepperoni', hex: '#ff4757', text: 'text-red-400', bg: 'bg-[#ff4757]' },
  { name: 'Basílico', hex: '#2ed573', text: 'text-emerald-400', bg: 'bg-[#2ed573]' },
  { name: 'Cian', hex: '#1e90ff', text: 'text-blue-400', bg: 'bg-[#1e90ff]' },
  { name: 'Berenjena', hex: '#9b59b6', text: 'text-purple-400', bg: 'bg-[#9b59b6]' },
  { name: 'Neón', hex: '#ff6b81', text: 'text-pink-400', bg: 'bg-[#ff6b81]' },
];

function RotatingChef({ color }: { color: string }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.95;
      groupRef.current.position.y = -0.8 + Math.sin(state.clock.getElapsedTime() * 2.2) * 0.035;
    }
  });

  return (
    <group ref={groupRef}>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={[1.0, 1.0, 1.0]}>
        <ChefModel color={color} />
      </group>
    </group>
  );
}

function ChefPreview3D({ color }: { color: string }) {
  return (
    <div className="w-full h-56 md:h-64 bg-radial from-neutral-800 to-neutral-950 rounded-2xl border border-white/10 relative overflow-hidden shadow-inner group">
      <div className="absolute inset-x-0 top-3 text-center pointer-events-none z-10">
        <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-amber-500 bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-500/20">
          VISTA PREVIA 3D
        </span>
      </div>
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-all duration-700" />

      <Canvas
        camera={{ position: [0, 1.2, 3.2], fov: 45 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={1.8} />
        <directionalLight position={[5, 10, 5]} intensity={2.5} castShadow />
        <pointLight position={[-5, 5, -5]} intensity={1.5} color="#ffa502" />
        <RotatingChef color={color} />
      </Canvas>
    </div>
  );
}

function VespaShowcase({ color }: { color: string }) {
  return (
    <div className="w-full h-[280px] md:h-[400px] relative overflow-hidden flex items-center justify-center pointer-events-auto">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
      <Canvas
        camera={{ position: [0, 1.0, 3.0], fov: 40 }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <ambientLight intensity={2.2} />
        <directionalLight position={[5, 10, 5]} intensity={3.5} />
        <pointLight position={[-5, 5, -5]} intensity={1.5} color="#ffa502" />
        <RotatingChef color={color} />
      </Canvas>
    </div>
  );
}
import { playCountdownTickSound, playRoundOverSound } from '../utils/audio';

export function UI() {
  const {
    gameState,
    playerId,
    isSolo,
    roomSize,
    roomCode,
    isPrivate,
    lobbyInfo,
    setSoloMode,
    setRoomConfig,
    joinGame,
    startGameNow,
    quitGame
  } = useGameStore();

  const player = playerId && gameState ? gameState.players[playerId] : null;
  const isAlive = player?.state === 'alive';
  const isDead = player?.state === 'dead';

  // State for config panel
  const [chefName, setChefName] = useState<string>(() => {
    return localStorage.getItem('pizza_hunter_chef_name') || `Chef ${Math.floor(Math.random() * 900 + 100)}`;
  });
  const [selectedSolo, setSelectedSolo] = useState<boolean>(true);
  const [selectedSize, setSelectedSize] = useState<number>(4);
  const [selectedPrivate, setSelectedPrivate] = useState<boolean>(false);
  const [inputCode, setInputCode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<string>(() => {
    return localStorage.getItem('pizza_hunter_color') || '#ffa502';
  });
  const [showStats, setShowStats] = useState<boolean>(false);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [showColorDropdown, setShowColorDropdown] = useState<boolean>(false);

  const [highestScore, setHighestScore] = useState<number>(() => {
    const saved = localStorage.getItem('pizza_hunter_highscore');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [gamepadConnected, setGamepadConnected] = useState(false);

  const currentScore = player ? Math.floor(player.score) : 0;

  useEffect(() => {
    if (currentScore > highestScore) {
      setHighestScore(currentScore);
      localStorage.setItem('pizza_hunter_highscore', currentScore.toString());
    }
  }, [currentScore, highestScore]);

  // Handle Gamepad connection events
  useEffect(() => {
    const handleConnect = () => setGamepadConnected(true);
    const handleDisconnect = () => {
      const gps = navigator.getGamepads ? navigator.getGamepads() : [];
      setGamepadConnected(gps.some(g => g !== null));
    };

    window.addEventListener('gamepadconnected', handleConnect);
    window.addEventListener('gamepaddisconnected', handleDisconnect);

    // Initial check
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    if (gps.some(g => g !== null)) {
      setGamepadConnected(true);
    }

    return () => {
      window.removeEventListener('gamepadconnected', handleConnect);
      window.removeEventListener('gamepaddisconnected', handleDisconnect);
    };
  }, []);

  const handleJoin = () => {
    // Save chef name
    const cleanName = chefName.trim().substring(0, 14) || 'Chef';
    localStorage.setItem('pizza_hunter_chef_name', cleanName);

    // Apply store config
    setSoloMode(selectedSolo);
    if (!selectedSolo) {
      setRoomConfig(selectedSize, selectedPrivate, inputCode);
    }

    // Join with selected color
    joinGame(cleanName, selectedColor);
  };

  // Determine if in a lobby waiting
  const isInLobby = lobbyInfo !== null && lobbyInfo.status === 'waiting';

  // Gamepad menu navigation polling loop
  useEffect(() => {
    let active = true;
    let lastA = false;
    let lastDPadLeft = false;
    let lastDPadRight = false;

    const poll = () => {
      if (!active) return;
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads.find(g => g !== null);
      
      if (gp) {
        // Press A (button 0) to select / play
        const pressedA = gp.buttons[0]?.pressed || false;
        if (pressedA && !lastA) {
          if (isDead || gameState?.isRoundOver) {
            handleJoin();
          } else if (!gameState && !isInLobby) {
            handleJoin();
          } else if (isInLobby && lobbyInfo && lobbyInfo.hostId === playerId) {
            startGameNow();
          }
        }
        lastA = pressedA;

        // D-Pad Left (button 14) / Right (button 15) or Left stick to toggle Solo/Multiplayer
        const dpadLeft = gp.buttons[14]?.pressed || (gp.axes && gp.axes[0] !== undefined && gp.axes[0] < -0.5) || false;
        const dpadRight = gp.buttons[15]?.pressed || (gp.axes && gp.axes[0] !== undefined && gp.axes[0] > 0.5) || false;

        if (dpadLeft && !lastDPadLeft) {
          setSelectedSolo(true);
        }
        if (dpadRight && !lastDPadRight) {
          setSelectedSolo(false);
        }

        lastDPadLeft = dpadLeft;
        lastDPadRight = dpadRight;
      }
      
      requestAnimationFrame(poll);
    };

    poll();
    return () => {
      active = false;
    };
  }, [playerId, isInLobby, isDead, gameState?.isRoundOver, lobbyInfo, handleJoin, startGameNow]);

  const [showTimeExpiredScreen, setShowTimeExpiredScreen] = useState(false);
  const lastPlayedSecond = useRef<number | null>(null);
  const wasRoundOver = useRef<boolean>(false);

  // Sound and transition logic for round timer expiry
  useEffect(() => {
    if (!playerId || !gameState || gameState.timeLeft === undefined) {
      lastPlayedSecond.current = null;
      wasRoundOver.current = false;
      setShowTimeExpiredScreen(false);
      return;
    }

    if (gameState.isRoundOver) {
      if (!wasRoundOver.current) {
        wasRoundOver.current = true;
        playRoundOverSound();
        setShowTimeExpiredScreen(true);
      }
      lastPlayedSecond.current = null;
      return;
    }

    // Reset roundover / state if we start playing again
    if (wasRoundOver.current) {
      wasRoundOver.current = false;
      setShowTimeExpiredScreen(false);
    }

    const currentSec = Math.ceil(gameState.timeLeft);
    if (currentSec <= 10 && currentSec > 0 && currentSec !== lastPlayedSecond.current) {
      lastPlayedSecond.current = currentSec;
      playCountdownTickSound(currentSec <= 5);
    }
  }, [gameState?.timeLeft, gameState?.isRoundOver, playerId]);

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const handleCopyCode = () => {
    if (lobbyInfo?.roomCode) {
      navigator.clipboard.writeText(lobbyInfo.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatTime = (seconds: number | undefined) => {
    if (seconds === undefined) return '--:--';
    const s = Math.max(0, Math.ceil(seconds));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const roundPlayers = gameState
    ? Object.values(gameState.players).sort((a, b) => b.score - a.score)
    : [];

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
      {/* Timer Countdown */}
      {playerId && gameState && gameState.timeLeft !== undefined && (
        <div className="absolute left-1/2 -translate-x-1/2 top-16 flex flex-col items-center z-20">
          <div className={`font-mono text-xl font-extrabold px-4 py-1.5 rounded-full border shadow-lg backdrop-blur-md flex items-center gap-2 ${
            gameState.timeLeft <= 15
              ? 'bg-red-950/85 text-red-400 border-red-500/50 animate-pulse ring-2 ring-red-500/30'
              : 'bg-black/60 text-amber-400 border-white/15'
          }`}>
            <span className="text-white/40 uppercase tracking-widest text-[9px] font-bold">Tiempo</span>
            <span className={gameState.timeLeft <= 10 ? 'text-red-500 scale-110 font-black transition-all' : ''}>
              {formatTime(gameState.timeLeft)}
            </span>
          </div>
        </div>
      )}

      {/* Massive Neon Countdown Overlay (Final 10 Seconds) */}
      <AnimatePresence>
        {playerId && gameState && !gameState.isRoundOver && gameState.timeLeft !== undefined && gameState.timeLeft <= 10 && gameState.timeLeft > 0 && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30 overflow-hidden">
            <motion.div
              key={Math.ceil(gameState.timeLeft)}
              initial={{ scale: 3.5, opacity: 0, y: -20 }}
              animate={{ 
                scale: [3.5, 1, 1.2], 
                opacity: [0, 1, 0],
                y: [0, 0, 15] 
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.95, ease: "easeOut" }}
              className="flex flex-col items-center select-none"
            >
              <span className={`font-sans text-[120px] md:text-[180px] font-black tracking-tighter leading-none filter drop-shadow-[0_0_25px_rgba(239,68,68,0.8)] ${
                Math.ceil(gameState.timeLeft) <= 5 ? 'text-red-500' : 'text-amber-500'
              }`}>
                {Math.ceil(gameState.timeLeft)}
              </span>
              <span className="text-white/80 font-mono uppercase tracking-[0.4em] text-xs font-black bg-black/50 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-sm -mt-2">
                {Math.ceil(gameState.timeLeft) <= 5 ? '⚡ ¡ACELERA! ⚡' : '⏱️ ¡TIEMPO LÍMITE! ⏱️'}
              </span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Time Expired Dramatic Banner Overlay */}
      <AnimatePresence>
        {showTimeExpiredScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-auto bg-black/90 backdrop-blur-lg flex flex-col items-center justify-center z-50 p-6"
          >
            <motion.div
              initial={{ scale: 0.4, rotate: -5 }}
              animate={{ scale: [0.4, 1.1, 1], rotate: 0 }}
              transition={{ duration: 0.5, ease: "backOut" }}
              className="text-center flex flex-col items-center gap-6"
            >
              <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-pulse">
                <span className="text-5xl">⏰</span>
              </div>
              
              <div className="flex flex-col gap-2">
                <h2 className="text-5xl md:text-7xl font-black text-red-500 tracking-tight uppercase" style={{ textShadow: '0 0 20px rgba(239,68,68,0.5)' }}>
                  ¡TIEMPO AGOTADO!
                </h2>
                <p className="text-white/60 font-mono text-sm tracking-widest uppercase">
                  La cocina ha cerrado sus puertas
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl max-w-sm w-full font-mono text-xs text-white/50">
                Calculando recompensas y propinas...
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="flex justify-between items-start pointer-events-auto relative">
        <div className="flex flex-col gap-1 z-10">
          <h1 className="text-3xl font-black text-amber-500 tracking-tighter" style={{ textShadow: '0 0 15px rgba(235,94,40,0.6)' }}>
            PIZZA HUNTER
          </h1>
          {isAlive && (
            <div className="text-lg font-mono text-white/95 font-bold bg-black/40 px-3 py-1 rounded-full border border-white/5 w-fit">
              🍕 Cajas Apiladas: <span className="text-yellow-400 font-extrabold">{currentScore}</span>
            </div>
          )}
        </div>
        
        {/* Controls Hint */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 flex flex-col items-center gap-1.5 opacity-90 hidden lg:flex">
          <div className="flex gap-2">
            <div className="flex items-center gap-2 text-xs font-mono text-white bg-black/45 px-3 py-1.5 rounded-full border border-white/10">
              <span className="font-bold bg-white/25 px-1.5 py-0.5 rounded text-white text-[11px]">A</span>
              <span className="font-bold bg-white/25 px-1.5 py-0.5 rounded text-white text-[11px]">D</span>
              <span className="text-white/70 uppercase tracking-wider text-[10px]">Girar</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-white bg-black/45 px-3 py-1.5 rounded-full border border-white/10">
              <span className="font-bold bg-white/25 px-1.5 py-0.5 rounded text-white text-[11px]">SPACE</span>
              <span className="text-white/70 uppercase tracking-wider text-[10px]">Sprint</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-white bg-black/45 px-3 py-1.5 rounded-full border border-white/10">
              <span className="font-bold bg-white/25 px-1.5 py-0.5 rounded text-white text-[11px]">CLICK / F</span>
              <span className="text-white/70 uppercase tracking-wider text-[10px]">Disparar 🍕</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-white bg-black/45 px-3 py-1.5 rounded-full border border-white/10">
              <span className="font-bold bg-white/25 px-1.5 py-0.5 rounded text-emerald-400 text-[11px]">Q</span>
              <span className="text-emerald-400 uppercase tracking-wider text-[10px] font-bold">Comer Escudo (+8)</span>
            </div>
          </div>
          {gamepadConnected ? (
            <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/20 px-3.5 py-1.5 rounded-full animate-pulse shadow-md shadow-emerald-500/5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>🎮 Xbox: Stick Izq (Girar) | A/LB (Sprint) | B/X/RT (Disparar) | Y/D-Pad (Comer Escudo)</span>
            </div>
          ) : (
            <div className="text-[9px] font-mono text-white/45 bg-black/25 px-3.5 py-1 rounded-full border border-white/5">
              🎮 Soporte total para mando de Xbox (Girar, Sprint, Disparar y Comer Escudo)
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 z-10">
          <button
            onClick={handleOpenNewTab}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white text-sm font-bold transition-colors shadow-lg"
          >
            <ExternalLink size={16} />
            <span>Nueva Pestaña</span>
          </button>

          {isAlive && (
            <button
              onClick={quitGame}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600/90 hover:bg-red-500 backdrop-blur-md rounded-full text-white text-sm font-bold transition-colors shadow-lg active:scale-95"
            >
              <LogOut size={15} />
              <span>Salir</span>
            </button>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      {isAlive && gameState && gameState.leaderboard.length > 0 && (
        <div className="absolute top-20 right-4 w-64 bg-black/60 backdrop-blur-md rounded-2xl p-4 border border-white/10 pointer-events-auto shadow-2xl">
          <div className="flex items-center gap-2 mb-3 text-white/90 font-semibold">
            <Trophy size={18} className="text-yellow-400" />
            <h2 className="tracking-wider text-xs font-bold uppercase font-mono">TOP REPARTIDORES</h2>
          </div>
          <div className="flex flex-col gap-2">
            {gameState.leaderboard.map((entry, i) => (
              <div key={entry.id} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-white/40 w-4 font-mono text-xs">{i + 1}.</span>
                  <span style={{ color: entry.color }} className="font-semibold truncate max-w-[120px]">
                    {entry.name}
                  </span>
                </div>
                <span className="font-mono text-yellow-400 font-bold">{entry.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menus */}
      <AnimatePresence>
        {(!gameState || isDead || isInLobby || gameState?.isRoundOver) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/75 backdrop-blur-md z-40 p-4 overflow-y-auto"
          >
            {/* LOBBY WAITING SCREEN */}
            {isInLobby && lobbyInfo && (
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-neutral-900/95 border border-white/10 rounded-3xl shadow-2xl max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-6 p-6 md:p-8 relative overflow-hidden"
              >
                {/* LEFT COLUMN: 3D character card */}
                <div className="md:col-span-5 flex flex-col gap-4 order-2 md:order-1">
                  <div className="bg-black/30 border border-white/5 rounded-2xl p-4 flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <div className="bg-amber-500/20 text-amber-400 p-1.5 rounded-lg">
                        <Crown size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white leading-none uppercase">{chefName || 'Chef'}</h4>
                        <span className="text-[10px] text-amber-500 font-mono font-bold tracking-wider">REPARTIDOR ARENA</span>
                      </div>
                    </div>

                    <ChefPreview3D color={selectedColor} />

                    {/* Stats List */}
                    <div className="flex flex-col gap-2.5">
                      <div>
                        <div className="flex justify-between text-[10px] font-bold font-mono text-white/50 mb-1">
                          <span className="flex items-center gap-1"><Zap size={11} className="text-amber-400" /> VELOCIDAD</span>
                          <span className="text-amber-400">100 KM/H</span>
                        </div>
                        <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden border border-white/5">
                          <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full" style={{ width: '100%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-bold font-mono text-white/50 mb-1">
                          <span className="flex items-center gap-1"><Flame size={11} className="text-orange-400" /> MANIOBRA DERRAPE</span>
                          <span className="text-orange-400">85%</span>
                        </div>
                        <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden border border-white/5">
                          <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full" style={{ width: '85%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-bold font-mono text-white/50 mb-1">
                          <span className="flex items-center gap-1"><Shield size={11} className="text-emerald-400" /> ESCUDO DE PROTECCIÓN</span>
                          <span className="text-emerald-400">3.5S</span>
                        </div>
                        <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden border border-white/5">
                          <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full" style={{ width: '70%' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: lobby room information */}
                <div className="md:col-span-7 flex flex-col justify-between gap-6 order-1 md:order-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 justify-center md:justify-start">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      <h2 className="text-2xl font-black text-amber-500 tracking-tight">SALA DE ESPERA</h2>
                    </div>
                    <p className="text-white/60 text-xs font-mono uppercase tracking-wider text-center md:text-left">
                      Modo: {lobbyInfo.maxPlayers} Jugadores • {lobbyInfo.roomCode ? 'Sala Privada' : 'Sala Pública'}
                    </p>

                    <div className="h-px bg-white/10 w-full my-4" />

                    {lobbyInfo.roomCode && (
                      <div className="bg-black/50 border border-amber-500/20 px-4 py-3 rounded-2xl flex flex-col items-center gap-1.5 w-full relative group mb-4">
                        <span className="text-[10px] text-white/50 font-mono uppercase tracking-wider">Código de la Sala</span>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black text-amber-400 font-mono tracking-widest">{lobbyInfo.roomCode}</span>
                          <button
                            onClick={handleCopyCode}
                            className="p-1.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-lg text-white transition-all"
                            title="Copiar código"
                          >
                            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          </button>
                        </div>
                        <span className="text-[10px] text-white/40 text-center">Comparte este código para jugar con amigos</span>
                      </div>
                    )}

                    {/* Connected Players list */}
                    <div className="w-full flex flex-col gap-2">
                      <div className="flex justify-between items-center text-xs font-mono text-white/40 px-1">
                        <span>CHEFS EN LA COCINA ({lobbyInfo.playersCount}/{lobbyInfo.maxPlayers})</span>
                        <span className="animate-pulse text-amber-500">Buscando...</span>
                      </div>
                      
                      <div className="w-full flex flex-col gap-1.5 bg-black/40 p-3 rounded-2xl border border-white/5 max-h-48 overflow-y-auto">
                        {lobbyInfo.players.map((p, idx) => (
                          <div key={p.id} className="flex justify-between items-center bg-white/5 px-3.5 py-2.5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2.5 truncate">
                              <span className="w-3.5 h-3.5 rounded-full border border-white/10 shadow-md" style={{ backgroundColor: p.color }} />
                              <span className="text-white font-bold text-sm truncate">
                                {p.name} {p.id === playerId ? <span className="text-white/40 text-xs font-normal font-mono">(Tú)</span> : ''}
                              </span>
                            </div>
                            {p.id === lobbyInfo.hostId ? (
                              <span className="text-[9px] bg-amber-500/20 text-amber-400 font-mono font-bold px-2 py-0.5 rounded border border-amber-500/20">ANFITRIÓN</span>
                            ) : (
                              <span className="text-[9px] bg-white/5 text-white/40 font-mono px-2 py-0.5 rounded">CONECTADO</span>
                            )}
                          </div>
                        ))}

                        {/* Empty Slots */}
                        {Array.from({ length: lobbyInfo.maxPlayers - lobbyInfo.playersCount }).map((_, i) => (
                          <div key={`empty-${i}`} className="flex justify-between items-center bg-white/2 px-3.5 py-2.5 rounded-xl border border-dashed border-white/5 opacity-40">
                            <span className="text-white/30 text-xs italic">Esperando otro chef...</span>
                            <span className="text-white/20 text-xs">⏰</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Host actions */}
                  <div className="w-full flex flex-col gap-2.5 mt-4">
                    {playerId === lobbyInfo.hostId ? (
                      <button
                        onClick={startGameNow}
                        className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-500 text-neutral-950 font-black rounded-xl hover:from-amber-500 hover:to-amber-400 active:scale-95 transition-all text-base tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 border-t border-white/20"
                      >
                        <Play size={18} fill="currentColor" />
                        <span>COMENZAR YA CON BOTS</span>
                      </button>
                    ) : (
                      <div className="text-center text-sm text-white/50 bg-white/5 py-3 rounded-xl border border-white/5 font-mono animate-pulse">
                        Esperando que el anfitrión comience...
                      </div>
                    )}

                    <button
                      onClick={quitGame}
                      className="w-full py-2.5 bg-white/5 text-white/80 font-bold rounded-xl hover:bg-white/10 active:scale-95 transition-all text-sm border border-white/5"
                    >
                      SALIR AL MENÚ PRINCIPAL
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ROUND OVER RESULTS SCREEN */}
            {gameState?.isRoundOver && (
              <motion.div
                key="round-over-screen"
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-neutral-900/95 p-8 rounded-3xl border border-white/10 shadow-2xl max-w-lg w-full flex flex-col gap-6 pointer-events-auto"
              >
                <div className="text-center">
                  <motion.div
                    initial={{ y: -10 }}
                    animate={{ y: 0 }}
                    className="text-5xl mb-3"
                  >
                    🏆🍕🎉
                  </motion.div>
                  <h2 className="text-3xl font-black text-amber-500 mb-1 tracking-tight uppercase">
                    Fin de la Ronda
                  </h2>
                  <p className="text-white/60 text-xs tracking-wide">
                    ¡La cocina ha cerrado! Estos son los resultados del reparto:
                  </p>
                </div>

                {/* Rankings List */}
                <div className="flex flex-col gap-2.5 max-h-[280px] overflow-y-auto pr-1">
                  {roundPlayers.map((p, idx) => {
                    const isMe = p.id === playerId;
                    const rank = idx + 1;
                    let rankBadge = `${rank}º`;
                    let rankBg = 'bg-white/5';
                    let rankText = 'text-white/60';

                    if (rank === 1) {
                      rankBadge = '🏆 1º';
                      rankBg = 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
                      rankText = 'text-amber-400 font-extrabold';
                    } else if (rank === 2) {
                      rankBadge = '🥈 2º';
                      rankBg = 'bg-neutral-300/20 text-neutral-300 border border-neutral-300/20';
                      rankText = 'text-neutral-200 font-bold';
                    } else if (rank === 3) {
                      rankBadge = '🥉 3º';
                      rankBg = 'bg-amber-700/20 text-amber-600 border border-amber-700/20';
                      rankText = 'text-amber-600 font-bold';
                    }

                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between p-3.5 rounded-xl transition-all ${
                          isMe
                            ? 'bg-amber-500/10 border-2 border-amber-500/40 shadow-lg shadow-amber-500/5'
                            : 'bg-black/30 border border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-black ${rankBg}`}>
                            {rankBadge}
                          </span>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-inner"
                              style={{ backgroundColor: p.color }}
                            />
                            <span className={`text-sm font-mono font-bold ${isMe ? 'text-amber-400 font-black' : 'text-white/90'}`}>
                              {p.name} {isMe && <span className="text-amber-500 text-[10px] bg-amber-500/10 px-1 py-0.5 rounded ml-1 font-sans">Tú</span>}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-white/40 block font-mono uppercase tracking-wider text-[9px] font-bold">Pizzas</span>
                          <span className="text-sm font-mono font-extrabold text-white">
                            {Math.floor(p.score)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Personal Record highlights */}
                <div className="bg-black/40 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                      <Trophy size={20} />
                    </div>
                    <div>
                      <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider block">Récord de Apilamiento</span>
                      <span className="text-amber-400 font-mono font-extrabold text-sm">
                        {Math.max(highestScore, currentScore)} Pizzas
                      </span>
                    </div>
                  </div>
                  {currentScore >= highestScore && currentScore > 5 && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded-full animate-bounce">
                      ✨ NUEVO RÉCORD
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="w-full flex flex-col gap-2.5">
                  <button
                    onClick={handleJoin}
                    className="w-full py-4 bg-amber-500 text-neutral-950 font-black rounded-xl hover:bg-amber-400 active:scale-95 transition-all text-base tracking-wider"
                  >
                    VOLVER A REPARTIR
                  </button>
                  <button
                    onClick={quitGame}
                    className="w-full py-3 bg-white/5 text-white/80 font-bold rounded-xl hover:bg-white/10 active:scale-95 transition-all text-sm"
                  >
                    SALIR AL MENÚ
                  </button>
                </div>
              </motion.div>
            )}

            {/* GAME OVER SCREEN */}
            {isDead && !gameState?.isRoundOver && (
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-neutral-900/95 p-8 rounded-3xl border border-white/10 shadow-2xl max-w-md w-full flex flex-col items-center gap-6"
              >
                <div className="text-center w-full">
                  <h2 className="text-4xl font-black text-red-500 mb-2">💥 ¡CHOQUE!</h2>
                  <p className="text-white/75 text-sm mb-4">¡Chocaste contra un obstáculo y tiraste todas las cajas!</p>
                  
                  <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col gap-2 items-center justify-center">
                    <div>
                      <span className="text-white/40 text-xs font-bold uppercase tracking-wider block">Cajas Apiladas</span>
                      <span className="text-yellow-400 font-mono font-black text-3xl">{currentScore} Pizzas</span>
                    </div>
                    <div className="h-px bg-white/10 w-full my-1" />
                    <div>
                      <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider block">🏆 Récord Personal</span>
                      <span className="text-amber-500 font-mono font-extrabold text-lg">{highestScore} Pizzas</span>
                    </div>
                  </div>
                </div>

                <div className="w-full flex flex-col gap-2.5">
                  <button
                    onClick={handleJoin}
                    className="w-full py-4 bg-amber-500 text-neutral-950 font-black rounded-xl hover:bg-amber-400 active:scale-95 transition-all text-base tracking-wider"
                  >
                    VOLVER A REPARTIR
                  </button>
                  <button
                    onClick={quitGame}
                    className="w-full py-3 bg-white/5 text-white/80 font-bold rounded-xl hover:bg-white/10 active:scale-95 transition-all text-sm"
                  >
                    SALIR AL MENÚ
                  </button>
                </div>
              </motion.div>
            )}

            {/* MAIN MENU / LANDING PAGE */}
            {!gameState && !isInLobby && (
              <div 
                className="absolute inset-0 flex flex-col justify-between pointer-events-auto bg-[#030303] overflow-y-auto p-6 md:p-8 z-40 relative"
                style={{
                  backgroundImage: `radial-gradient(rgba(245, 158, 11, 0.06) 1.5px, transparent 1.5px)`,
                  backgroundSize: '32px 32px'
                }}
              >
                {/* Neon Ambient Glows */}
                <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-amber-500/5 rounded-full blur-[130px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-red-600/5 rounded-full blur-[130px] pointer-events-none animate-pulse" style={{ animationDuration: '12s' }} />

                {/* Floating Emojis */}
                <div className="absolute top-[25%] left-[8%] text-3xl opacity-[0.08] pointer-events-none animate-bounce" style={{ animationDuration: '6s' }}>🍕</div>
                <div className="absolute bottom-[20%] left-[20%] text-2xl opacity-[0.05] pointer-events-none animate-bounce" style={{ animationDuration: '9s', animationDelay: '1s' }}>🍄</div>
                <div className="absolute top-[18%] right-[15%] text-4xl opacity-[0.08] pointer-events-none animate-bounce" style={{ animationDuration: '7s', animationDelay: '0.5s' }}>🍕</div>
                <div className="absolute bottom-[25%] right-[25%] text-3xl opacity-[0.05] pointer-events-none animate-bounce" style={{ animationDuration: '10s', animationDelay: '2s' }}>🍅</div>

                {/* Header */}
                <div className="flex justify-between items-center w-full max-w-5xl mx-auto z-10">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🍕</span>
                    <h1 className="text-xl font-black text-white tracking-widest font-mono">SLICE HUNTER</h1>
                  </div>
                  {highestScore > 0 && (
                    <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-xs text-amber-400 font-mono font-black tracking-wide">
                      <Trophy size={14} className="fill-amber-500/10" />
                      <span>RÉCORD: {highestScore} PIZZAS</span>
                    </div>
                  )}
                </div>

                {/* Main Body Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center max-w-5xl w-full mx-auto my-auto z-10">
                  {/* Left Column: Text & Play CTA */}
                  <div className="md:col-span-6 flex flex-col gap-6 text-center md:text-left justify-center">
                    <div className="flex flex-col gap-3">
                      <h2 className="text-4xl md:text-6xl font-black leading-none bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent tracking-tight uppercase">
                        PIZZA HUNTER
                      </h2>
                      <p className="text-white/70 text-xs md:text-sm font-sans max-w-md mx-auto md:mx-0">
                        ¡Esquiva las mesas del restaurante, compite contra otros repartidores por apilar cajas y defiende tus pizzas a toda velocidad en esta arena de reparto!
                      </p>
                    </div>

                    <button
                      onClick={() => setShowConfigModal(true)}
                      className="w-full md:w-64 py-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-neutral-950 font-black rounded-2xl active:scale-[0.98] transition-all text-base tracking-wider flex items-center justify-center gap-3 border-t border-white/20 shadow-2xl shadow-amber-500/20 group cursor-pointer"
                    >
                      <span>JUGAR AHORA</span>
                      <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>

                  {/* Right Column: Vespa Showcase with platform */}
                  <div className="md:col-span-6 flex flex-col items-center justify-center relative select-none">
                    {/* Futuristic showroom base */}
                    <div className="absolute bottom-6 w-60 h-14 bg-amber-500/5 rounded-full blur-md" />
                    <div className="absolute bottom-8 w-52 h-10 border border-amber-500/20 rounded-full flex items-center justify-center" style={{ boxShadow: '0 0 30px rgba(245,158,11,0.15), inset 0 0 20px rgba(245,158,11,0.05)' }}>
                      <div className="w-[94%] h-[94%] border border-dashed border-amber-500/10 rounded-full animate-spin" style={{ animationDuration: '30s' }} />
                    </div>
                    {/* Floating Vespa */}
                    <VespaShowcase color={selectedColor} />
                  </div>
                </div>

                {/* Footer Credits */}
                <div className="text-center text-[9px] font-mono text-white/30 tracking-wider z-10">
                  © 2026 Spicy Crust. Todos los derechos reservados.
                </div>
              </div>
            )}

            {/* CONFIGURATION POPUP MODAL */}
            {!gameState && !isInLobby && showConfigModal && (
              <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-auto">
                {/* Backdrop Blur Overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setShowConfigModal(false)}
                  className="absolute inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
                />

                {/* Modal Container */}
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-neutral-900 border border-white/10 rounded-3xl p-6 md:p-8 max-w-sm w-full relative z-10 flex flex-col gap-5 shadow-2xl overflow-y-auto max-h-[95vh]"
                >
                  {/* Modal Header */}
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black text-amber-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <Crown size={14} />
                      Configurar Repartidor
                    </h3>
                    <button
                      onClick={() => setShowConfigModal(false)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="h-px bg-white/10 w-full" />

                  {/* Nickname Input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-white/40 text-[9px] font-mono uppercase tracking-wider">
                      Nombre del Repartidor
                    </label>
                    <input
                      type="text"
                      value={chefName}
                      onChange={(e) => setChefName(e.target.value)}
                      maxLength={14}
                      className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm font-bold font-mono focus:outline-none focus:border-amber-500 transition-colors shadow-inner"
                      placeholder="Tu apodo..."
                    />
                  </div>

                  {/* Vespa Design Dropdown */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-white/40 text-[9px] font-mono uppercase tracking-wider">
                      Pintura Vespa (Skin)
                    </label>
                    
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowColorDropdown(!showColorDropdown)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-500 transition-colors shadow-inner cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-3.5 h-3.5 rounded-full border border-white/20 shadow-inner ${DRIVER_COLORS.find(c => c.hex === selectedColor)?.bg}`} />
                          <span>{DRIVER_COLORS.find(c => c.hex === selectedColor)?.name}</span>
                        </div>
                        <ChevronDown size={14} className={`text-white/60 transition-transform ${showColorDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showColorDropdown && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setShowColorDropdown(false)} />
                          <div className="absolute left-0 right-0 mt-2 p-2 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl z-30 grid grid-cols-3 gap-2 animate-fadeIn">
                            {DRIVER_COLORS.map((c) => (
                              <button
                                key={c.hex}
                                type="button"
                                onClick={() => {
                                  setSelectedColor(c.hex);
                                  localStorage.setItem('pizza_hunter_color', c.hex);
                                  setShowColorDropdown(false);
                                }}
                                className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all cursor-pointer ${
                                  selectedColor === c.hex
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                    : 'bg-black/20 border-transparent text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                              >
                                <span className={`w-5 h-5 rounded-full border border-white/20 shadow-inner ${c.bg}`} />
                                <span className="text-[9px] font-mono truncate max-w-full">{c.name}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Mode Selector Tabs */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-white/40 text-[9px] font-mono uppercase tracking-wider">Modo de Juego</label>
                    <div className="grid grid-cols-2 gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
                      <button
                        type="button"
                        onClick={() => setSelectedSolo(true)}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                          selectedSolo
                            ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/10'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Bot size={14} />
                        <span>SOLO (Práctica)</span>
                      </button>
                      <button
                        type="button"
                        disabled
                        className="relative flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold font-mono text-white/30 bg-black/20 overflow-hidden cursor-not-allowed"
                      >
                        <Users size={14} />
                        <span>MULTIJUGADOR</span>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
                          <span className="text-[8px] bg-red-600/90 text-white px-2 py-0.5 rounded font-black tracking-widest border border-red-500/50 shadow-lg rotate-[-5deg]">SOON</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Action Play Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfigModal(false);
                      handleJoin();
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-neutral-950 font-black rounded-xl active:scale-[0.98] transition-all text-base tracking-wider flex items-center justify-center gap-2 border-t border-white/20 shadow-xl shadow-amber-500/10 cursor-pointer"
                  >
                    <span>¡INICIAR ENTRADAS!</span>
                    <ArrowRight size={18} />
                  </button>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
