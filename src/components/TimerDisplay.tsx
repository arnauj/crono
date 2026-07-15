import { useEffect, useState } from 'react';
import type { TimerPhase } from '../types/timer';
import { formatTime, formatTimeCs } from '../utils/format';
import { loadSetting } from '../utils/storage';
import { useT } from '../hooks/useI18n';
import { useRecorderFeed } from '../recording/context';

interface TimerDisplayProps {
  time: number;
  phase: TimerPhase;
  currentRound?: number;
  totalRounds?: number;
  onClick?: () => void;
  blockLabel?: string;
  blockIndex?: number;
  blockTotal?: number;
  typeLabel?: string;
  elapsed?: number;
  /** Whether the work phase counts up (ForTime). Rest phases always count down. */
  countUp?: boolean;
  /** Live running state, so the centiseconds clock freezes while paused. */
  isRunning?: boolean;
}

/**
 * Renders the live MM:SS(.cc) clock. When centiseconds are enabled it drives its
 * own requestAnimationFrame loop and interpolates the hundredths from the wall
 * clock — anchored to each whole-second update from the timer, so it never
 * drifts away from the authoritative integer time. Isolated in its own component
 * so the per-frame re-renders don't ripple through the rest of the display.
 */
function TimerClock({ time, isRunning, countUp, showCentiseconds, className, maxRem, lineHeight = 1 }: {
  time: number;
  isRunning: boolean;
  countUp: boolean;
  showCentiseconds: boolean;
  className: string;
  /** Desktop cap, in rem. The on-screen size is the smaller of this and a
   *  width-aware vw value so the digits can never run off a narrow screen. */
  maxRem: number;
  lineHeight?: number;
}) {
  const [csText, setCsText] = useState(() => formatTimeCs(time));

  useEffect(() => {
    if (!showCentiseconds) return;
    // Anchor the interpolation to the commit of this whole-second value, then
    // interpolate the hundredths from the wall clock on each animation frame.
    // Re-anchoring every second keeps the centiseconds locked to the timer.
    const anchor = performance.now();
    let raf = 0;
    const render = () => {
      const since = isRunning ? Math.min((performance.now() - anchor) / 1000, 0.99) : 0;
      const value = countUp ? time + since : Math.max(time - since, 0);
      setCsText(formatTimeCs(value));
      if (isRunning) raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [time, isRunning, countUp, showCentiseconds]);

  const text = showCentiseconds ? csText : formatTime(time);
  // Size the digits to the actual character count so a longer string (e.g. with
  // centiseconds, or once minutes reach 3 digits) shrinks to stay on screen.
  // The monospace digits occupy a fixed ~80vw of width regardless of length:
  // a 5-char "MM:SS" lands at 28vw (the original size); 8 chars drop to ~17.5vw.
  const fontSize = `min(${maxRem}rem, ${(140 / text.length).toFixed(2)}vw)`;
  return <time className={className} style={{ fontSize, lineHeight }}>{text}</time>;
}

export function TimerDisplay({ time, phase, currentRound, totalRounds, onClick, blockLabel, blockIndex, blockTotal, typeLabel, elapsed, countUp = false, isRunning = true }: TimerDisplayProps) {
  const t = useT();
  const [showCentiseconds] = useState(() => loadSetting('show-centiseconds', false));
  const showBlockInfo = blockLabel != null && blockTotal != null && blockTotal > 0;

  // Feed the live training info to the video recorder (when enabled).
  useRecorderFeed({
    phase,
    time,
    currentRound: currentRound ?? 0,
    totalRounds: totalRounds ?? 0,
    typeLabel,
    blockLabel,
    blockIndex,
    blockTotal,
    elapsed,
    totalLabel: t('label.total'),
  });

  const blockInfoEl = showBlockInfo && (
    <p className="mb-4 font-bold tracking-wide" style={{ fontSize: 'clamp(1.2rem, 4vw, 2.2rem)' }}>
      <span className="text-cyan-400 font-extrabold">{blockLabel}</span>
      <span className="text-gray-500 mx-2">—</span>
      <span className="text-gray-400">{t('timer.block')} </span>
      <span className="text-white font-extrabold">{(blockIndex ?? 0) + 1}</span>
      <span className="text-gray-500"> / {blockTotal}</span>
    </p>
  );

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center select-none"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? t('btn.pause') : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {/* Countdown */}
      {phase === 'countdown' && (
        <div className="flex flex-col items-center">
          {blockInfoEl}
          <p className="text-gray-500 uppercase tracking-[0.35em] font-semibold mb-6" style={{ fontSize: 'clamp(1.5rem, 5vw, 3rem)' }}>
            {t('timer.getReady')}
          </p>
          <span
            key={time}
            className="timer-digits timer-glow animate-countdown-pop text-white"
            style={{ fontSize: 'clamp(8rem, 35vw, 22rem)', lineHeight: 1 }}
          >
            {time}
          </span>
        </div>
      )}

      {/* Work / Rest */}
      {(phase === 'work' || phase === 'rest') && (
        <div className="flex flex-col items-center">
          {blockInfoEl}
          <span className={`
            inline-block px-10 py-3 rounded-full font-extrabold uppercase tracking-[0.3em]
            backdrop-blur-xl backdrop-saturate-150 border
            inset-shadow-[0_1px_0_rgba(255,255,255,0.12)]
            ${phase === 'rest'
              ? 'bg-green-500/20 border-green-300/30 text-green-300'
              : 'bg-red-500/15 border-red-300/30 text-red-300'}
          `}
            style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)' }}
          >
            {phase === 'work' ? t('timer.work') : t('timer.rest')}
          </span>

          {totalRounds != null && totalRounds > 1 && (
            <p className="mt-5 font-bold tracking-wide" style={{ fontSize: 'clamp(1.5rem, 5vw, 3rem)' }}>
              <span className="text-gray-400">{t('timer.round')} </span>
              <span className="text-white font-extrabold" style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)' }}>{currentRound}</span>
              <span className="text-gray-500"> / {totalRounds}</span>
            </p>
          )}

          <TimerClock
            time={time}
            isRunning={isRunning}
            countUp={phase === 'work' && countUp}
            showCentiseconds={showCentiseconds}
            className="timer-digits timer-glow text-white mt-3"
            maxRem={18}
          />
        </div>
      )}

      {/* Done */}
      {phase === 'done' && (
        <div className="flex flex-col items-center">
          <span className="inline-block px-10 py-3 rounded-full font-extrabold uppercase tracking-[0.3em] backdrop-blur-xl backdrop-saturate-150 border border-green-300/30 inset-shadow-[0_1px_0_rgba(255,255,255,0.12)] bg-green-500/20 text-green-300 mb-6" style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)' }}>
            {t('timer.complete')}
          </span>
          <time
            className="timer-digits text-gray-500"
            style={{ fontSize: 'clamp(4rem, 16vw, 12rem)', lineHeight: 1 }}
          >
            {formatTime(time)}
          </time>
        </div>
      )}
    </div>
  );
}
