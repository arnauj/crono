import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { TimerPhase } from '../types/timer';
import { formatTime } from '../utils/format';
import { t } from '../utils/i18n';
import { loadSetting, saveSetting } from '../utils/storage';
import {
  RecordingContext, type RecorderInfo, type RecordingContextValue, type RecordingStatus,
} from './context';

const CANVAS_W = 720;
const CANVAS_H = 1280;
const CAMERA_FRACTION = 0.55; // top portion of the frame used for the camera

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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const infoRef = useRef<RecorderInfo>(EMPTY_INFO);

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const statusRef = useRef<RecordingStatus>(status);
  statusRef.current = status;
  const activeFeedsRef = useRef(0);
  const recordingRef = useRef(false);
  const startingRef = useRef(false);
  const stopTimerRef = useRef<number | null>(null);
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
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
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

  // ── Canvas drawing ──
  const ensureCanvas = useCallback((): HTMLCanvasElement => {
    if (!canvasRef.current) {
      const c = document.createElement('canvas');
      c.width = CANVAS_W;
      c.height = CANVAS_H;
      canvasRef.current = c;
    }
    return canvasRef.current;
  }, []);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const info = infoRef.current;
    const camH = Math.round(H * CAMERA_FRACTION);
    const capY = camH;
    const capH = H - camH;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Camera image (top)
    const v = videoRef.current;
    if (v && v.videoWidth) {
      drawCover(ctx, v, 0, 0, W, camH);
    } else {
      ctx.fillStyle = '#101010';
      ctx.fillRect(0, 0, W, camH);
    }

    // Caption panel (bottom) — colour follows the active phase, like the app.
    const capBg = info.phase === 'rest' ? '#0b3d2a'
      : info.phase === 'countdown' ? '#0c1220'
      : '#0a0a0a';
    ctx.fillStyle = capBg;
    ctx.fillRect(0, capY, W, capH);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, capY, W, 2);

    ctx.textAlign = 'center';

    // Line 1 — training type / block info
    let topText = info.typeLabel ?? '';
    if (info.blockLabel && info.blockTotal && info.blockTotal > 0) {
      topText = `${info.blockLabel} · ${t('timer.block')} ${(info.blockIndex ?? 0) + 1}/${info.blockTotal}`;
    }
    if (topText) {
      ctx.fillStyle = '#22d3ee';
      ctx.font = '700 34px system-ui, sans-serif';
      ctx.fillText(topText.toUpperCase(), W / 2, capY + 64);
    }

    // Phase badge
    const { label, fg, bg } = phaseStyle(info.phase);
    if (label) {
      ctx.font = '800 40px system-ui, sans-serif';
      const badgeH = 70;
      const padX = 44;
      const tw = ctx.measureText(label).width;
      const bw = tw + padX * 2;
      const bx = (W - bw) / 2;
      const by = capY + 96;
      roundRect(ctx, bx, by, bw, badgeH, badgeH / 2);
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.fillStyle = fg;
      ctx.textBaseline = 'middle';
      ctx.fillText(label.toUpperCase(), W / 2, by + badgeH / 2 + 2);
      ctx.textBaseline = 'alphabetic';
    }

    // Round counter
    if (info.totalRounds > 1 && (info.phase === 'work' || info.phase === 'rest')) {
      ctx.font = '700 36px system-ui, sans-serif';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(`${t('timer.round')} ${info.currentRound} / ${info.totalRounds}`, W / 2, capY + 226);
    }

    // Big timer / countdown
    const timeStr = info.phase === 'countdown' ? String(info.time) : formatTime(info.time);
    ctx.fillStyle = info.phase === 'done' ? '#6b7280' : '#ffffff';
    const big = info.phase === 'countdown' ? 168 : 132;
    ctx.font = `700 ${big}px ui-monospace, 'SF Mono', 'JetBrains Mono', monospace`;
    ctx.fillText(timeStr, W / 2, capY + capH - 74);

    // Total elapsed
    if (info.elapsed != null && (info.phase === 'work' || info.phase === 'rest')) {
      ctx.font = '600 28px system-ui, sans-serif';
      ctx.fillStyle = '#6b7280';
      ctx.fillText(`${(info.totalLabel ?? 'Total').toUpperCase()}  ${formatTime(info.elapsed)}`, W / 2, capY + capH - 28);
    }
  }, []);

  const startDrawLoop = useCallback(() => {
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
  const beginRecording = useCallback(async () => {
    if (recordingRef.current || startingRef.current) return;
    if (statusRef.current === 'preview') return;
    startingRef.current = true;
    try {
      const camera = await acquireCamera();
      if (!camera || !enabledRef.current || activeFeedsRef.current <= 0) return;

      const canvas = ensureCanvas();
      drawFrame();
      const stream = canvas.captureStream(30);
      camera.getAudioTracks().forEach((track) => stream.addTrack(track));

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
      startDrawLoop();
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
    stopDrawLoop();
    try { recorderRef.current?.stop(); } catch { /* ignore */ }
    recorderRef.current = null;
  }, [stopDrawLoop]);

  // Decide whether we should be recording based on enabled + active feeds.
  const evaluate = useCallback(() => {
    if (enabledRef.current && activeFeedsRef.current > 0 && !recordingRef.current && statusRef.current !== 'preview') {
      void beginRecording();
    } else if ((!enabledRef.current || activeFeedsRef.current <= 0) && recordingRef.current) {
      stopRecording();
    }
  }, [beginRecording, stopRecording]);

  const registerFeed = useCallback((): (() => void) => {
    activeFeedsRef.current += 1;
    if (stopTimerRef.current != null) { clearTimeout(stopTimerRef.current); stopTimerRef.current = null; }
    evaluate();
    return () => {
      activeFeedsRef.current = Math.max(0, activeFeedsRef.current - 1);
      // Debounce so a Strict-Mode remount (mount→unmount→mount) doesn't stop us.
      if (stopTimerRef.current != null) clearTimeout(stopTimerRef.current);
      stopTimerRef.current = window.setTimeout(() => {
        stopTimerRef.current = null;
        if (activeFeedsRef.current <= 0) stopRecording();
      }, 60);
    };
  }, [evaluate, stopRecording]);

  const publish = useCallback((info: RecorderInfo) => { infoRef.current = info; }, []);

  // When the workout completes, linger briefly on the "Complete" screen, then save.
  const notifyDone = useCallback(() => {
    if (!recordingRef.current || doneTimerRef.current != null) return;
    doneTimerRef.current = window.setTimeout(() => {
      doneTimerRef.current = null;
      stopRecording();
    }, 1600);
  }, [stopRecording]);

  const toggle = useCallback(() => {
    setError(null);
    setEnabled((prev) => {
      const next = !prev;
      saveSetting('recording-enabled', next);
      return next;
    });
  }, []);

  const clearResult = useCallback(() => {
    setResult((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setStatus('idle');
    // A training may already be active again — re-check.
    setTimeout(evaluate, 0);
  }, [evaluate]);

  // Acquire / release the camera as the toggle changes.
  useEffect(() => {
    if (enabled) {
      acquireCamera();
    } else {
      stopRecording();
      releaseCamera();
    }
  }, [enabled, acquireCamera, releaseCamera, stopRecording]);

  // Keep the preview element bound to the stream once both exist.
  useEffect(() => { attachStream(); }, [attachStream, streamReady]);

  // Cleanup on unmount.
  useEffect(() => () => {
    stopRecording();
    releaseCamera();
    if (result) URL.revokeObjectURL(result.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: RecordingContextValue = {
    enabled, status, error, supported, result, videoRef, streamReady,
    toggle, clearResult, publish, registerFeed, notifyDone,
  };

  return <RecordingContext.Provider value={value}>{children}</RecordingContext.Provider>;
}
