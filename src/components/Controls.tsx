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
  if (!isStarted || isDone) {
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
          {isDone ? 'Restart' : 'Start'}
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
        {isRunning ? 'Pause' : 'Resume'}
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
        Reset
      </button>
    </div>
  );
}
