import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { Zap, Shield } from 'lucide-react';

// Expose inputs globally to avoid React render cycles in 60 FPS loop
declare global {
  interface Window {
    virtualInputs?: {
      analogTurn: number;
      boost: boolean;
      shoot: boolean;
      consume: boolean;
    };
  }
}

if (!window.virtualInputs) {
  window.virtualInputs = {
    analogTurn: 0,
    boost: false,
    shoot: false,
    consume: false,
  };
}

export function VirtualJoystick() {
  const { gameState, playerId } = useGameStore();
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const joystickRef = useRef<HTMLDivElement>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const touchStartPos = useRef({ x: 0, y: 0 });
  const maxRadius = 50; // px

  useEffect(() => {
    const checkTouch = () => {
      const touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      setIsTouchDevice(touch);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  const player = playerId && gameState ? gameState.players[playerId] : null;
  const isPlaying = !!(player && player.state === 'alive' && gameState && !gameState.isRoundOver);

  if (!isTouchDevice || !isPlaying) return null;

  // Joystick touch handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (joystickRef.current) {
      const rect = joystickRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      touchStartPos.current = { x: centerX, y: centerY };
      setJoystickActive(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!joystickActive) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let angle = Math.atan2(dy, dx);
    let rx = dx;
    let ry = dy;

    if (distance > maxRadius) {
      rx = Math.cos(angle) * maxRadius;
      ry = Math.sin(angle) * maxRadius;
    }

    setStickPos({ x: rx, y: ry });

    const turnVal = rx / maxRadius; // Range -1 to 1
    if (window.virtualInputs) {
      window.virtualInputs.analogTurn = turnVal;
    }
  };

  const handleTouchEnd = () => {
    setJoystickActive(false);
    setStickPos({ x: 0, y: 0 });
    if (window.virtualInputs) {
      window.virtualInputs.analogTurn = 0;
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex select-none">
      {/* Joystick Zone (Left) */}
      <div className="absolute bottom-8 left-8 w-40 h-40 flex items-center justify-center pointer-events-auto">
        <div
          ref={joystickRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-32 h-32 rounded-full bg-black/45 border-2 border-white/20 flex items-center justify-center relative touch-none backdrop-blur-sm"
        >
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 absolute" />
          
          <div
            className="w-16 h-16 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 border border-white/30 absolute shadow-xl shadow-amber-500/20 active:from-amber-400 active:to-amber-500 transition-shadow duration-150 flex items-center justify-center"
            style={{
              transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
            }}
          >
            <div className="w-6 h-6 rounded-full bg-white/20" />
          </div>
        </div>
      </div>

      {/* Action Buttons Zone (Right) */}
      <div className="absolute bottom-8 right-8 flex flex-col gap-4 items-end pointer-events-auto">
        {player.hasShield && (
          <button
            onTouchStart={() => {
              if (window.virtualInputs) window.virtualInputs.consume = true;
            }}
            className="w-14 h-14 rounded-full bg-emerald-500/90 border border-emerald-400/40 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform touch-none backdrop-blur-sm"
          >
            <Shield size={20} className="fill-white/10" />
          </button>
        )}

        <div className="flex gap-4">
          {/* Turbo / Boost Button */}
          <button
            onTouchStart={() => {
              if (window.virtualInputs) window.virtualInputs.boost = true;
            }}
            onTouchEnd={() => {
              if (window.virtualInputs) window.virtualInputs.boost = false;
            }}
            className="w-16 h-16 rounded-full bg-gradient-to-r from-red-600 to-red-500 border border-white/20 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform touch-none backdrop-blur-sm"
          >
            <Zap size={22} className="fill-white/10" />
          </button>

          {/* Shoot Button */}
          <button
            onTouchStart={() => {
              if (window.virtualInputs) window.virtualInputs.shoot = true;
            }}
            onTouchEnd={() => {
              if (window.virtualInputs) window.virtualInputs.shoot = false;
            }}
            className="w-20 h-20 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 border border-white/30 text-neutral-950 flex flex-col items-center justify-center shadow-2xl active:scale-95 transition-transform touch-none backdrop-blur-sm"
          >
            <span className="text-[11px] font-black tracking-wider uppercase leading-none">PIZZA</span>
            <span className="text-[9px] font-mono font-bold opacity-75 mt-0.5">DISPARAR</span>
          </button>
        </div>
      </div>
    </div>
  );
}
