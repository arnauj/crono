const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  // iOS Safari suspends AudioContext until resumed from a user gesture
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Unlock audio on first user interaction (required by iOS Safari)
function unlockAudio() {
  getAudioContext();
  document.removeEventListener('touchstart', unlockAudio, true);
  document.removeEventListener('click', unlockAudio, true);
}
document.addEventListener('touchstart', unlockAudio, true);
document.addEventListener('click', unlockAudio, true);

function isSoundEnabled(): boolean {
  try {
    const stored = localStorage.getItem('crono-sound-enabled');
    return stored === null || JSON.parse(stored) === true;
  } catch {
    return true;
  }
}

export function playBeep(frequency: number = 800, duration: number = 0.15, count: number = 1): void {
  try {
    if (!isSoundEnabled()) return;
    const ctx = getAudioContext();

    // Dynamic compressor to maximize perceived loudness
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 10;
    compressor.ratio.value = 12;
    compressor.attack.value = 0;
    compressor.release.value = 0.1;
    compressor.connect(ctx.destination);

    for (let i = 0; i < count; i++) {
      const startTime = ctx.currentTime + i * (duration + 0.08);

      // Primary oscillator — square wave is much more audible
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(compressor);
      osc1.frequency.value = frequency;
      osc1.type = 'square';
      gain1.gain.setValueAtTime(1.0, startTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc1.start(startTime);
      osc1.stop(startTime + duration + 0.01);

      // Secondary oscillator one octave up for extra bite
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(compressor);
      osc2.frequency.value = frequency * 2;
      osc2.type = 'square';
      gain2.gain.setValueAtTime(0.5, startTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc2.start(startTime);
      osc2.stop(startTime + duration + 0.01);
    }
  } catch {
    // Audio not available
  }
}

export function playShortBeep(): void {
  playBeep(900, 0.25, 1);
}

export function playLongBeep(): void {
  playBeep(600, 0.6, 1);
}

export function playCountdownBeep(): void {
  playBeep(1100, 0.2, 1);
}

export function playFinishBeep(): void {
  playBeep(1000, 0.4, 4);
}
