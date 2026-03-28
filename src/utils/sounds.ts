const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

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
    for (let i = 0; i < count; i++) {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      const startTime = ctx.currentTime + i * (duration + 0.08);
      oscillator.start(startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      oscillator.stop(startTime + duration + 0.01);
    }
  } catch {
    // Audio not available
  }
}

export function playShortBeep(): void {
  playBeep(800, 0.15, 1);
}

export function playLongBeep(): void {
  playBeep(600, 0.5, 1);
}

export function playCountdownBeep(): void {
  playBeep(1000, 0.1, 1);
}

export function playFinishBeep(): void {
  playBeep(900, 0.3, 3);
}
