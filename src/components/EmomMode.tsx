import { useMemo, useState } from 'react';
import { TimerLayout } from './TimerLayout';
import { TimerDisplay } from './TimerDisplay';
import { Controls } from './Controls';
import { NumberInput } from './NumberInput';
import { DurationInput } from './DurationInput';
import { FavoriteButton } from './FavoriteButton';
import { useTimer, buildEmomSegments } from '../hooks/useTimer';
import { loadSetting, saveSetting } from '../utils/storage';
import { useT } from '../hooks/useI18n';
import { useCameraWorkout } from '../recording/context';

interface EmomModeProps { onBack: () => void; }

export function EmomMode({ onBack }: EmomModeProps) {
  const t = useT();
  const [intervalSeconds, setIntervalSeconds] = useState(() =>
    loadSetting('emom-min', 1) * 60 + loadSetting('emom-sec', 0)
  );
  const [rounds, setRounds] = useState(() => loadSetting('emom-rounds', 10));
  const [restSec, setRestSec] = useState(() => loadSetting('emom-rest', 0));

  const segments = useMemo(() => buildEmomSegments(intervalSeconds, rounds, restSec), [intervalSeconds, rounds, restSec]);
  const { state, start, pause, reset } = useTimer({ segments });

  const handleStart = () => {
    if (intervalSeconds === 0) return;
    saveSetting('emom-min', Math.floor(intervalSeconds / 60));
    saveSetting('emom-sec', intervalSeconds % 60);
    saveSetting('emom-rounds', rounds);
    saveSetting('emom-rest', restSec);
    start();
  };
  const handleBack = () => { reset(); onBack(); };
  useCameraWorkout({ phase: state.phase, start: handleStart, reset });

  const subtitle = state.phase === 'work' || state.phase === 'rest'
    ? t('sub.roundOf', { current: state.currentRound, total: state.totalRounds })
    : state.phase === 'done'
    ? t('sub.roundsCompleted', { total: state.totalRounds }) : undefined;

  return (
    <TimerLayout title={t('mode.emom')} subtitle={subtitle} phase={state.phase} onBack={handleBack}>
      {state.phase === 'idle' ? (
        <div className="flex-1 flex items-center justify-center w-full">
          <div className="w-full flex flex-col gap-5">
            <DurationInput label={t('label.every')} seconds={intervalSeconds} onChange={setIntervalSeconds} min={0} />
            <NumberInput label={t('label.for')} value={rounds} onChange={setRounds} min={1} suffix={t('suffix.rounds')} />
            <DurationInput label={t('label.rest')} seconds={restSec} onChange={setRestSec} min={0} />
            <Controls isRunning={false} isStarted={false} isDone={false} onStart={handleStart} onPause={() => {}} onReset={() => {}} />
            <FavoriteButton mode="emom" defaultName={t('mode.emom')} getSettings={() => ({
              'emom-min': Math.floor(intervalSeconds / 60),
              'emom-sec': intervalSeconds % 60,
              'emom-rounds': rounds,
              'emom-rest': restSec,
            })} />
          </div>
        </div>
      ) : (
        <>
          <TimerDisplay time={state.timeLeft} phase={state.phase} currentRound={state.currentRound} totalRounds={state.totalRounds} onClick={state.phase !== 'done' ? pause : undefined} typeLabel={t('mode.emom')} elapsed={state.elapsed} isRunning={state.isRunning} />
          <Controls isRunning={state.isRunning} isStarted isDone={state.phase === 'done'} onStart={handleStart} onPause={pause} onReset={reset} />
        </>
      )}
    </TimerLayout>
  );
}
