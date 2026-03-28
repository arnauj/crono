import type { TimerPhase } from '../types/timer';
import { formatTime } from '../utils/format';

interface TimerDisplayProps {
  time: number;
  phase: TimerPhase;
  currentRound?: number;
  totalRounds?: number;
  onClick?: () => void;
  blockLabel?: string;
  blockIndex?: number;
  blockTotal?: number;
}

export function TimerDisplay({ time, phase, currentRound, totalRounds, onClick, blockLabel, blockIndex, blockTotal }: TimerDisplayProps) {
  const showBlockInfo = blockLabel != null && blockTotal != null && blockTotal > 0;
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center select-none"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? 'Toggle pause' : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {/* Countdown */}
      {phase === 'countdown' && (
        <div className="flex flex-col items-center">
          {showBlockInfo && (
            <p className="mb-4 font-bold tracking-wide" style={{ fontSize: 'clamp(1.2rem, 4vw, 2.2rem)' }}>
              <span className="text-cyan-400 font-extrabold">{blockLabel}</span>
              <span className="text-gray-500 mx-2">—</span>
              <span className="text-gray-400">Block </span>
              <span className="text-white font-extrabold">{(blockIndex ?? 0) + 1}</span>
              <span className="text-gray-500"> / {blockTotal}</span>
            </p>
          )}
          <p className="text-gray-500 uppercase tracking-[0.35em] font-semibold mb-6" style={{ fontSize: 'clamp(1.5rem, 5vw, 3rem)' }}>
            Get ready
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
          {showBlockInfo && (
            <p className="mb-4 font-bold tracking-wide" style={{ fontSize: 'clamp(1.2rem, 4vw, 2.2rem)' }}>
              <span className="text-cyan-400 font-extrabold">{blockLabel}</span>
              <span className="text-gray-500 mx-2">—</span>
              <span className="text-gray-400">Block </span>
              <span className="text-white font-extrabold">{(blockIndex ?? 0) + 1}</span>
              <span className="text-gray-500"> / {blockTotal}</span>
            </p>
          )}
          <span className={`
            inline-block px-10 py-3 rounded-full font-extrabold uppercase tracking-[0.3em]
            ${phase === 'rest' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/15 text-red-400'}
          `}
            style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)' }}
          >
            {phase === 'work' ? 'Work' : 'Rest'}
          </span>

          {totalRounds != null && totalRounds > 1 && (
            <p className="mt-5 font-bold tracking-wide" style={{ fontSize: 'clamp(1.5rem, 5vw, 3rem)' }}>
              <span className="text-gray-400">Round </span>
              <span className="text-white font-extrabold" style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)' }}>{currentRound}</span>
              <span className="text-gray-500"> / {totalRounds}</span>
            </p>
          )}

          <time
            className="timer-digits timer-glow text-white mt-3"
            style={{ fontSize: 'clamp(6rem, 28vw, 18rem)', lineHeight: 1 }}
          >
            {formatTime(time)}
          </time>
        </div>
      )}

      {/* Done */}
      {phase === 'done' && (
        <div className="flex flex-col items-center">
          <span className="inline-block px-10 py-3 rounded-full font-extrabold uppercase tracking-[0.3em] bg-green-500/20 text-green-400 mb-6" style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)' }}>
            Complete
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
