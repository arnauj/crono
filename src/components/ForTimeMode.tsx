import { useMemo, useState } from 'react';
import { TimerLayout } from './TimerLayout';
import { TimerDisplay } from './TimerDisplay';
import { Controls } from './Controls';
import { DurationInput } from './DurationInput';
import { useTimer, buildForTimeSegments } from '../hooks/useTimer';
import { loadSetting, saveSetting } from '../utils/storage';
import { useT } from '../hooks/useI18n';
import { useCameraWorkout } from '../recording/context';

interface ForTimeModeProps { onBack: () => void; }

export function ForTimeMode({ onBack }: ForTimeModeProps) {
  const t = useT();
  const [seconds, setSeconds] = useState(() => loadSetting('fortime-seconds', loadSetting('fortime-minutes', 5) * 60));

  const segments = useMemo(() => buildForTimeSegments(seconds), [seconds]);
  const { state, start, pause, reset } = useTimer({ segments, countUp: true });

  const handleStart = () => { saveSetting('fortime-seconds', seconds); start(); };
  const handleBack = () => { reset(); onBack(); };
  useCameraWorkout({ phase: state.phase, start: handleStart, reset });

  const subtitle = state.phase === 'done' ? t('sub.minCompleted', { min: Math.round(seconds / 60) }) : undefined;

  return (
    <TimerLayout title={t('mode.fortime')} subtitle={subtitle} phase={state.phase} onBack={handleBack}>
      {state.phase === 'idle' ? (
        <div className="flex-1 flex items-center justify-center w-full">
          <div className="w-full flex flex-col gap-5">
            <DurationInput label={t('label.timeCap')} seconds={seconds} onChange={setSeconds} min={1} />
            <Controls isRunning={false} isStarted={false} isDone={false} onStart={handleStart} onPause={() => {}} onReset={() => {}} />
          </div>
        </div>
      ) : (
        <>
          <TimerDisplay time={state.timeLeft} phase={state.phase} onClick={state.phase !== 'done' ? pause : undefined} typeLabel={t('mode.fortime')} />
          <Controls isRunning={state.isRunning} isStarted isDone={state.phase === 'done'} onStart={handleStart} onPause={pause} onReset={reset} />
        </>
      )}
    </TimerLayout>
  );
}
