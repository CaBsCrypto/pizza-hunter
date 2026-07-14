/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/** Helper to automatically clean up and disconnect Web Audio nodes when sound ends */
function autoCleanup(duration: number, ...nodes: (OscillatorNode | GainNode | AudioBufferSourceNode | BiquadFilterNode)[]) {
  setTimeout(() => {
    nodes.forEach(node => {
      try {
        node.disconnect();
      } catch {}
    });
  }, (duration * 1000) + 100);
}

/**
 * Plays a comical squeaky sound representing collecting a pizza.
 */
export function playPizzaCollectSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(350, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(520, now);
    osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.15);

    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.25);
    osc2.stop(now + 0.25);

    autoCleanup(0.25, osc1, osc2, gainNode);
  } catch (error) {
    console.warn('Could not play collect sound:', error);
  }
}

/**
 * Plays a comical crashing/splattering sound representing hitting a table or spilling boxes.
 */
export function playCrashSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.35);

    const bufferSize = ctx.sampleRate * 0.35; 
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(50, now + 0.35);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    gainNode.gain.setValueAtTime(0.12, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    osc.start(now);
    noise.start(now);
    
    osc.stop(now + 0.35);
    noise.stop(now + 0.35);

    autoCleanup(0.35, osc, gainNode, noise, filter, noiseGain);
  } catch (error) {
    console.warn('Could not play crash sound:', error);
  }
}

/**
 * Plays a soft cardboard friction collision sound.
 */
export function playPizzaCollisionSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);

    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);

    autoCleanup(0.15, osc, gainNode);
  } catch (error) {
    console.warn('Could not play pizza collision sound:', error);
  }
}

/**
 * Plays a high-tech sci-fi arpeggio sound representing collecting a shield.
 */
export function playShieldCollectSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + i * 0.06 + 0.15);
      
      gain.gain.setValueAtTime(0.0, now + i * 0.06);
      gain.gain.linearRampToValueAtTime(0.12, now + i * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.2);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.25);

      autoCleanup(i * 0.06 + 0.25, osc, gain);
    });
  } catch (error) {
    console.warn('Could not play shield collect sound:', error);
  }
}

/**
 * Plays a futuristic energetic bubble popping chime representing a shield breaking.
 */
export function playShieldPopSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(800, now);
    osc1.frequency.exponentialRampToValueAtTime(200, now + 0.25);
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1200, now);
    osc2.frequency.exponentialRampToValueAtTime(300, now + 0.25);
    
    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc1.start(now);
    osc2.start(now);
    
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);

    autoCleanup(0.3, osc1, osc2, gainNode);
  } catch (error) {
    console.warn('Could not play shield pop sound:', error);
  }
}

/**
 * Plays a comical cartoon throwing sound representing firing a pizza projectile.
 */
export function playPizzaShootSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);

    gainNode.gain.setValueAtTime(0.12, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);

    autoCleanup(0.15, osc, gainNode);
  } catch (error) {
    console.warn('Could not play shoot sound:', error);
  }
}

/**
 * Plays a sharp, alert beep/tick sound for the final seconds of the countdown.
 */
export function playCountdownTickSound(isCritical: boolean = false) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    const freq = isCritical ? 880 : 440;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.08);

    gainNode.gain.setValueAtTime(isCritical ? 0.2 : 0.1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);

    autoCleanup(0.1, osc, gainNode);
  } catch (error) {
    console.warn('Could not play countdown tick sound:', error);
  }
}

/**
 * Plays a grand retro arcade buzzer and melody when the round ends (timer expires).
 */
export function playRoundOverSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(300, now);
    osc1.frequency.linearRampToValueAtTime(120, now + 0.5);

    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.5);

    autoCleanup(0.5, osc1, gain1);

    setTimeout(() => {
      try {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        const chimeNow = ctx.currentTime;

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(523.25, chimeNow); // C5
        osc2.frequency.setValueAtTime(659.25, chimeNow + 0.15); // E5

        gain2.gain.setValueAtTime(0.15, chimeNow);
        gain2.gain.exponentialRampToValueAtTime(0.001, chimeNow + 0.4);

        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc2.start(chimeNow);
        osc2.stop(chimeNow + 0.4);

        autoCleanup(0.4, osc2, gain2);
      } catch {}
    }, 400);

  } catch (error) {
    console.warn('Could not play round over sound:', error);
  }
}
