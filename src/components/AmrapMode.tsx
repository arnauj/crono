import { useMemo, useState } from 'react';
import { TimerLayout } from './TimerLayout';
import { TimerDisplay } from './TimerDisplay';
import { Controls } from './Controls';
import { DurationInput } from './DurationInput';
import { useTimer, buildAmrapSegments } from '../hooks/useTimer';
import { loadSetting, saveSetting } from '../utils/storage';
import { useT } from '../hooks/useI18n';

interface AmrapModeProps { onBack: () => void; }

export function AmrapMode({ onBack }: AmrapModeProps) {
  const t = useT();
  const [seconds, setSeconds] = useState(() => loadSetting('amrap-seconds', loadSetting('amrap-minutes', 5) * 60));

  const segments = useMemo(() => buildAmrapSegments(seconds), [seconds]);
  const { state, start, pause, reset } = useTimer({ segments });

  const handleStart = () => { saveSetting('amrap-seconds', seconds); start(); };
  const handleBack = () => { reset(); onBack(); };

  const subtitle = state.phase === 'done' ? t('sub.minCompleted', { min: Math.round(seconds / 60) }) : undefined;

  return (
    <TimerLayout title={t('mode.amrap')} subtitle={subtitle} phase={state.phase} onBack={handleBack}>
      {state.phase === 'idle' ? (
        <div className="flex-1 flex items-center justify-center w-full">
          <div className="w-full flex flex-col gap-5">
            <DurationInput label={t('label.duration')} seconds={seconds} onChange={setSeconds} min={1} />
            <Controls isRunning={false} isStarted={false} isDone={false} onStart={handleStart} onPause={() => {}} onReset={() => {}} />
          </div>
        </div>
      ) : (
        <>
          <TimerDisplay time={state.timeLeft} phase={state.phase} onClick={state.phase !== 'done' ? pause : undefined} />
          <Controls isRunning={state.isRunning} isStarted isDone={state.phase === 'done'} onStart={handleStart} onPause={pause} onReset={reset} />
        </>
      )}
    </TimerLayout>
  );
}
