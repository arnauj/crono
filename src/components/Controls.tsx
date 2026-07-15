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
  backdrop-blur-xl backdrop-saturate-150
  border
  inset-shadow-[0_1px_0_rgba(255,255,255,0.15)]
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
                ? 'bg-white/[0.06] border-red-500/40 text-red-300 hover:bg-white/[0.1] shadow-none'
                : 'bg-red-500/25 border-red-400/40 text-red-100 hover:bg-red-500/35 hover:border-red-300/50 focus-visible:ring-red-400 shadow-red-500/20'
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
            bg-green-400/25 border-green-300/40 text-green-50
            hover:bg-green-400/35 hover:border-green-200/50
            focus-visible:ring-green-400
            shadow-green-500/20
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
            ? 'bg-yellow-300/25 border-yellow-200/40 text-yellow-50 hover:bg-yellow-300/35 hover:border-yellow-100/50 focus-visible:ring-yellow-400 shadow-yellow-400/15'
            : 'bg-green-400/25 border-green-300/40 text-green-50 hover:bg-green-400/35 hover:border-green-200/50 focus-visible:ring-green-400 shadow-green-500/20'
        }`}
      >
        {isRunning ? t('btn.pause') : t('btn.resume')}
      </button>
      <button
        onClick={onReset}
        className={`${base}
          flex-1 h-18 md:h-20 text-xl md:text-2xl
          bg-white/[0.07] border-white/[0.15]
          text-gray-200
          hover:bg-white/[0.12] hover:text-white hover:border-white/[0.25]
          focus-visible:ring-white/40
          shadow-none
        `}
      >
        {t('btn.reset')}
      </button>
    </div>
  );
}
