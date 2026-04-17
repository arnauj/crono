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

// Oscillators scheduled for future playback — kept so we can silence them if
// the user pauses/resets before they fire.
const scheduledGains: GainNode[] = [];
const scheduledOscs: OscillatorNode[] = [];

function scheduleBeepAt(startTime: number, frequency: number, duration: number): void {
  const ctx = getAudioContext();

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -20;
  compressor.knee.value = 10;
  compressor.ratio.value = 12;
  compressor.attack.value = 0;
  compressor.release.value = 0.1;
  compressor.connect(ctx.destination);

  const makeOsc = (freq: number, peak: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(compressor);
    osc.frequency.value = freq;
    osc.type = 'square';
    gain.gain.setValueAtTime(peak, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
    scheduledGains.push(gain);
    scheduledOscs.push(osc);
    osc.onended = () => {
      const gi = scheduledGains.indexOf(gain);
      if (gi !== -1) scheduledGains.splice(gi, 1);
      const oi = scheduledOscs.indexOf(osc);
      if (oi !== -1) scheduledOscs.splice(oi, 1);
    };
  };

  makeOsc(frequency, 1.0);
  makeOsc(frequency * 2, 0.5);
}

export function playBeep(frequency: number = 800, duration: number = 0.15, count: number = 1): void {
  try {
    if (!isSoundEnabled()) return;
    const ctx = getAudioContext();
    for (let i = 0; i < count; i++) {
      scheduleBeepAt(ctx.currentTime + i * (duration + 0.08), frequency, duration);
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

/**
 * Pre-schedule the closing "3-2-1" beeps of the lead-in countdown using the
 * Web Audio clock, so they fire at precise times even if the JS main thread
 * is throttled (common on iOS when the screen is about to sleep).
 *
 * @param countdownSeconds Total seconds of the lead-in countdown.
 */
export function scheduleCountdownCues(countdownSeconds: number): void {
  try {
    if (!isSoundEnabled()) return;
    if (countdownSeconds <= 0) return;
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const beepCount = Math.min(3, countdownSeconds);
    for (let i = 0; i < beepCount; i++) {
      const offset = countdownSeconds - (beepCount - i);
      scheduleBeepAt(now + offset, 1100, 0.2);
    }
  } catch {
    // Audio not available
  }
}

/**
 * Silence and drop any beeps we had scheduled in the future (e.g. when the
 * user pauses or resets the timer mid-countdown).
 */
export function cancelScheduledBeeps(): void {
  const ctx = audioCtx;
  if (!ctx) return;
  const now = ctx.currentTime;
  scheduledGains.forEach((gain) => {
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(0, now);
    } catch {
      // ignore
    }
  });
  scheduledOscs.forEach((osc) => {
    try {
      osc.stop(now);
    } catch {
      // already stopped
    }
  });
  scheduledGains.length = 0;
  scheduledOscs.length = 0;
}
