/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Web Audio API Native Synthesizer for Pizza Hunter
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let engineOsc1: OscillatorNode | null = null;
let engineOsc2: OscillatorNode | null = null;
let engineGain: GainNode | null = null;
let engineFilter: BiquadFilterNode | null = null;
let isMuted = false;
let isAudioInitialized = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.35; // Comfortable default volume
      masterGain.connect(audioCtx.destination);
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function initAudio() {
  const ctx = getAudioContext();
  if (ctx && !isAudioInitialized) {
    isAudioInitialized = true;
  }
}

// Add user interaction listener to unlock audio on first click/keypress
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    initAudio();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
  window.addEventListener('touchstart', unlockAudio);
}

export function toggleMuteAudio(): boolean {
  isMuted = !isMuted;
  if (masterGain && audioCtx) {
    masterGain.gain.setValueAtTime(isMuted ? 0 : 0.35, audioCtx.currentTime);
  }
  return isMuted;
}

export function getIsMuted(): boolean {
  return isMuted;
}

// --- ENGINE SOUND SYNTHESIS ---
export function startEngineSound() {
  const ctx = getAudioContext();
  if (!ctx || !masterGain || engineOsc1 || isMuted) return;

  try {
    // Engine Oscillator 1: Sawtooth wave for motor rumble
    engineOsc1 = ctx.createOscillator();
    engineOsc1.type = 'sawtooth';
    engineOsc1.frequency.value = 55; // Base idle RPM (55 Hz)

    // Engine Oscillator 2: Sine wave for sub-bass hum
    engineOsc2 = ctx.createOscillator();
    engineOsc2.type = 'sine';
    engineOsc2.frequency.value = 110;

    // Lowpass filter to muffle harsh harmonics
    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 350;

    // Engine Gain Node
    engineGain = ctx.createGain();
    engineGain.gain.value = 0.08; // Muted idle volume

    engineOsc1.connect(engineFilter);
    engineOsc2.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(masterGain);

    engineOsc1.start();
    engineOsc2.start();
  } catch (e) {
    console.warn('Could not start engine audio:', e);
  }
}

export function updateEngineSound(speedRatio: number, isBoosting: boolean) {
  const ctx = getAudioContext();
  if (!ctx || isMuted) return;

  if (!engineOsc1) {
    startEngineSound();
  }

  if (engineOsc1 && engineOsc2 && engineFilter && engineGain) {
    const now = ctx.currentTime;
    const baseFreq = 50 + speedRatio * 130 + (isBoosting ? 90 : 0);
    const filterFreq = 300 + speedRatio * 800 + (isBoosting ? 600 : 0);
    const targetGain = 0.06 + speedRatio * 0.12 + (isBoosting ? 0.08 : 0);

    engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.08);
    engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.08);
    engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.08);
    engineGain.gain.setTargetAtTime(targetGain, now, 0.08);
  }
}

export function stopEngineSound() {
  if (engineOsc1) {
    try { engineOsc1.stop(); engineOsc1.disconnect(); } catch (e) {}
    engineOsc1 = null;
  }
  if (engineOsc2) {
    try { engineOsc2.stop(); engineOsc2.disconnect(); } catch (e) {}
    engineOsc2 = null;
  }
  if (engineGain) {
    try { engineGain.disconnect(); } catch (e) {}
    engineGain = null;
  }
}

// --- SFX: PICKUP PIZZA ---
export function playPickupSound() {
  const ctx = getAudioContext();
  if (!ctx || !masterGain || isMuted) return;

  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio
  
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = freq;
    
    const startTime = now + i * 0.035;
    gain.gain.setValueAtTime(0.15, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
    
    osc.connect(gain);
    gain.connect(masterGain!);
    
    osc.start(startTime);
    osc.stop(startTime + 0.12);
  });
}

// --- SFX: CRASH / EXPLOSION ---
export function playCrashSound() {
  const ctx = getAudioContext();
  if (!ctx || !masterGain || isMuted) return;

  stopEngineSound();

  const now = ctx.currentTime;

  // 1. Sub-bass boom
  const boomOsc = ctx.createOscillator();
  const boomGain = ctx.createGain();
  boomOsc.type = 'sine';
  boomOsc.frequency.setValueAtTime(140, now);
  boomOsc.frequency.exponentialRampToValueAtTime(30, now + 0.4);

  boomGain.gain.setValueAtTime(0.5, now);
  boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

  boomOsc.connect(boomGain);
  boomGain.connect(masterGain);
  boomOsc.start(now);
  boomOsc.stop(now + 0.45);

  // 2. Noise burst for crash impact
  const bufferSize = ctx.sampleRate * 0.35;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noiseNode = ctx.createBufferSource();
  noiseNode.buffer = buffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.setValueAtTime(1200, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(200, now + 0.35);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.4, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  noiseNode.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);

  noiseNode.start(now);
  noiseNode.stop(now + 0.35);
}

// --- SFX: SHOOT PIZZA ---
export function playShootSound() {
  const ctx = getAudioContext();
  if (!ctx || !masterGain || isMuted) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(750, now);
  osc.frequency.exponentialRampToValueAtTime(180, now + 0.1);

  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start(now);
  osc.stop(now + 0.1);
}

// --- SFX: EAT SHIELD (+8) ---
export function playShieldEatSound() {
  const ctx = getAudioContext();
  if (!ctx || !masterGain || isMuted) return;

  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sine';
  osc2.type = 'square';

  osc1.frequency.setValueAtTime(440, now);
  osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.25);

  osc2.frequency.setValueAtTime(880, now);
  osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.25);

  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(masterGain);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.3);
  osc2.stop(now + 0.3);
}

// --- SFX: TIRE SKID ---
export function playSkidSound() {
  const ctx = getAudioContext();
  if (!ctx || !masterGain || isMuted) return;

  const now = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 0.12;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1800, now);
  filter.Q.value = 3.0;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  noise.start(now);
  noise.stop(now + 0.12);
}
