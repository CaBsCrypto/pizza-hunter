import { useEffect, useRef } from 'react';

interface GameInputCallbacks {
  onShoot?: () => void;
  onConsumeShield?: () => void;
}

export function useGameInput(callbacks?: GameInputCallbacks) {
  const keyboardInputs = useRef({ left: false, right: false, boost: false });
  const callbacksRef = useRef(callbacks);

  // Mantener los callbacks actualizados sin reiniciar los listeners
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bloquear scroll si se presiona barra espaciadora o flechas
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }

      if ((e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') && !keyboardInputs.current.left) {
        keyboardInputs.current.left = true;
      }
      if ((e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') && !keyboardInputs.current.right) {
        keyboardInputs.current.right = true;
      }
      if ((e.key === ' ' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') && !keyboardInputs.current.boost) {
        keyboardInputs.current.boost = true;
      }

      // Disparar pizza
      if (e.key === 'f' || e.key === 'F' || e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
        callbacksRef.current?.onShoot?.();
      }

      // Consumir escudo
      if (e.key === 'q' || e.key === 'Q') {
        callbacksRef.current?.onConsumeShield?.();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') && keyboardInputs.current.left) {
        keyboardInputs.current.left = false;
      }
      if ((e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') && keyboardInputs.current.right) {
        keyboardInputs.current.right = false;
      }
      if ((e.key === ' ' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') && keyboardInputs.current.boost) {
        keyboardInputs.current.boost = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const pollInputs = () => {
    // 1. Polling de Gamepad / Xbox Controller
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gamepadLeft = false;
    let gamepadRight = false;
    let gamepadBoost = false;
    let gamepadShoot = false;
    let gamepadConsumeShield = false;
    let analogTurnValue = 0;

    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (gp) {
        // Joystick Izquierdo (Eje X en índice 0)
        const axisX = gp.axes[0];
        if (axisX !== undefined && Math.abs(axisX) > 0.15) {
          analogTurnValue = axisX;
        }

        // Cruceta/D-pad Izquierda (14) y Derecha (15)
        if (gp.buttons[14] && gp.buttons[14].pressed) gamepadLeft = true;
        if (gp.buttons[15] && gp.buttons[15].pressed) gamepadRight = true;

        // Botones de Boost: A (0), LB (4), LT (6)
        const boostBtnIndices = [0, 4, 6];
        for (const btnIndex of boostBtnIndices) {
          if (gp.buttons[btnIndex] && gp.buttons[btnIndex].pressed) {
            gamepadBoost = true;
            break;
          }
        }

        // Botones de Disparo: B (1), X (2), RB (5), RT (7)
        const shootBtnIndices = [1, 2, 5, 7];
        for (const btnIndex of shootBtnIndices) {
          if (gp.buttons[btnIndex] && gp.buttons[btnIndex].pressed) {
            gamepadShoot = true;
            break;
          }
        }

        // Botones de Escudo: Y (3), Cruceta Arriba (12), Cruceta Abajo (13)
        const consumeBtnIndices = [3, 12, 13];
        for (const btnIndex of consumeBtnIndices) {
          if (gp.buttons[btnIndex] && gp.buttons[btnIndex].pressed) {
            gamepadConsumeShield = true;
            break;
          }
        }
      }
    }

    // 2. Disparador de eventos polleados de gamepad o inputs virtuales del celular
    if (gamepadShoot || (window.virtualInputs && window.virtualInputs.shoot)) {
      callbacksRef.current?.onShoot?.();
      if (window.virtualInputs) window.virtualInputs.shoot = false;
    }

    if (gamepadConsumeShield || (window.virtualInputs && window.virtualInputs.consume)) {
      callbacksRef.current?.onConsumeShield?.();
      if (window.virtualInputs) window.virtualInputs.consume = false;
    }

    // 3. Resolver dirección y velocidad final (Giro analógico o digital teclado)
    const virtualTurn = window.virtualInputs ? window.virtualInputs.analogTurn : 0;
    const finalAnalogTurn = analogTurnValue !== 0 ? analogTurnValue : virtualTurn;

    const virtualBoost = window.virtualInputs ? window.virtualInputs.boost : false;
    const isBoosting = keyboardInputs.current.boost || gamepadBoost || virtualBoost;

    return {
      analogTurn: finalAnalogTurn,
      digitalLeft: keyboardInputs.current.left || gamepadLeft,
      digitalRight: keyboardInputs.current.right || gamepadRight,
      isBoosting,
    };
  };

  return {
    pollInputs,
    keyboardInputs,
  };
}
