import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { TimerPhase } from '../types/timer';
import { formatTime } from '../utils/format';
import { t } from '../utils/i18n';
import { loadSetting, saveSetting } from '../utils/storage';
import {
  RecordingContext, type RecorderInfo, type RecordingContextValue,
  type RecordingStatus, type RecordingOrientation,
} from './context';

const PORTRAIT_DIMS = { w: 720, h: 1280 };
const LANDSCAPE_DIMS = { w: 1280, h: 720 };
const dimsFor = (o: RecordingOrientation) => (o === 'landscape' ? LANDSCAPE_DIMS : PORTRAIT_DIMS);

const deviceOrientation = (): RecordingOrientation =>
  typeof window !== 'undefined' && window.matchMedia?.('(orientation: landscape)').matches
    ? 'landscape'
    : 'portrait';

const EMPTY_INFO: RecorderInfo = { phase: 'idle', time: 0, currentRound: 0, totalRounds: 0 };

const recordingSupported = (): boolean =>
  typeof window !== 'undefined' &&
  typeof MediaRecorder !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof document.createElement('canvas').captureStream === 'function';

function pickMimeType(): string | undefined {
  const candidates = [
    'video/mp4;codecs=h264,aac',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  return candidates.find((c) => MediaRecorder.isTypeSupported(c));
}

function drawCover(
  ctx: CanvasRenderingContext2D, video: HTMLVideoElement,
  dx: number, dy: number, dw: number, dh: number,
) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;
  const scale = Math.max(dw / vw, dh / vh);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = (vw - sw) / 2;
  const sy = (vh - sh) / 2;
  ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function phaseStyle(phase: TimerPhase): { label: string; fg: string; bg: string } {
  switch (phase) {
    case 'countdown': return { label: t('timer.getReady'), fg: '#93c5fd', bg: 'rgba(59,130,246,0.18)' };
    case 'work':      return { label: t('timer.work'),     fg: '#f87171', bg: 'rgba(239,68,68,0.16)' };
    case 'rest':      return { label: t('timer.rest'),     fg: '#4ade80', bg: 'rgba(34,197,94,0.20)' };
    case 'done':      return { label: t('timer.complete'), fg: '#4ade80', bg: 'rgba(34,197,94,0.20)' };
    default:          return { label: '', fg: '#fff', bg: 'rgba(255,255,255,0.1)' };
  }
}

export function RecordingProvider({ children }: { children: ReactNode }) {
  const supported = recordingSupported();
  const [enabled, setEnabled] = useState<boolean>(() => supported && loadSetting('recording-enabled', false));
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecordingContextValue['result']>(null);
  const [streamReady, setStreamReady] = useState(false);
  // Camera-driven workout flow.
  const [armed, setArmed] = useState(false);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const workoutStartedRef = useRef(workoutStarted);
  workoutStartedRef.current = workoutStarted;
  const startWorkoutRef = useRef<(() => void) | null>(null);
  const resetWorkoutRef = useRef<(() => void) | null>(null);
  const [orientation, setOrientation] = useState<RecordingOrientation>(deviceOrientation);
  const orientationRef = useRef(orientation);
  orientationRef.current = orientation;
  const [captionEnabled, setCaptionEnabled] = useState<boolean>(() => loadSetting('recording-caption', true));
  const captionRef = useRef(captionEnabled);
  captionRef.current = captionEnabled;
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const facingModeRef = useRef(facingMode);
  facingModeRef.current = facingMode;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Create the compositing canvas eagerly so the preview can mount it right away.
  if (canvasRef.current === null && typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    const d = dimsFor(orientationRef.current);
    c.width = d.w;
    c.height = d.h;
    canvasRef.current = c;
  }
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const infoRef = useRef<RecorderInfo>(EMPTY_INFO);

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const statusRef = useRef<RecordingStatus>(status);
  statusRef.current = status;
  const recordingRef = useRef(false);
  const startingRef = useRef(false);
  const doneTimerRef = useRef<number | null>(null);

  // ── Camera ──
  const attachStream = useCallback(() => {
    const v = videoRef.current;
    const s = cameraStreamRef.current;
    if (v && s && v.srcObject !== s) {
      v.srcObject = s;
      v.play().catch(() => {});
    }
  }, []);

  const acquireCamera = useCallback(async (): Promise<MediaStream | null> => {
    if (cameraStreamRef.current) return cameraStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingModeRef.current }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      cameraStreamRef.current = stream;
      setStreamReady(true);
      setError(null);
      attachStream();
      return stream;
    } catch {
      setError(t('record.error'));
      setEnabled(false);
      return null;
    }
  }, [attachStream]);

  const releaseCamera = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach((tr) => tr.stop());
    cameraStreamRef.current = null;
    setStreamReady(false);
  }, []);

  // Flip between the front (user) and back (environment) camera. The canvas
  // keeps compositing from the <video> element, so the live preview and the
  // recording follow the new camera seamlessly; we also swap the audio track
  // into the active recorder stream so sound keeps working mid-recording.
  const switchCamera = useCallback(async () => {
    const next = facingModeRef.current === 'user' ? 'environment' : 'user';
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: next }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
    } catch {
      setError(t('record.error'));
      return;
    }

    const old = cameraStreamRef.current;
    cameraStreamRef.current = stream;
    facingModeRef.current = next;
    setFacingMode(next);
    setError(null);

    // Keep the recorder's audio in sync with the newly selected camera.
    const recStream = recorderStreamRef.current;
    if (recStream) {
      recStream.getAudioTracks().forEach((tr) => recStream.removeTrack(tr));
      stream.getAudioTracks().forEach((tr) => recStream.addTrack(tr));
    }

    // Point the hidden <video> (canvas source) at the new stream.
    const v = videoRef.current;
    if (v) {
      v.srcObject = stream;
      v.play().catch(() => {});
    }

    // Release the previous camera now that nothing depends on it.
    old?.getTracks().forEach((tr) => tr.stop());
  }, []);

  // ── Canvas drawing ──
  const ensureCanvas = useCallback((): HTMLCanvasElement => {
    const dims = dimsFor(orientationRef.current);
    if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
    const c = canvasRef.current;
    if (c.width !== dims.w || c.height !== dims.h) { c.width = dims.w; c.height = dims.h; }
    return c;
  }, []);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const info = infoRef.current;
    // Scale relative to the short side so layout matches in both orientations.
    const s = Math.min(W, H) / 720;

    // ── Camera fills the whole frame ──
    const v = videoRef.current;
    if (v && v.videoWidth) {
      drawCover(ctx, v, 0, 0, W, H);
    } else {
      ctx.fillStyle = '#101010';
      ctx.fillRect(0, 0, W, H);
    }

    // The caption (legend) can be turned off to record a clean camera-only video.
    if (!captionRef.current) return;

    ctx.textAlign = 'center';

    // ── Countdown: big translucent number centred over the video ──
    if (info.phase === 'countdown') {
      ctx.save();
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.82;
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 40 * s;
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 ${Math.round(300 * s)}px ui-monospace, 'SF Mono', 'JetBrains Mono', monospace`;
      ctx.fillText(String(info.time), W / 2, H / 2);
      ctx.restore();
    }

    // The caption below is drawn for every active phase (countdown too).
    if (info.phase === 'idle') return;

    // ── Compact info layer pinned to the bottom (1–2 centred lines) ──
    const { label, fg } = phaseStyle(info.phase);

    const parts1: string[] = [];
    if (info.phase === 'countdown') {
      parts1.push(label.toUpperCase(), String(info.time));
    } else if (info.phase === 'done') {
      parts1.push(label.toUpperCase());
      if (info.elapsed != null) parts1.push(formatTime(info.elapsed));
    } else {
      parts1.push(label.toUpperCase(), formatTime(info.time));
      if (info.totalRounds > 1) parts1.push(`${t('timer.round')} ${info.currentRound}/${info.totalRounds}`);
    }
    const line1 = parts1.join('   ·   ');

    const parts2: string[] = [];
    let typeText = info.typeLabel ?? '';
    if (info.blockLabel && info.blockTotal && info.blockTotal > 0) {
      typeText = `${info.blockLabel} ${(info.blockIndex ?? 0) + 1}/${info.blockTotal}`;
    }
    if (typeText) parts2.push(typeText.toUpperCase());
    if (info.elapsed != null && (info.phase === 'work' || info.phase === 'rest')) {
      parts2.push(`${(info.totalLabel ?? 'Total').toUpperCase()} ${formatTime(info.elapsed)}`);
    }
    const line2 = parts2.join('   ·   ');

    const padX = Math.round(42 * s);
    const padY = Math.round(22 * s);
    const gap = Math.round(12 * s);

    ctx.textBaseline = 'alphabetic';
    let f1 = Math.round(46 * s);
    let f2 = Math.round(30 * s);
    const measure = () => {
      ctx.font = `800 ${f1}px system-ui, sans-serif`;
      const a = ctx.measureText(line1).width;
      ctx.font = `600 ${f2}px system-ui, sans-serif`;
      const b = line2 ? ctx.measureText(line2).width : 0;
      return { w1: a, w2: b };
    };
    let { w1, w2 } = measure();

    // Shrink the text (keeping both lines in proportion) so it never runs off
    // screen — long captions in custom mode would otherwise overflow.
    const maxTextW = W - 32 * s - padX * 2;
    const widest = Math.max(w1, w2);
    if (widest > maxTextW) {
      const k = maxTextW / widest;
      f1 = Math.max(1, Math.floor(f1 * k));
      f2 = Math.max(1, Math.floor(f2 * k));
      ({ w1, w2 } = measure());
    }

    const barW = Math.min(W - 32 * s, Math.max(w1, w2) + padX * 2);
    const barH = padY * 2 + f1 + (line2 ? gap + f2 : 0);
    const barX = (W - barW) / 2;
    const barY = H - barH - 30 * s;

    // Translucent backdrop — sits on top of the video like a higher layer.
    ctx.save();
    roundRect(ctx, barX, barY, barW, barH, 26 * s);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 24 * s;
    ctx.fill();
    ctx.restore();
    roundRect(ctx, barX, barY, barW, barH, 26 * s);
    ctx.lineWidth = Math.max(1, 2 * s);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.stroke();

    let y = barY + padY + f1 * 0.82;
    ctx.font = `800 ${f1}px system-ui, sans-serif`;
    ctx.fillStyle = info.phase === 'done' ? '#4ade80' : fg;
    ctx.fillText(line1, W / 2, y);

    if (line2) {
      y += gap + f2 * 0.9;
      ctx.font = `600 ${f2}px system-ui, sans-serif`;
      ctx.fillStyle = '#d1d5db';
      ctx.fillText(line2, W / 2, y);
    }
  }, []);

  const startDrawLoop = useCallback(() => {
    if (rafRef.current != null) return; // already running
    let last = 0;
    const render = (ts: number) => {
      rafRef.current = requestAnimationFrame(render);
      if (ts - last < 33) return; // ~30 fps
      last = ts;
      drawFrame();
    };
    rafRef.current = requestAnimationFrame(render);
  }, [drawFrame]);

  const stopDrawLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // ── Recording lifecycle ──
  // Begin the actual MediaRecorder. Triggered manually by the round record
  // button in the camera (the workout itself is started separately).
  const startRecordingManual = useCallback(async () => {
    if (recordingRef.current || startingRef.current) return;
    if (statusRef.current === 'preview') return;
    if (!enabledRef.current) return;
    startingRef.current = true;
    try {
      const camera = await acquireCamera();
      if (!camera || !enabledRef.current) return;

      const canvas = ensureCanvas();
      drawFrame();
      startDrawLoop(); // no-op if the preview loop is already running
      const stream = canvas.captureStream(30);
      camera.getAudioTracks().forEach((track) => stream.addTrack(track));
      recorderStreamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType
        ? { mimeType, videoBitsPerSecond: 4_500_000 }
        : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const type = (mimeType ?? 'video/webm').split(';')[0];
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        const ext = type.includes('mp4') ? 'mp4' : 'webm';
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        const url = URL.createObjectURL(blob);
        setResult({ url, mime: type, filename: `crono-${stamp}.${ext}` });
        setStatus('preview');
      };
      recorderRef.current = recorder;
      recordingRef.current = true;
      recorder.start();
      setStatus('recording');
    } finally {
      startingRef.current = false;
    }
  }, [acquireCamera, ensureCanvas, drawFrame, startDrawLoop]);

  const stopRecording = useCallback(() => {
    if (doneTimerRef.current != null) { clearTimeout(doneTimerRef.current); doneTimerRef.current = null; }
    if (!recordingRef.current) return;
    recordingRef.current = false;
    // Keep the draw loop running so the live preview continues.
    try { recorderRef.current?.stop(); } catch { /* ignore */ }
    recorderRef.current = null;
    recorderStreamRef.current = null;
  }, []);

  const publish = useCallback((info: RecorderInfo) => { infoRef.current = info; }, []);

  // When the workout completes, linger briefly on the "Complete" screen, then save.
  const notifyDone = useCallback(() => {
    if (!recordingRef.current || doneTimerRef.current != null) return;
    doneTimerRef.current = window.setTimeout(() => {
      doneTimerRef.current = null;
      setArmed(false);
      setWorkoutStarted(false);
      stopRecording();
    }, 1600);
  }, [stopRecording]);

  // ── Camera-driven workout controls ──
  const registerWorkoutControls = useCallback((start: () => void, reset: () => void) => {
    startWorkoutRef.current = start;
    resetWorkoutRef.current = reset;
  }, []);

  // "Cargar entreno" — load the workout and reveal the camera record button.
  const arm = useCallback(() => {
    if (!enabledRef.current) return;
    setError(null);
    setArmed(true);
  }, []);

  const disarm = useCallback(() => setArmed(false), []);

  // Round red button → start recording (the workout is still idle).
  const startWorkout = useCallback(() => {
    setWorkoutStarted(true);
    startWorkoutRef.current?.();
  }, []);

  // "Detener" → reset the timer, stop & save the recording.
  const stopWorkout = useCallback(() => {
    setWorkoutStarted(false);
    setArmed(false);
    stopRecording();
    resetWorkoutRef.current?.();
  }, [stopRecording]);

  // Leaving the mode (back navigation) — drop everything, saving if recording.
  const cancelCameraWorkout = useCallback(() => {
    setArmed(false);
    setWorkoutStarted(false);
    if (recordingRef.current) stopRecording();
  }, [stopRecording]);

  // Keep the recorder honest if the workout is reset from the main controls
  // while we're recording (e.g. the on-screen Reset button): stop & save.
  const syncPhase = useCallback((phase: TimerPhase) => {
    if (recordingRef.current && workoutStartedRef.current && phase === 'idle') {
      setArmed(false);
      setWorkoutStarted(false);
      stopRecording();
    }
  }, [stopRecording]);

  const toggle = useCallback(() => {
    setError(null);
    setEnabled((prev) => {
      const next = !prev;
      saveSetting('recording-enabled', next);
      return next;
    });
  }, []);

  const toggleOrientation = useCallback(() => {
    setOrientation((o) => (o === 'portrait' ? 'landscape' : 'portrait'));
  }, []);

  const toggleCaption = useCallback(() => {
    setCaptionEnabled((prev) => {
      const next = !prev;
      saveSetting('recording-caption', next);
      return next;
    });
  }, []);

  const clearResult = useCallback(() => {
    setResult((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setStatus('idle');
  }, []);

  // Acquire / release the camera as the toggle changes. Turning the camera off
  // ends the workout in progress (stopping & saving any active recording).
  useEffect(() => {
    if (enabled) {
      acquireCamera();
    } else {
      setArmed(false);
      setWorkoutStarted(false);
      stopRecording();
      resetWorkoutRef.current?.();
      releaseCamera();
    }
  }, [enabled, acquireCamera, releaseCamera, stopRecording]);

  // Keep the preview element bound to the stream once both exist.
  useEffect(() => { attachStream(); }, [attachStream, streamReady]);

  // Run the compositing loop the whole time the camera is on, so the live
  // preview shows the same overlay (countdown + info) that gets recorded.
  useEffect(() => {
    if (streamReady) {
      ensureCanvas();
      startDrawLoop();
    } else {
      stopDrawLoop();
    }
    return () => stopDrawLoop();
  }, [streamReady, ensureCanvas, startDrawLoop, stopDrawLoop]);

  // Follow the device orientation (also overridable via the rotate button).
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(orientation: landscape)');
    const handler = () => setOrientation(mq.matches ? 'landscape' : 'portrait');
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  // Resize the (possibly live) recording canvas when the orientation changes.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dims = dimsFor(orientation);
    if (c.width !== dims.w || c.height !== dims.h) { c.width = dims.w; c.height = dims.h; }
  }, [orientation]);

  // Cleanup on unmount.
  useEffect(() => () => {
    stopRecording();
    releaseCamera();
    if (result) URL.revokeObjectURL(result.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: RecordingContextValue = {
    enabled, status, error, supported, result, videoRef, canvasRef, streamReady, orientation,
    captionEnabled, facingMode, armed, workoutStarted,
    toggle, toggleOrientation, toggleCaption, switchCamera, clearResult,
    arm, disarm, startRecordingManual, startWorkout, stopWorkout,
    publish, notifyDone, registerWorkoutControls, syncPhase, cancelCameraWorkout,
  };

  return <RecordingContext.Provider value={value}>{children}</RecordingContext.Provider>;
}
