import { createContext, useContext, useEffect, type RefObject } from 'react';
import type { TimerPhase } from '../types/timer';

/**
 * Live snapshot of what the active timer is showing. Published by the
 * TimerDisplay on every render and burned into the recorded video as a
 * caption below the camera image.
 */
export interface RecorderInfo {
  phase: TimerPhase;
  time: number;          // raw value shown: countdown integer or seconds left
  currentRound: number;
  totalRounds: number;
  typeLabel?: string;    // training type, e.g. "Tabata", "EMOM"
  blockLabel?: string;   // current block type (personalized mode)
  blockIndex?: number;
  blockTotal?: number;
  elapsed?: number;      // total elapsed seconds
  totalLabel?: string;   // localized "Total"
}

export type RecordingStatus = 'idle' | 'recording' | 'preview';

export type RecordingOrientation = 'portrait' | 'landscape';

export interface RecordingContextValue {
  enabled: boolean;
  status: RecordingStatus;
  error: string | null;
  supported: boolean;
  result: { url: string; mime: string; filename: string } | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  streamReady: boolean;
  orientation: RecordingOrientation;
  captionEnabled: boolean;
  facingMode: 'user' | 'environment';
  toggle: () => void;
  toggleOrientation: () => void;
  toggleCaption: () => void;
  switchCamera: () => void;
  clearResult: () => void;
  // Wired up by TimerDisplay via useRecorderFeed.
  publish: (info: RecorderInfo) => void;
  registerFeed: () => () => void;
  notifyDone: () => void;
}

export const RecordingContext = createContext<RecordingContextValue | null>(null);

export function useRecording(): RecordingContextValue {
  const ctx = useContext(RecordingContext);
  if (!ctx) throw new Error('useRecording must be used within a RecordingProvider');
  return ctx;
}

/**
 * Called by the active TimerDisplay: publishes the live training info and,
 * while mounted, keeps a recording running when the video toggle is on.
 */
export function useRecorderFeed(info: RecorderInfo) {
  const ctx = useContext(RecordingContext);
  // Publish the freshest snapshot every render (cheap ref write).
  if (ctx) ctx.publish(info);

  const phase = info.phase;
  useEffect(() => {
    if (!ctx) return;
    return ctx.registerFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ctx && phase === 'done') ctx.notifyDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
}
