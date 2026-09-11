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
  Sparkles,
  Copy,
  Check,
  Play,
  Crown,
  Zap,
  Shield,
  Award,
  Flame,
  ChevronDown,
  X,
  Volume2,
  VolumeX,
  Globe,
  Send,
  Loader2,
  RefreshCw,
  Mail,
  Palette
} from 'lucide-react';
import { toggleMuteAudio, getIsMuted } from '../utils/audioSynthesizer';
import { playCountdownTickSound, playRoundOverSound } from '../utils/audio';
import { submitScore, getLeaderboard, SpicyLeaderboardEntry } from '../utils/spicycrustApi';
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
      groupRef.current.position.y = -0.15 + Math.sin(state.clock.getElapsedTime() * 2.2) * 0.035;
    }
  });

  return (
    <group ref={groupRef}>
      <ChefModel color={color} isUI={true} />
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
        camera={{ position: [0, 0.42, 1.62], fov: 45 }}
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
    <div className="w-full h-[200px] md:h-[380px] relative overflow-hidden flex items-center justify-center pointer-events-auto">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
      <Canvas
        camera={{ position: [0, 0.35, 1.55], fov: 40 }}
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
interface ScoreSubmissionFormProps {
  chefName: string;
  setChefName: (name: string) => void;
  submitEmail: string;
  setSubmitEmail: (email: string) => void;
  currentScore: number;
  survivalSecs: number;
  selectedColor: string;
  localHighscores: { name: string; score: number; date: string }[];
  setLocalHighscores: (scores: { name: string; score: number; date: string }[]) => void;
  fetchSpicyLeaderboard: () => Promise<void>;
  setShowSpicyLeaderboard: (show: boolean) => void;
}

function ScoreSubmissionForm({
  chefName,
  setChefName,
  submitEmail,
  setSubmitEmail,
  currentScore,
  survivalSecs,
  selectedColor,
  localHighscores,
  setLocalHighscores,
  fetchSpicyLeaderboard,
  setShowSpicyLeaderboard,
}: ScoreSubmissionFormProps) {
  const [isSubmittingScore, setIsSubmittingScore] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [hasSkipped, setHasSkipped] = useState<boolean>(false);
  const hasRecordedLocalScore = useRef<boolean>(false);

  const handleSendScore = async () => {
    if (isSubmittingScore || submitSuccess) return;

    const cleanNick = chefName.trim().substring(0, 20);
    if (!cleanNick) {
      setSubmitError('Por favor ingresa un nombre para el leaderboard (obligatorio).');
      return;
    }

    const cleanEmail = submitEmail.trim();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setSubmitError('Por favor ingresa un correo electrónico válido o déjalo vacío.');
      return;
    }

    setIsSubmittingScore(true);
    setSubmitError(null);
    try {
      localStorage.setItem('pizza_hunter_chef_name', cleanNick);
      setChefName(cleanNick);
      if (cleanEmail) {
        localStorage.setItem('pizza_hunter_email', cleanEmail);
        setSubmitEmail(cleanEmail);
      } else {
        localStorage.removeItem('pizza_hunter_email');
        setSubmitEmail('');
      }

      // Also save locally (only once per match, avoiding duplicates on retry)
      if (!hasRecordedLocalScore.current) {
        const newScore = {
          name: cleanNick,
          score: currentScore,
          date: new Date().toISOString().split('T')[0],
        };
        const updated = [...localHighscores, newScore]
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);
        setLocalHighscores(updated);
        localStorage.setItem('pizza_hunter_local_highscores', JSON.stringify(updated));
        hasRecordedLocalScore.current = true;
      }

      // Submit to SpicyCrust API
      await submitScore({
        nickname: cleanNick,
        email: cleanEmail,
        score: currentScore,
        metadata: {
          survivalSecs,
          color: selectedColor,
        },
      });

      setSubmitSuccess(true);
      fetchSpicyLeaderboard().catch(() => {});
    } catch (err: any) {
      const isTimeout = err?.name === 'TimeoutError' || err?.message?.includes('aborted');
      setSubmitError(isTimeout ? 'Tiempo de espera agotado al conectar con SpicyCrust.' : (err?.message || 'Error al conectar con la API de SpicyCrust.'));
    } finally {
      setIsSubmittingScore(false);
    }
  };

  if (hasSkipped) {
    return (
      <div className="bg-black/30 border border-white/10 rounded-2xl p-3 w-full flex items-center justify-between text-xs font-mono my-2">
        <span className="text-white/40">Envío de puntaje omitido.</span>
        <button
          type="button"
          onClick={() => setHasSkipped(false)}
          className="text-amber-400 hover:text-amber-300 underline font-bold cursor-pointer"
        >
          Registrar ahora
        </button>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        handleSendScore();
      }}
      className="bg-black/40 border border-amber-500/25 rounded-2xl p-3.5 w-full flex flex-col gap-2.5 text-left my-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-amber-400 text-xs font-black font-mono tracking-wider uppercase flex items-center gap-1.5">
          <Sparkles size={13} />
          Enviar a Leaderboard
        </span>
        <span className="text-[8px] font-mono text-white/50 bg-white/5 px-2 py-0.5 rounded border border-white/5">
          SpicyCrust API
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-white/60 text-[9px] font-mono uppercase tracking-wider flex items-center gap-1">
              <Crown size={11} className="text-amber-400" />
              <span>Nombre / Apodo</span> <span className="text-amber-400 font-bold">*</span>
            </label>
            <span className="text-[8px] text-amber-500/80 font-mono font-bold">OBLIGATORIO (MÁX. 20)</span>
          </div>
          <input
            type="text"
            value={chefName}
            onChange={(e) => {
              setChefName(e.target.value);
              if (submitError) setSubmitError(null);
            }}
            onBlur={() => {
              const clean = chefName.trim().substring(0, 20);
              if (clean) {
                localStorage.setItem('pizza_hunter_chef_name', clean);
              }
            }}
            maxLength={20}
            placeholder="Ingresa tu nombre..."
            className="w-full px-3 py-2.5 bg-black/60 border border-white/15 focus:border-amber-400 rounded-xl text-white font-mono text-xs focus:outline-none transition-colors shadow-inner"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-white/60 text-[9px] font-mono uppercase tracking-wider flex items-center gap-1">
              <Mail size={11} className="text-amber-500/70" />
              <span>Email de Contacto</span>
            </label>
            <span className="text-[8px] text-white/40 font-mono italic">OPCIONAL</span>
          </div>
          <input
            type="email"
            value={submitEmail}
            onChange={(e) => {
              setSubmitEmail(e.target.value);
              if (submitError) setSubmitError(null);
            }}
            onBlur={() => {
              const clean = submitEmail.trim();
              if (clean) {
                localStorage.setItem('pizza_hunter_email', clean);
              }
            }}
            placeholder="tu@email.com (opcional)"
            className="w-full px-3 py-2.5 bg-black/60 border border-white/15 focus:border-amber-400 rounded-xl text-white font-mono text-xs focus:outline-none transition-colors shadow-inner placeholder:text-white/20"
          />
          <span className="text-[8px] text-white/40 font-mono block mt-0.5">
            Opcional: para vincular tu cuenta y reclamar premios en SpicyCrust
          </span>
        </div>
      </div>

      {submitError && (
        <div className="bg-red-950/60 border border-red-500/40 text-red-300 text-[11px] p-2 rounded-lg font-mono flex items-center gap-2">
          <X size={14} className="text-red-400 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {submitSuccess ? (
        <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs p-2.5 rounded-xl font-mono flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-emerald-400 shrink-0" />
            <span>¡Puntaje enviado con éxito a SpicyCrust!</span>
          </div>
          <button
            type="button"
            onClick={() => {
              fetchSpicyLeaderboard();
              setShowSpicyLeaderboard(true);
            }}
            className="text-amber-400 hover:text-amber-300 text-[10px] underline font-bold shrink-0 cursor-pointer"
          >
            Ver Ranking
          </button>
        </div>
      ) : (
        <div className="flex gap-2 pt-0.5">
          <button
            type="submit"
            disabled={isSubmittingScore}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-black rounded-xl text-xs tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            {isSubmittingScore ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>ENVIANDO...</span>
              </>
            ) : (
              <>
                <Send size={13} />
                <span>ENVIAR PUNTAJE</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              const cleanNick = chefName.trim().substring(0, 20);
              if (cleanNick) {
                localStorage.setItem('pizza_hunter_chef_name', cleanNick);
                setChefName(cleanNick);
              }
              const cleanEmail = submitEmail.trim();
              if (cleanEmail) {
                localStorage.setItem('pizza_hunter_email', cleanEmail);
              }
              setHasSkipped(true);
            }}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white/80 font-bold rounded-xl text-xs tracking-wider transition-all active:scale-95 cursor-pointer border border-white/5"
          >
            SALTAR
          </button>
        </div>
      )}
    </form>
  );
}

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

  // State for config panel & skin customizer
  const [chefName, setChefName] = useState<string>(() => {
    return localStorage.getItem('pizza_hunter_chef_name') || '';
  });
  const [selectedSolo, setSelectedSolo] = useState<boolean>(true);
  const [selectedSize, setSelectedSize] = useState<number>(4);
  const [selectedPrivate, setSelectedPrivate] = useState<boolean>(false);
  const [inputCode, setInputCode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<string>(() => {
    return localStorage.getItem('pizza_hunter_color') || '#ffa502';
  });
  const [showSkinModal, setShowSkinModal] = useState<boolean>(false);
  const [showHighscoresModal, setShowHighscoresModal] = useState<boolean>(false);
  const [localHighscores, setLocalHighscores] = useState<{name: string, score: number, date: string}[]>(() => {
    const saved = localStorage.getItem('pizza_hunter_local_highscores');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      { name: 'Chef Mario', score: 25, date: '2026-07-10' },
      { name: 'Chef Luigi', score: 20, date: '2026-07-11' },
      { name: 'Chef Peach', score: 15, date: '2026-07-12' },
      { name: 'Chef Yoshi', score: 10, date: '2026-07-13' },
      { name: 'Chef Toad', score: 6, date: '2026-07-14' }
    ];
  });

  const [highestScore, setHighestScore] = useState<number>(() => {
    const saved = localStorage.getItem('pizza_hunter_highscore');
    return saved ? parseInt(saved, 10) : 0;
  });

  // SpicyCrust API States
  const [submitEmail, setSubmitEmail] = useState<string>(() => {
    return localStorage.getItem('pizza_hunter_email') || '';
  });
  const [showSpicyLeaderboard, setShowSpicyLeaderboard] = useState<boolean>(false);
  const [leaderboardTab, setLeaderboardTab] = useState<'spicy' | 'local'>('spicy');
  const [spicyRanking, setSpicyRanking] = useState<SpicyLeaderboardEntry[]>([]);
  const [isLoadingRanking, setIsLoadingRanking] = useState<boolean>(false);

  const [gamepadConnected, setGamepadConnected] = useState(false);
  const [isMutedState, setIsMutedState] = useState<boolean>(() => getIsMuted());
  const [showTimeExpiredScreen, setShowTimeExpiredScreen] = useState(false);
  const lastPlayedSecond = useRef<number | null>(null);
  const wasRoundOver = useRef<boolean>(false);
  const matchStartTime = useRef<number>(Date.now());
  const survivalDuration = useRef<number>(0);

  const currentScore = player ? Math.floor(player.score) : 0;

  const fetchSpicyLeaderboard = async () => {
    setIsLoadingRanking(true);
    try {
      const data = await getLeaderboard(10);
      setSpicyRanking(data);
    } catch (e) {
      console.warn('Failed to load SpicyCrust leaderboard', e);
    } finally {
      setIsLoadingRanking(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '--';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.split(' ')[0] || dateStr;
      return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

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
    // Reset survival duration tracking and set match start time
    matchStartTime.current = Date.now();
    survivalDuration.current = 0;

    // Determine player name from state or localStorage, fallback to 'Chef'
    const savedName = localStorage.getItem('pizza_hunter_chef_name');
    const cleanName = (chefName.trim() || savedName || 'Chef').substring(0, 20);
    if (chefName.trim()) {
      localStorage.setItem('pizza_hunter_chef_name', cleanName);
    }

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
          if (showTimeExpiredScreen) {
            setShowTimeExpiredScreen(false);
          } else {
            const isModalOpen = showSkinModal || showHighscoresModal || showSpicyLeaderboard;
            if (!isModalOpen) {
              if (isDead || gameState?.isRoundOver) {
                handleJoin();
              } else if (!gameState && !isInLobby) {
                handleJoin();
              } else if (isInLobby && lobbyInfo && lobbyInfo.hostId === playerId) {
                startGameNow();
              }
            }
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
  }, [playerId, isInLobby, isDead, gameState?.isRoundOver, lobbyInfo, handleJoin, startGameNow, showSkinModal, showHighscoresModal, showSpicyLeaderboard, showTimeExpiredScreen]);

  // Instant retry keydown shortcut (Space, Enter, R) when dead or round over
  useEffect(() => {
    if (!isDead && !gameState?.isRoundOver) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing inside an input element, interacting with a button, or modal is open
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'BUTTON' ||
        showSkinModal ||
        showHighscoresModal ||
        showSpicyLeaderboard ||
        showTimeExpiredScreen
      ) {
        return;
      }
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleJoin();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDead, gameState?.isRoundOver, handleJoin, showSkinModal, showHighscoresModal, showSpicyLeaderboard, showTimeExpiredScreen]);

  // Synchronously freeze survival duration during render if dead or round over
  if ((isDead || gameState?.isRoundOver) && survivalDuration.current === 0 && matchStartTime.current > 0) {
    survivalDuration.current = Math.max(1, Math.floor((Date.now() - matchStartTime.current) / 1000));
  }

  // Auto-dismiss the dramatic time-expired banner after 2.5s
  useEffect(() => {
    if (showTimeExpiredScreen) {
      const timer = setTimeout(() => {
        setShowTimeExpiredScreen(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [showTimeExpiredScreen]);

  // Global Escape key to dismiss modals / splash overlays
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTimeExpiredScreen) {
          setShowTimeExpiredScreen(false);
          return;
        }
        if (showSkinModal) {
          setShowSkinModal(false);
          return;
        }
        if (showHighscoresModal || showSpicyLeaderboard) {
          setShowHighscoresModal(false);
          setShowSpicyLeaderboard(false);
          return;
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showTimeExpiredScreen, showSkinModal, showHighscoresModal, showSpicyLeaderboard]);

  // Track match start time and freeze duration upon death or round over
  useEffect(() => {
    if (isAlive) {
      survivalDuration.current = 0;
    } else if (matchStartTime.current > 0 && (isDead || gameState?.isRoundOver)) {
      if (survivalDuration.current === 0) {
        survivalDuration.current = Math.max(1, Math.floor((Date.now() - matchStartTime.current) / 1000));
      }
    }
  }, [isAlive, isDead, gameState?.isRoundOver]);

  const finalSurvivalSecs = survivalDuration.current > 0
    ? survivalDuration.current
    : Math.max(1, Math.floor((Date.now() - matchStartTime.current) / 1000));

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
        // Only trigger round over sound & banner if the player didn't already die
        if (!isDead) {
          playRoundOverSound();
          setShowTimeExpiredScreen(true);
        }
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
    if (currentSec <= 10 && currentSec > 0 && currentSec !== lastPlayedSecond.current && !isDead) {
      lastPlayedSecond.current = currentSec;
      playCountdownTickSound(currentSec <= 5);
    }
  }, [gameState?.timeLeft, gameState?.isRoundOver, playerId, isDead]);

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
        {playerId && gameState && !isDead && !gameState.isRoundOver && gameState.timeLeft !== undefined && gameState.timeLeft <= 10 && gameState.timeLeft > 0 && (
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
            onClick={() => setShowTimeExpiredScreen(false)}
            className="absolute inset-0 pointer-events-auto bg-black/90 backdrop-blur-lg flex flex-col items-center justify-center z-50 p-6 cursor-pointer"
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
            onClick={() => {
              const muted = toggleMuteAudio();
              setIsMutedState(muted);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold transition-all shadow-lg active:scale-95 border border-white/5"
            title={isMutedState ? "Activar Sonido" : "Silenciar Sonido"}
          >
            {isMutedState ? <VolumeX size={15} className="text-red-400" /> : <Volume2 size={15} className="text-amber-400" />}
            <span className="hidden sm:inline text-xs font-mono">{isMutedState ? "MUTE" : "AUDIO"}</span>
          </button>

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
            {!isDead && gameState?.isRoundOver && (
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

                {/* SpicyCrust Score Submission Form */}
                <ScoreSubmissionForm
                  chefName={chefName}
                  setChefName={setChefName}
                  submitEmail={submitEmail}
                  setSubmitEmail={setSubmitEmail}
                  currentScore={currentScore}
                  survivalSecs={finalSurvivalSecs}
                  selectedColor={selectedColor}
                  localHighscores={localHighscores}
                  setLocalHighscores={setLocalHighscores}
                  fetchSpicyLeaderboard={fetchSpicyLeaderboard}
                  setShowSpicyLeaderboard={setShowSpicyLeaderboard}
                />

                {/* Actions */}
                <div className="w-full flex flex-col gap-2.5">
                  <button
                    onClick={handleJoin}
                    className="w-full py-4 bg-amber-500 text-neutral-950 font-black rounded-xl hover:bg-amber-400 active:scale-95 transition-all text-base tracking-wider cursor-pointer"
                  >
                    VOLVER A REPARTIR
                  </button>
                  <button
                    onClick={quitGame}
                    className="w-full py-3 bg-white/5 text-white/80 font-bold rounded-xl hover:bg-white/10 active:scale-95 transition-all text-sm cursor-pointer"
                  >
                    SALIR AL MENÚ
                  </button>
                </div>
              </motion.div>
            )}

            {/* GAME OVER SCREEN */}
            {isDead && (() => {
              return (
                <motion.div
                  initial={{ scale: 0.9, y: 20, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-neutral-900/95 p-6 md:p-7 rounded-3xl border border-red-500/30 shadow-2xl shadow-red-500/10 max-w-md w-full flex flex-col items-center gap-4 pointer-events-auto relative overflow-hidden my-auto"
                >
                  {/* Glowing background aura */}
                  <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="text-center w-full relative z-10">
                    <motion.div
                      initial={{ rotate: -15, scale: 0.5 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                      className="inline-block text-4xl mb-0.5"
                    >
                      💥
                    </motion.div>
                    <h2 className="text-2xl md:text-3xl font-black text-red-500 tracking-tight uppercase" style={{ textShadow: '0 0 15px rgba(239, 68, 68, 0.4)' }}>
                      ¡ACCIDENTE EN LA PIZZERÍA!
                    </h2>
                    <p className="text-white/60 text-xs mt-0.5">Chocaste contra un obstáculo de la arena</p>
                    
                    {/* 3-Column Stats Card Grid */}
                    <div className="grid grid-cols-3 gap-2 bg-black/50 border border-white/10 rounded-2xl p-2.5 w-full my-3">
                      <div className="flex flex-col items-center justify-center p-1">
                        <span className="text-white/40 text-[9px] font-bold uppercase tracking-wider block mb-0.5">Puntaje</span>
                        <span className="text-yellow-400 font-mono font-black text-xl">{currentScore}</span>
                      </div>
                      
                      <div className="flex flex-col items-center justify-center p-1 border-x border-white/10">
                        <span className="text-white/40 text-[9px] font-bold uppercase tracking-wider block mb-0.5">Tiempo</span>
                        <span className="text-emerald-400 font-mono font-extrabold text-xl">{finalSurvivalSecs}s</span>
                      </div>

                      <div className="flex flex-col items-center justify-center p-1">
                        <span className="text-white/40 text-[9px] font-bold uppercase tracking-wider block mb-0.5">🏆 Récord</span>
                        <span className="text-amber-400 font-mono font-extrabold text-xl">{Math.max(highestScore, currentScore)}</span>
                      </div>
                    </div>

                    {/* SpicyCrust Score Submission Form */}
                    <ScoreSubmissionForm
                      chefName={chefName}
                      setChefName={setChefName}
                      submitEmail={submitEmail}
                      setSubmitEmail={setSubmitEmail}
                      currentScore={currentScore}
                      survivalSecs={finalSurvivalSecs}
                      selectedColor={selectedColor}
                      localHighscores={localHighscores}
                      setLocalHighscores={setLocalHighscores}
                      fetchSpicyLeaderboard={fetchSpicyLeaderboard}
                      setShowSpicyLeaderboard={setShowSpicyLeaderboard}
                    />
                  </div>

                  {/* Instant Revenge and Menu Actions */}
                  <div className="w-full flex flex-col gap-2 relative z-10">
                    <button
                      onClick={handleJoin}
                      className="w-full py-3 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-neutral-950 font-black rounded-xl hover:brightness-110 active:scale-95 transition-all text-sm tracking-wider shadow-lg shadow-amber-500/25 border border-yellow-300/40 relative overflow-hidden group flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 font-black uppercase tracking-wider">
                        <Zap size={16} className="text-neutral-950 fill-neutral-950 animate-pulse" />
                        ¡REVANCHA INSTANTÁNEA!
                      </span>
                      <span className="text-[8px] text-neutral-900/80 font-mono font-bold tracking-widest uppercase">
                        (Presiona ESPACIO, ENTER o A)
                      </span>
                    </button>
                    <button
                      onClick={quitGame}
                      className="w-full py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-bold rounded-xl active:scale-95 transition-all text-xs border border-white/5 cursor-pointer"
                    >
                      SALIR AL MENÚ PRINCIPAL
                    </button>
                  </div>
                </motion.div>
              );
            })()}

            {/* MAIN MENU / LANDING PAGE */}
            {!gameState && !isInLobby && (
              <div 
                className="fixed inset-0 flex flex-col justify-between pointer-events-auto bg-[#030303] overflow-y-auto p-6 md:p-8 z-40 select-none"
                style={{
                  backgroundImage: `linear-gradient(rgba(3, 3, 3, 0.75), rgba(3, 3, 3, 0.85)), url(/pizza_arena_bg.png)`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
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

                    <div className="flex flex-col gap-3 w-full md:w-fit z-10">
                      <div className="flex flex-col sm:flex-row gap-3 w-full">
                        <button
                          onClick={handleJoin}
                          className="w-full sm:w-52 py-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-neutral-950 font-black rounded-2xl active:scale-[0.98] transition-all text-base tracking-wider flex items-center justify-center gap-2 border-t border-white/20 shadow-2xl shadow-amber-500/20 group cursor-pointer"
                        >
                          <Play size={18} fill="currentColor" />
                          <span>JUGAR AHORA</span>
                        </button>

                        <button
                          onClick={() => {
                            fetchSpicyLeaderboard();
                            setShowHighscoresModal(true);
                          }}
                          className="w-full sm:w-44 py-4 bg-neutral-900 border border-white/10 hover:bg-neutral-800 text-white font-bold rounded-2xl active:scale-[0.98] transition-all text-base tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Award size={18} className="text-yellow-500" />
                          <span>RÉCORDS</span>
                        </button>
                      </div>

                      {/* SpicyCrust Link Button */}
                      <a
                        href="https://spicycrust.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 px-4 bg-gradient-to-r from-red-950/50 via-neutral-900/80 to-neutral-900/80 hover:from-red-900/50 hover:to-neutral-800 border border-red-500/25 hover:border-amber-500/40 text-white rounded-2xl transition-all flex items-center justify-between gap-3 group shadow-lg shadow-black/40 active:scale-[0.99] cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">🌶️</span>
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-black font-mono uppercase tracking-wider text-amber-400 group-hover:text-amber-300 flex items-center gap-1.5">
                              <span>SPICYCRUST.COM</span>
                              <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.2 rounded border border-red-500/30">ARCADE</span>
                            </span>
                            <span className="text-[10px] text-white/50 font-sans">
                              Visita la taberna oficial y descubre más juegos
                            </span>
                          </div>
                        </div>
                        <ExternalLink size={16} className="text-white/40 group-hover:text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                      </a>
                    </div>
                  </div>

                  {/* Right Column: Vespa Showcase Holographic Card */}
                  <div className="md:col-span-6 flex flex-col items-center justify-center relative select-none bg-black/45 border border-white/10 rounded-3xl backdrop-blur-md p-4 md:p-6 w-full max-w-sm mx-auto shadow-2xl">
                    <div className="w-full flex items-center justify-between mb-1 px-1">
                      <span className="text-[10px] font-black text-amber-500 tracking-widest uppercase font-mono">
                        ⚡ TU REPARTIDOR 3D ⚡
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSkinModal(true)}
                        className="flex items-center gap-1.5 text-[10px] font-mono text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-500/20 transition-all cursor-pointer"
                        title="Personalizar color de la Vespa"
                      >
                        <Palette size={12} />
                        <span>Personalizar Vespa</span>
                      </button>
                    </div>
                    
                    <div className="relative w-full flex items-center justify-center">
                      {/* Futuristic showroom base */}
                      <div className="absolute bottom-4 w-44 h-10 bg-amber-500/5 rounded-full blur-md" />
                      <div className="absolute bottom-6 w-36 h-8 border border-amber-500/20 rounded-full flex items-center justify-center" style={{ boxShadow: '0 0 30px rgba(245,158,11,0.15), inset 0 0 20px rgba(245,158,11,0.05)' }}>
                        <div className="w-[94%] h-[94%] border border-dashed border-amber-500/10 rounded-full animate-spin" style={{ animationDuration: '30s' }} />
                      </div>
                      {/* Floating Vespa */}
                      <VespaShowcase color={selectedColor} />
                    </div>

                    {/* Quick Color Swatches and Customize Action */}
                    <div className="flex items-center justify-between w-full mt-2 pt-2.5 border-t border-white/10">
                      <div className="flex items-center gap-1.5">
                        {DRIVER_COLORS.map((c) => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => {
                              setSelectedColor(c.hex);
                              localStorage.setItem('pizza_hunter_color', c.hex);
                            }}
                            className={`w-5 h-5 rounded-full border transition-all cursor-pointer hover:scale-125 ${
                              selectedColor === c.hex
                                ? 'border-amber-400 ring-2 ring-amber-400/50 scale-110 shadow-lg'
                                : 'border-white/30 opacity-70 hover:opacity-100'
                            } ${c.bg}`}
                            title={`Color: ${c.name}`}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowSkinModal(true)}
                        className="flex items-center gap-1 text-[11px] font-mono text-white/70 hover:text-white transition-colors cursor-pointer"
                      >
                        <span>{DRIVER_COLORS.find(c => c.hex === selectedColor)?.name}</span>
                        <ChevronDown size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer Credits */}
                <div className="text-center text-[9px] font-mono text-white/30 tracking-wider z-10">
                  © 2026 Spicy Crust. Todos los derechos reservados.
                </div>
              </div>
            )}

            {/* VESPA SKIN CUSTOMIZATION MODAL */}
            {!gameState && !isInLobby && showSkinModal && (
              <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-auto">
                {/* Backdrop Blur Overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setShowSkinModal(false)}
                  className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
                />

                {/* Modal Container */}
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-neutral-900 border border-amber-500/30 rounded-3xl p-6 md:p-7 max-w-sm w-full relative z-10 flex flex-col gap-4 shadow-2xl"
                >
                  {/* Modal Header */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                        <Palette size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-amber-500 uppercase tracking-wider font-mono">
                          Personalizar Vespa
                        </h3>
                        <span className="text-[10px] text-white/50 font-mono">
                          Pintura y acabado de la carrocería
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSkinModal(false)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="h-px bg-white/10 w-full" />

                  {/* 3D Preview inside modal */}
                  <ChefPreview3D color={selectedColor} />

                  {/* Color Selection Swatches Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {DRIVER_COLORS.map((c) => {
                      const isSelected = selectedColor === c.hex;
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => {
                            setSelectedColor(c.hex);
                            localStorage.setItem('pizza_hunter_color', c.hex);
                          }}
                          className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                              : 'bg-black/40 border-white/5 text-white/70 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <div className="relative">
                            <span className={`block w-6 h-6 rounded-full border border-white/30 shadow-inner ${c.bg}`} />
                            {isSelected && (
                              <span className="absolute inset-0 flex items-center justify-center text-white text-xs drop-shadow">
                                <Check size={12} strokeWidth={3} />
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono font-bold truncate max-w-full">{c.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSkinModal(false)}
                    className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:scale-95 text-neutral-950 font-black rounded-xl text-xs font-mono tracking-wider transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    LISTO
                  </button>
                </motion.div>
              </div>
            )}

            {/* UNIFIED LEADERBOARD MODAL (SpicyCrust Global & Local) */}
            {(showHighscoresModal || showSpicyLeaderboard) && (
              <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-auto">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => {
                    setShowHighscoresModal(false);
                    setShowSpicyLeaderboard(false);
                  }}
                  className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
                />

                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-neutral-900 border border-amber-500/30 rounded-3xl p-5 md:p-7 max-w-lg w-full relative z-10 flex flex-col gap-4 shadow-2xl overflow-hidden max-h-[90vh]"
                >
                  {/* Modal Header */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                        <Trophy size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-amber-500 uppercase tracking-wider font-mono">
                          Salón de la Fama
                        </h3>
                        <span className="text-[10px] text-white/50 font-mono">
                          Slice Hunter × SpicyCrust Arena
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowHighscoresModal(false);
                        setShowSpicyLeaderboard(false);
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Tabs Selector: SpicyCrust Global vs Local */}
                  <div className="grid grid-cols-2 gap-2 bg-black/40 p-1 rounded-xl border border-white/5 font-mono text-xs">
                    <button
                      onClick={() => {
                        setLeaderboardTab('spicy');
                        fetchSpicyLeaderboard();
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                        leaderboardTab === 'spicy'
                          ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Globe size={13} />
                      <span>SPICYCRUST (GLOBAL)</span>
                    </button>
                    <button
                      onClick={() => setLeaderboardTab('local')}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                        leaderboardTab === 'local'
                          ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Award size={13} />
                      <span>LOCAL (ESTE EQUIPO)</span>
                    </button>
                  </div>

                  {/* Tab Contents */}
                  {leaderboardTab === 'spicy' ? (
                    <div className="flex flex-col gap-2.5">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">
                          TOP 10 MEJORES PUNTAJES
                        </span>
                        <button
                          onClick={fetchSpicyLeaderboard}
                          disabled={isLoadingRanking}
                          className="flex items-center gap-1 text-[10px] text-amber-400/80 hover:text-amber-400 font-mono transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <RefreshCw size={11} className={isLoadingRanking ? 'animate-spin' : ''} />
                          <span>Actualizar</span>
                        </button>
                      </div>

                      <div className="bg-black/50 border border-white/5 rounded-2xl p-3 w-full max-h-64 overflow-y-auto flex flex-col gap-1.5">
                        {isLoadingRanking ? (
                          <div className="py-8 flex flex-col items-center justify-center gap-2 text-white/50 font-mono text-xs">
                            <Loader2 size={22} className="animate-spin text-amber-400" />
                            <span>Cargando leaderboard de SpicyCrust...</span>
                          </div>
                        ) : spicyRanking.length === 0 ? (
                          <div className="py-8 text-center text-white/40 font-mono text-xs flex flex-col items-center gap-2">
                            <span>🍕 ¡Sé el primer repartidor en registrar su récord!</span>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-12 text-[10px] font-mono text-white/40 px-2 pb-1 border-b border-white/5">
                              <span className="col-span-2">#</span>
                              <span className="col-span-5">JUGADOR</span>
                              <span className="col-span-3 text-right">PUNTAJE</span>
                              <span className="col-span-2 text-right">FECHA</span>
                            </div>
                            {spicyRanking.map((entry, idx) => {
                              const rank = entry.rank ?? idx + 1;
                              const isTop1 = rank === 1;
                              const isTop2 = rank === 2;
                              const isTop3 = rank === 3;
                              const isCurrentPlayer = chefName.trim() && entry.nickname?.toLowerCase() === chefName.trim().toLowerCase();

                              let medalBadge = <span className="text-white/40 font-mono text-xs">{rank}</span>;
                              if (isTop1) medalBadge = <span className="text-base" title="1er Lugar">🥇</span>;
                              else if (isTop2) medalBadge = <span className="text-base" title="2do Lugar">🥈</span>;
                              else if (isTop3) medalBadge = <span className="text-base" title="3er Lugar">🥉</span>;

                              return (
                                <div
                                  key={idx}
                                  className={`grid grid-cols-12 items-center px-2 py-1.5 rounded-xl font-mono text-xs transition-colors ${
                                    isCurrentPlayer
                                      ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                                      : 'hover:bg-white/5 text-white/90'
                                  }`}
                                >
                                  <div className="col-span-2 flex items-center">{medalBadge}</div>
                                  <div className="col-span-5 truncate font-bold flex items-center gap-1.5">
                                    <span className="truncate">{entry.nickname || 'Anónimo'}</span>
                                    {isCurrentPlayer && (
                                      <span className="text-[8px] bg-amber-500/20 text-amber-400 px-1 py-0.2 rounded shrink-0">Tú</span>
                                    )}
                                  </div>
                                  <div className="col-span-3 text-right font-black text-amber-400">
                                    {entry.score} 🍕
                                  </div>
                                  <div className="col-span-2 text-right text-[9px] text-white/30 truncate">
                                    {formatDate(entry.created_at)}
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-black/50 border border-white/5 rounded-2xl p-3 w-full max-h-64 overflow-y-auto flex flex-col gap-1.5">
                      <div className="grid grid-cols-12 text-[10px] font-mono text-white/40 px-2 pb-1 border-b border-white/5">
                        <span className="col-span-2">#</span>
                        <span className="col-span-6">JUGADOR</span>
                        <span className="col-span-4 text-right">PUNTAJE</span>
                      </div>
                      {localHighscores.map((entry, idx) => (
                        <div key={idx} className="grid grid-cols-12 items-center px-2 py-1.5 rounded-xl font-mono text-xs hover:bg-white/5">
                          <div className="col-span-2">
                            <span className={`w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold ${
                              idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                              idx === 1 ? 'bg-white/10 text-white/70' :
                              idx === 2 ? 'bg-amber-800/20 text-amber-600' : 'bg-neutral-800 text-white/40'
                            }`}>{idx + 1}</span>
                          </div>
                          <div className="col-span-6 truncate font-bold text-white">
                            {entry.name}
                          </div>
                          <div className="col-span-4 text-right font-black text-amber-400">
                            {entry.score} 🍕
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    {(isDead || gameState?.isRoundOver) && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowHighscoresModal(false);
                          setShowSpicyLeaderboard(false);
                          handleJoin();
                        }}
                        className="flex-1 py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-neutral-950 font-black rounded-xl text-xs tracking-wider transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
                      >
                        ¡VOLVER A JUGAR!
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setShowHighscoresModal(false);
                        setShowSpicyLeaderboard(false);
                      }}
                      className={`${(isDead || gameState?.isRoundOver) ? 'px-5' : 'w-full'} py-3 bg-white/10 hover:bg-white/15 text-white/90 font-bold rounded-xl active:scale-95 transition-all text-xs cursor-pointer border border-white/5`}
                    >
                      CERRAR
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
