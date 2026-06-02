import { useT } from '../hooks/useI18n';
import { useRecording } from '../recording/context';

interface ControlsProps {
  isRunning: boolean;
  isStarted: boolean;
  isDone: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

const base = `
  rounded-2xl font-bold uppercase tracking-widest
  active:scale-[0.97] transition-all duration-150
  focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black
  shadow-lg
`;

export function Controls({ isRunning, isStarted, isDone, onStart, onPause, onReset }: ControlsProps) {
  const t = useT();
  const { enabled: cameraMode, armed, arm, cancelCameraWorkout } = useRecording();

  if (!isStarted || isDone) {
    // ── Camera mode: the main button "loads" the workout, then the round
    // button inside the camera starts recording and the workout. ──
    if (cameraMode) {
      return (
        <div className="shrink-0 w-full mt-12 md:mt-14">
          <button
            onClick={armed ? cancelCameraWorkout : arm}
            aria-pressed={armed}
            className={`${base}
              relative w-full h-18 md:h-20 text-lg md:text-xl tracking-wide leading-tight
              flex items-center justify-center gap-3 px-4
              ${armed
                ? 'bg-white/[0.06] border border-red-500/40 text-red-300 hover:bg-white/[0.1] shadow-none'
                : 'bg-gradient-to-b from-red-500 to-red-600 text-white hover:from-red-400 hover:to-red-500 focus-visible:ring-red-400 shadow-red-500/25'
              }
            `}
          >
            {armed ? (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                </span>
                {t('record.ready')}
              </>
            ) : (
              <>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M23 7l-7 5 7 5V7z" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                {t('btn.loadWorkout')}
              </>
            )}
          </button>
        </div>
      );
    }

    return (
      <div className="shrink-0 w-full mt-12 md:mt-14">
        <button
          onClick={onStart}
          className={`${base}
            w-full h-18 md:h-20 text-2xl md:text-3xl
            bg-gradient-to-b from-green-400 to-green-500
            text-black
            hover:from-green-300 hover:to-green-400
            focus-visible:ring-green-400
            shadow-green-500/25
          `}
        >
          {isDone ? t('btn.restart') : t('btn.start')}
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0 flex gap-3 md:gap-4 w-full mt-12 md:mt-14">
      <button
        onClick={onPause}
        className={`${base} flex-1 h-18 md:h-20 text-xl md:text-2xl ${
          isRunning
            ? 'bg-gradient-to-b from-yellow-300 to-yellow-400 text-black hover:from-yellow-200 hover:to-yellow-300 focus-visible:ring-yellow-400 shadow-yellow-400/20'
            : 'bg-gradient-to-b from-green-400 to-green-500 text-black hover:from-green-300 hover:to-green-400 focus-visible:ring-green-400 shadow-green-500/20'
        }`}
      >
        {isRunning ? t('btn.pause') : t('btn.resume')}
      </button>
      <button
        onClick={onReset}
        className={`${base}
          flex-1 h-18 md:h-20 text-xl md:text-2xl
          bg-gradient-to-b from-white/[0.08] to-white/[0.04]
          text-gray-300 border border-white/[0.1]
          hover:from-white/[0.12] hover:to-white/[0.08] hover:text-white
          focus-visible:ring-white/40
          shadow-none
        `}
      >
        {t('btn.reset')}
      </button>
    </div>
  );
}
