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
  // Camera-driven workout flow: the user "loads" the workout (armed), then the
  // round button in the camera starts recording, and a second tap starts the
  // actual workout. `workoutStarted` distinguishes the two recording phases.
  armed: boolean;
  workoutStarted: boolean;
  toggle: () => void;
  toggleOrientation: () => void;
  toggleCaption: () => void;
  switchCamera: () => void;
  clearResult: () => void;
  arm: () => void;
  disarm: () => void;
  startRecordingManual: () => void;
  startWorkout: () => void;
  stopWorkout: () => void;
  // Wired up by TimerDisplay via useRecorderFeed.
  publish: (info: RecorderInfo) => void;
  notifyDone: () => void;
  // Wired up by the active mode via useCameraWorkout.
  registerWorkoutControls: (start: () => void, reset: () => void) => void;
  syncPhase: (phase: TimerPhase) => void;
  cancelCameraWorkout: () => void;
}

export const RecordingContext = createContext<RecordingContextValue | null>(null);

export function useRecording(): RecordingContextValue {
  const ctx = useContext(RecordingContext);
  if (!ctx) throw new Error('useRecording must be used within a RecordingProvider');
  return ctx;
}

/**
 * Called by the active TimerDisplay: publishes the live training info that gets
 * burned into the recording as a caption, and triggers the save-on-complete.
 */
export function useRecorderFeed(info: RecorderInfo) {
  const ctx = useContext(RecordingContext);
  // Publish the freshest snapshot every render (cheap ref write).
  if (ctx) ctx.publish(info);

  const phase = info.phase;
  useEffect(() => {
    if (ctx && phase === 'done') ctx.notifyDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
}

/**
 * Called once by each timer mode: registers the mode's start/reset so the
 * in-camera buttons can drive the workout, and keeps the recorder in sync with
 * the timer phase (e.g. stops & saves if the workout is reset from the main UI).
 */
export function useCameraWorkout({ phase, start, reset }: {
  phase: TimerPhase;
  start: () => void;
  reset: () => void;
}) {
  const ctx = useContext(RecordingContext);
  // Keep the latest start/reset closures available to the camera controls.
  if (ctx) ctx.registerWorkoutControls(start, reset);

  useEffect(() => {
    if (ctx) ctx.syncPhase(phase);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (!ctx) return;
    // Leaving the mode (back navigation) cancels any pending camera workout.
    return () => ctx.cancelCameraWorkout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
