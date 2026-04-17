import { useCallback, useEffect, useRef, useState } from 'react';
import type { TimerState } from '../types/timer';
import {
  cancelScheduledBeeps,
  playCountdownBeep,
  playFinishBeep,
  playShortBeep,
  scheduleCountdownCues,
} from '../utils/sounds';
import { loadSetting } from '../utils/storage';

interface TimerSegment {
  phase: 'work' | 'rest';
  duration: number; // seconds
  round: number;
  totalRounds: number;
}

interface UseTimerOptions {
  segments: TimerSegment[];
  countdownSeconds?: number;
  countUp?: boolean; // for ForTime mode
  onComplete?: () => void;
}

const INITIAL_STATE: TimerState = {
  phase: 'idle',
  timeLeft: 0,
  currentRound: 0,
  totalRounds: 0,
  elapsed: 0,
  isRunning: false,
};

export function useTimer({ segments, countdownSeconds, countUp = false, onComplete }: UseTimerOptions) {
  const defaultCountdown = countdownSeconds ?? loadSetting('countdown-seconds', 10);
  const [state, setState] = useState<TimerState>(INITIAL_STATE);

  const intervalRef = useRef<number | null>(null);
  const segmentIndexRef = useRef(0);
  const timeLeftRef = useRef(0);
  const elapsedRef = useRef(0);
  const stateRef = useRef<TimerState>(INITIAL_STATE);

  // Always-fresh refs for values used inside tick
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;
  const countUpRef = useRef(countUp);
  countUpRef.current = countUp;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const countdownSecondsRef = useRef(defaultCountdown);
  countdownSecondsRef.current = defaultCountdown;

  const update = useCallback((s: TimerState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ── Core logic as a plain ref — never stale ──
  const tickRef = useRef<() => void>(() => {});

  tickRef.current = () => {
    const cur = stateRef.current;
    if (!cur.isRunning) return;

    // — Countdown phase —
    if (cur.phase === 'countdown') {
      timeLeftRef.current -= 1;
      // 3-2-1 cues are pre-scheduled via the Web Audio clock in start(), so
      // they fire on time even when iOS throttles the JS tick near sleep.
      if (timeLeftRef.current <= 0) {
        // transition to first segment
        segmentIndexRef.current = 0;
        goToSegment();
        return;
      }
      update({ ...cur, timeLeft: timeLeftRef.current });
      return;
    }

    // — Work / Rest phase —
    timeLeftRef.current -= 1;
    elapsedRef.current += 1;

    if (timeLeftRef.current <= 0) {
      segmentIndexRef.current += 1;
      goToSegment();
      return;
    }

    if (timeLeftRef.current <= 3 && timeLeftRef.current > 0) playCountdownBeep();

    const cu = countUpRef.current;
    update({
      ...cur,
      timeLeft: cu && cur.phase === 'work' ? elapsedRef.current : timeLeftRef.current,
      elapsed: elapsedRef.current,
    });
  };

  const goToSegmentRef = useRef<() => void>(() => {});

  goToSegmentRef.current = () => {
    const segs = segmentsRef.current;
    const idx = segmentIndexRef.current;

    if (idx >= segs.length) {
      playFinishBeep();
      update({
        phase: 'done',
        timeLeft: 0,
        currentRound: stateRef.current.currentRound,
        totalRounds: stateRef.current.totalRounds,
        elapsed: elapsedRef.current,
        isRunning: false,
        segmentIndex: idx,
      });
      clearTimer();
      onCompleteRef.current?.();
      return;
    }

    const seg = segs[idx];
    const cu = countUpRef.current;
    timeLeftRef.current = seg.duration;
    playShortBeep();

    update({
      phase: seg.phase,
      timeLeft: cu && seg.phase === 'work' ? 0 : seg.duration,
      currentRound: seg.round,
      totalRounds: seg.totalRounds,
      elapsed: elapsedRef.current,
      isRunning: true,
      segmentIndex: idx,
    });
  };

  // Stable wrappers that delegate to refs
  function goToSegment() { goToSegmentRef.current(); }

  const startInterval = useCallback(() => {
    intervalRef.current = window.setInterval(() => tickRef.current(), 1000);
  }, []);

  const start = useCallback(() => {
    clearTimer();
    cancelScheduledBeeps();
    segmentIndexRef.current = 0;
    elapsedRef.current = 0;

    const cd = countdownSecondsRef.current;
    timeLeftRef.current = cd;

    const segs = segmentsRef.current;
    const totalRounds = segs.length > 0 ? segs[segs.length - 1].totalRounds : 0;

    // Schedule the final 3-2-1 beeps ahead of time using the audio clock,
    // so iOS can't drop them if it throttles the JS tick.
    scheduleCountdownCues(cd);

    update({
      phase: 'countdown',
      timeLeft: cd,
      currentRound: 0,
      totalRounds,
      elapsed: 0,
      isRunning: true,
      segmentIndex: -1,
    });

    startInterval();
  }, [clearTimer, update, startInterval]);

  const pause = useCallback(() => {
    const cur = stateRef.current;
    if (cur.isRunning) {
      clearTimer();
      if (cur.phase === 'countdown') cancelScheduledBeeps();
      update({ ...cur, isRunning: false });
    } else if (cur.phase !== 'idle' && cur.phase !== 'done') {
      // Resuming from a paused countdown: reschedule the remaining 3-2-1 cues.
      if (cur.phase === 'countdown') scheduleCountdownCues(timeLeftRef.current);
      update({ ...cur, isRunning: true });
      startInterval();
    }
  }, [clearTimer, update, startInterval]);

  const reset = useCallback(() => {
    clearTimer();
    cancelScheduledBeeps();
    segmentIndexRef.current = 0;
    elapsedRef.current = 0;
    timeLeftRef.current = 0;
    update(INITIAL_STATE);
  }, [clearTimer, update]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return { state, start, pause, reset };
}

export function buildTabataSegments(rounds: number, workSec: number, restSec: number): TimerSegment[] {
  const segments: TimerSegment[] = [];
  for (let i = 1; i <= rounds; i++) {
    segments.push({ phase: 'work', duration: workSec, round: i, totalRounds: rounds });
    if (restSec > 0) {
      segments.push({ phase: 'rest', duration: restSec, round: i, totalRounds: rounds });
    }
  }
  return segments;
}

export function buildForTimeSegments(minutes: number): TimerSegment[] {
  return [{ phase: 'work', duration: minutes * 60, round: 1, totalRounds: 1 }];
}

export function buildEmomSegments(intervalMin: number, intervalSec: number, rounds: number, restSec: number): TimerSegment[] {
  const segments: TimerSegment[] = [];
  const workDuration = intervalMin * 60 + intervalSec;
  for (let i = 1; i <= rounds; i++) {
    segments.push({ phase: 'work', duration: workDuration, round: i, totalRounds: rounds });
    if (restSec > 0) {
      segments.push({ phase: 'rest', duration: restSec, round: i, totalRounds: rounds });
    }
  }
  return segments;
}

export function buildAmrapSegments(minutes: number): TimerSegment[] {
  return [{ phase: 'work', duration: minutes * 60, round: 1, totalRounds: 1 }];
}

export function buildRestSegments(minutes: number, seconds: number): TimerSegment[] {
  const duration = minutes * 60 + seconds;
  if (duration <= 0) return [];
  return [{ phase: 'rest', duration, round: 1, totalRounds: 1 }];
}
